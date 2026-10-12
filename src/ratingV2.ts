import {
  type Match,
  type Projection,
  type Role,
  type RoleWeights,
  type RatingContext,
  type SkillEvent,
  type Weights,
  ratingProfiles,
  ratingProfilesV2,
  middleBackrowWeights,
} from "./model";
import { assessed } from "./assessment";

export function sampleLabel(count: number) {
  return count === 0
    ? "Sem ações avaliadas"
    : count < 5
      ? "Nota provisória · amostra inicial"
      : count < 15
        ? "Amostra intermediária"
        : "Amostra ampliada";
}
export function effectiveProfiles(match: Match) {
  return Object.fromEntries(
    (Object.keys(ratingProfilesV2) as Role[]).map((role) => {
      const saved = match.ratingProfiles?.[role];
      const unchanged =
        !saved ||
        (Object.keys(ratingProfiles[role]) as (keyof RoleWeights)[]).every(
          (k) => saved[k] === ratingProfiles[role][k],
        );
      return [role, unchanged ? ratingProfilesV2[role] : saved];
    }),
  ) as Record<Role, RoleWeights>;
}
export function contextFor(
  match: Match,
  state: Projection,
  playerId: string,
): RatingContext | undefined {
  const zone = state.lineup.indexOf(playerId);
  if (zone < 0) return;
  const role: Role =
    state.libero?.playerId === playerId ? "libero" : state.roles[zone];
  const policy = match.middleCoverage ?? "auto";
  const back =
    role === "middle" && [0, 4, 5].includes(zone) && policy !== "standard";
  const weights = {
    ...(back
      ? (match.middleBackrowWeights ?? middleBackrowWeights)
      : effectiveProfiles(match)[role]),
  };
  if (back && policy === "defense-only") weights.reception = 0;
  return {
    role,
    rotationZone: (zone + 1) as RatingContext["rotationZone"],
    coverage: back
      ? policy === "defense-only"
        ? "middle-no-pass"
        : "middle-backrow"
      : "standard",
    weights,
  };
}
export function captureRatingContext(
  match: Match,
  state: Projection,
  event: SkillEvent,
): SkillEvent {
  if ((event.assessment?.version ?? 0) < 2 || event.skill === "opponent")
    return event;
  if (
    event.assessment &&
    event.assessment.version >= 3 &&
    event.skill === "serve" &&
    !event.assessment.criteria?.gameMoment
  ) {
    const target = state.set === match.bestOf ? 15 : 25;
    const afterTimeout = state.markers.some(
      (m) =>
        m.set === state.set &&
        m.rally === state.rally &&
        m.command.type === "timeout",
    );
    const decisive =
      Math.max(...state.score) >= target - 1 ||
      (Math.max(...state.score) >= target - 5 &&
        Math.abs(state.score[0] - state.score[1]) <= 2);
    event = {
      ...event,
      assessment: {
        ...event.assessment,
        criteria: {
          ...event.assessment.criteria,
          gameMoment: afterTimeout
            ? "after-timeout"
            : decisive
              ? "decisive"
              : "normal",
        },
      },
    };
  }
  return {
    ...event,
    ratingContext:
      event.ratingContext ?? contextFor(match, state, event.playerId ?? ""),
    participants: event.participants?.map((p) => ({
      ...p,
      ratingContext: p.ratingContext ?? contextFor(match, state, p.playerId),
    })),
  };
}
export function contextError(context: RatingContext | undefined) {
  if (context === undefined) return;
  if (
    !context ||
    !Object.hasOwn(ratingProfilesV2, context.role) ||
    (context.source !== undefined && context.source !== "totals") ||
    (context.source !== "totals" &&
      ![1, 2, 3, 4, 5, 6].includes(context.rotationZone!)) ||
    !["standard", "middle-backrow", "middle-no-pass"].includes(
      context.coverage,
    ) ||
    !context.weights ||
    (context.coverage !== "standard" &&
      (context.role !== "middle" ||
        (context.source !== "totals" &&
          ![1, 5, 6].includes(context.rotationZone!)))) ||
    Object.keys(ratingProfilesV2.setter).some(
      (key) =>
        !Number.isFinite(context.weights[key as keyof RoleWeights]) ||
        context.weights[key as keyof RoleWeights] < 0 ||
        context.weights[key as keyof RoleWeights] > 100,
    )
  )
    return "Contexto de avaliação inválido.";
}

// Means by skill, not sums of action points. Context periods use observed rallies,
// so extra touches inside one rally do not increase that period's influence.
export function ratingV2(
  events: (SkillEvent & { role?: Role; set?: number; rally?: number })[],
  weights: Weights,
  profiles?: Record<Role, RoleWeights>,
) {
  const rows = events.filter(
    (e) => e.skill !== "opponent" && assessed(e).rated,
  );
  const groups = new Map<string, typeof rows>();
  for (const e of rows) {
    const context = e.ratingContext;
    const key = profiles
      ? JSON.stringify([
          context?.role ?? e.role ?? "collective",
          context?.coverage ?? "standard",
          context?.weights,
        ])
      : "collective";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  let sum = 0,
    denominator = 0;
  for (const group of groups.values()) {
    const first = group[0];
    const profile = profiles
      ? (first.ratingContext?.weights ??
        (first.role
          ? (profiles[first.role] ?? ratingProfilesV2[first.role])
          : undefined))
      : undefined;
    let total = 0,
      weight = 0;
    const supportSlots = Math.max(
      1,
      ["set", "defense"].filter((skill) => group.some((e) => e.skill === skill))
        .length,
    );
    for (const skill of [
      "serve",
      "reception",
      "set",
      "attack",
      "block",
      "defense",
    ] as const) {
      const actions = group.filter((e) => e.skill === skill);
      const w =
        profile?.[skill] ??
        (skill === "set" || skill === "defense"
          ? weights.support / supportSlots
          : weights[skill]);
      if (!actions.length || w <= 0) continue;
      total +=
        (w * actions.reduce((n, e) => n + assessed(e).quality, 0)) /
        actions.length;
      weight += w;
    }
    if (!weight) continue;
    const rallies = new Set(
      group.map((e) =>
        e.set !== undefined && e.rally !== undefined
          ? `${e.set}:${e.rally}`
          : "unsequenced",
      ),
    ).size;
    sum += (total / weight) * rallies;
    denominator += rallies;
  }
  return denominator
    ? Math.max(0, Math.min(10, (10 * sum) / denominator))
    : null;
}
