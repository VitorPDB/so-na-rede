import { type SkillEvent, type Skill, resultOf } from "./model";
import {
  assessed,
  difficultyLabels,
  executionLabels,
  playerEvents,
} from "./assessment";
import { criteriaFields, effectiveDifficulty } from "./criteria";

export function analysisParticipations(
  events: SkillEvent[],
  playerId?: string,
): SkillEvent[] {
  if (playerId)
    return playerEvents(events, playerId).filter((e) => e.skill !== "opponent");
  return events.flatMap((e) =>
    e.skill === "opponent"
      ? []
      : e.participants
        ? e.participants.flatMap((p) => playerEvents([e], p.playerId))
        : [e],
  );
}
function valueFor(e: SkillEvent, key: string): string | undefined {
  const a = e.assessment;
  if (key === "difficulty")
    return !a
      ? undefined
      : a.version >= 3
        ? effectiveDifficulty(e)
        : a.tags.includes("save_extreme")
          ? "emergency"
          : a.tags.includes("save_hard") && a.difficulty !== "emergency"
            ? "hard"
            : a.difficulty;
  if (key === "execution") {
    if (a?.execution) return a.execution;
    if (a?.responsibility === "none") return "unrated";
    if (a?.responsibility === "partial") return "neutral";
    if (a?.responsibility === "wrong") return "poor";
    const r = resultOf(e);
    if (e.result === "simple_gafe") return "poor";
    if (r.error) return "error";
    if (r.winner === "ours") return "point";
    if (e.result === "simple_good") return "good";
    return undefined;
  }
  const field = criteriaFields.find((f) => f.key === key);
  if (a?.criteria && field) {
    const value = a.criteria[field.key];
    if (value) return value;
  }
  if (key === "passQuality") {
    if (e.result === "simple_A") return "A";
    if (e.result === "simple_B") return "B";
    if (e.result === "simple_C") return "C";
    if (a?.version === 4)
      return e.result === "simple_good"
        ? "B"
        : e.result === "simple_gafe"
          ? "C"
          : resultOf(e).error
            ? "error"
            : undefined;
  }
  if (key === "origin") {
    if (a?.tags.includes("attack_pipe")) return "pipe";
    if (a?.tags.includes("attack_back_one")) return "back1";
    if (a?.tags.includes("attack_front")) return "front";
  }
  if (key === "group" && a)
    return a.group === "double" || a.group === "triple"
      ? a.group
      : a.group
        ? undefined
        : "single";
  return undefined;
}
export const analysisFields = [
  {
    key: "difficulty",
    label: "Dificuldade do lance",
    skills: [
      "serve",
      "reception",
      "defense",
      "set",
      "attack",
      "block",
    ] as Skill[],
    options: difficultyLabels,
  },
  {
    key: "execution",
    label: "Qualidade entregue",
    skills: ["serve", "set", "attack"] as Skill[],
    options: executionLabels,
  },
  ...criteriaFields,
  {
    key: "origin",
    label: "Origem do ataque",
    skills: ["attack"] as Skill[],
    options: {
      front: "Rede",
      pipe: "Fundo · pipe Z6",
      back1: "Fundo · saída Z1",
    },
  },
  {
    key: "group",
    label: "Tipo de bloqueio",
    skills: ["block"] as Skill[],
    options: { single: "Simples", double: "Duplo", triple: "Triplo" },
  },
];
export function criterionDistribution(events: SkillEvent[], key: string) {
  const field = analysisFields.find((f) => f.key === key)!;
  const applicable = events.filter((e) => field.skills.includes(e.skill));
  const known = applicable.filter((e) => {
    const v = valueFor(e, key);
    return v !== undefined && Object.hasOwn(field.options, v);
  });
  const rows = Object.entries(field.options).map(([id, label]) => {
    const observations = known.filter((e) => valueFor(e, key) === id);
    const rated = observations.map(assessed).filter((a) => a.rated);
    return {
      id,
      label,
      count: observations.length,
      percent: known.length ? (100 * observations.length) / known.length : 0,
      rating: rated.length
        ? (10 * rated.reduce((n, a) => n + a.quality, 0)) / rated.length
        : null,
      rated: rated.length,
    };
  });
  const max = Math.max(0, ...rows.map((r) => r.count));
  return {
    key,
    label: field.label,
    total: applicable.length,
    known: known.length,
    missing: applicable.length - known.length,
    coverage: applicable.length ? (100 * known.length) / applicable.length : 0,
    rows,
    leaders: max ? rows.filter((r) => r.count === max) : [],
  };
}
