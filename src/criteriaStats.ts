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
  if (key === "special") return a?.tags.includes("magic") ? "magic" : undefined;
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
    key: "special",
    label: "Recurso especial",
    skills: ["set", "attack"] as Skill[],
    options: { magic: "Tirou da cartola" },
  },
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
export type CriteriaCube = {
  skill: Skill;
  key: string;
  total: number;
  rows: { id: string; count: number; rated: number; qualitySum: number }[];
}[];
export interface PublicCriteriaData {
  version: 1;
  team: CriteriaCube;
  players: { id: string; data: CriteriaCube }[];
}
function criteriaCube(rows: SkillEvent[]): CriteriaCube {
  return [...new Set(rows.map((e) => e.skill))].flatMap((skill) =>
    analysisFields
      .filter((f) => f.skills.includes(skill))
      .map((f) => {
        const data = criterionDistribution(
          rows.filter((e) => e.skill === skill),
          f.key,
        );
        return {
          skill,
          key: f.key,
          total: data.total,
          rows: data.rows
            .filter((r) => r.count)
            .map((r) => ({
              id: r.id,
              count: r.count,
              rated: r.rated,
              qualitySum: ((r.rating ?? 0) * r.rated) / 10,
            })),
        };
      }),
  );
}
export function criteriaPublication(
  events: SkillEvent[],
  playerIds: string[],
): PublicCriteriaData {
  return {
    version: 1,
    team: criteriaCube(analysisParticipations(events)),
    players: playerIds.map((id) => ({
      id,
      data: criteriaCube(analysisParticipations(events, id)),
    })),
  };
}
export function distributionFromCube(
  cube: CriteriaCube,
  key: string,
  skill: Skill | "all" = "all",
): ReturnType<typeof criterionDistribution> {
  const base = criterionDistribution([], key);
  const selected = cube.filter(
    (c) => c.key === key && (skill === "all" || c.skill === skill),
  );
  const total = selected.reduce((n, c) => n + c.total, 0);
  const sums = base.rows.map((r) => {
    const matching = selected.flatMap((c) =>
      c.rows.filter((row) => row.id === r.id),
    );
    const count = matching.reduce((n, v) => n + v.count, 0),
      rated = matching.reduce((n, v) => n + v.rated, 0),
      sum = matching.reduce((n, v) => n + v.qualitySum, 0);
    return { ...r, count, rated, rating: rated ? (10 * sum) / rated : null };
  });
  const known = sums.reduce((n, r) => n + r.count, 0),
    max = Math.max(0, ...sums.map((r) => r.count));
  const rows = sums.map((r) => ({
    ...r,
    percent: known ? (100 * r.count) / known : 0,
  }));
  return {
    ...base,
    total,
    known,
    missing: total - known,
    coverage: total ? (100 * known) / total : 0,
    rows,
    leaders: max ? rows.filter((r) => r.count === max) : [],
  };
}
export function validCriteriaData(value: unknown): value is PublicCriteriaData {
  const cube = (input: unknown) => {
    if (!Array.isArray(input) || input.length > analysisFields.length * 6)
      return false;
    const seen = new Set<string>();
    return input.every((c) => {
      const field = analysisFields.find(
        (f) => f.key === c?.key && f.skills.includes(c?.skill),
      );
      const key = `${c?.skill}:${c?.key}`;
      if (
        !field ||
        seen.has(key) ||
        !Number.isInteger(c.total) ||
        c.total < 0 ||
        c.total > 1_000_000 ||
        !Array.isArray(c.rows) ||
        c.rows.length > Object.keys(field.options).length
      )
        return false;
      seen.add(key);
      const ids = new Set<string>();
      return (
        c.rows.every((r: CriteriaCube[number]["rows"][number]) => {
          if (
            !r ||
            !Object.hasOwn(field.options, r.id) ||
            ids.has(r.id) ||
            !Number.isInteger(r.count) ||
            r.count <= 0 ||
            r.count > c.total ||
            !Number.isInteger(r.rated) ||
            r.rated < 0 ||
            r.rated > r.count ||
            !Number.isFinite(r.qualitySum) ||
            r.qualitySum < 0 ||
            r.qualitySum > r.rated + 1e-6
          )
            return false;
          ids.add(r.id);
          return true;
        }) &&
        c.rows.reduce(
          (n: number, r: CriteriaCube[number]["rows"][number]) => n + r.count,
          0,
        ) <= c.total
      );
    });
  };
  if (!value || typeof value !== "object") return false;
  const v = value as PublicCriteriaData;
  if (
    v.version !== 1 ||
    !cube(v.team) ||
    !Array.isArray(v.players) ||
    v.players.length > 100
  )
    return false;
  const ids = new Set<string>();
  return v.players.every(
    (p) =>
      p &&
      typeof p.id === "string" &&
      !ids.has(p.id) &&
      cube(p.data) &&
      Boolean(ids.add(p.id)),
  );
}
