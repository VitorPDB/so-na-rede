import { project, stats } from "./engine";
import { assessmentError, type Difficulty } from "./assessment";
import {
  ratingProfiles,
  resultOf,
  roleLabels,
  skills,
  type ArchivedGame,
  type Match,
  type Role,
  type Skill,
  type SkillEvent,
} from "./model";

export const postSkills = [
  "serve",
  "reception",
  "set",
  "attack",
  "block",
  "defense",
] as const;
export const postDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
export interface PostRow {
  playerId: string;
  role: Role;
  counts: Record<string, number>;
}
export interface PostSet {
  score: [number, number];
  opponentErrors: number;
  rows: PostRow[];
}
export interface PostGame {
  id: string;
  date: string;
  opponent: string;
  bestOf: 3 | 5;
  mode: "simple" | "advanced";
  sets: PostSet[];
}
export const countKey = (
  skill: Skill,
  result: string,
  difficulty?: Difficulty,
  tag = "",
) =>
  `${skill}:${result}${difficulty ? ":" + difficulty + (tag ? ":" + tag : "") : ""}`;
export const postResults = (skill: Skill, mode: PostGame["mode"]) =>
  skills[skill].results.filter(
    (r) => r.id.startsWith("simple_") === (mode === "simple"),
  );
export function emptyPostSet(match: Match): PostSet {
  const formation = [...project(match).active]
    .reverse()
    .find(
      (e) => e.command?.type === "setup" || e.command?.type === "nextSet",
    )?.command;
  const lineup =
    formation?.type === "setup" || formation?.type === "nextSet"
      ? formation.lineup
      : match.initialLineup;
  const roles =
    formation?.type === "setup" || formation?.type === "nextSet"
      ? formation.roles
      : match.initialRoles;
  const names: Record<string, Role> = {
    Levantador: "setter",
    Ponteiro: "outside",
    Central: "middle",
    Oposto: "opposite",
    Líbero: "libero",
  };
  return {
    score: [0, 0],
    opponentErrors: 0,
    rows: match.players.map((p) => {
      const zone = lineup.indexOf(p.id);
      return {
        playerId: p.id,
        role: p.libero
          ? "libero"
          : zone >= 0 && roles
            ? roles[zone]
            : (names[p.positions[0]] ?? "outside"),
        counts: {},
      };
    }),
  };
}
export function newPostGame(match: Match): PostGame {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    opponent: "",
    bestOf: match.bestOf,
    mode: "simple",
    sets: [emptyPostSet(match)],
  };
}
export function postGameErrors(
  game: PostGame,
  match: Match,
  final = false,
): string[] {
  const errors: string[] = [];
  if (
    !game ||
    typeof game.id !== "string" ||
    !game.id ||
    !Number.isFinite(Date.parse(game.date)) ||
    typeof game.opponent !== "string" ||
    ![3, 5].includes(game.bestOf) ||
    !["simple", "advanced"].includes(game.mode) ||
    !Array.isArray(game.sets) ||
    !game.sets.length ||
    game.sets.length > game.bestOf
  )
    return ["Dados do pós-jogo inválidos."];
  if (final && !game.opponent.trim()) errors.push("Preencha o adversário.");
  let count = 0;
  const wins = [0, 0];
  const targetWins = Math.ceil(game.bestOf / 2);
  for (const [index, set] of game.sets.entries()) {
    if (
      !set ||
      !Array.isArray(set.score) ||
      set.score.length !== 2 ||
      set.score.some((n) => !Number.isInteger(n) || n < 0 || n > 200) ||
      !Number.isInteger(set.opponentErrors) ||
      set.opponentErrors < 0 ||
      set.opponentErrors > 200 ||
      !Array.isArray(set.rows) ||
      set.rows.length > match.players.length * 5
    )
      return ["Placar ou linhas inválidos."];
    const ids = new Set<string>();
    let ours = set.opponentErrors,
      theirs = 0;
    for (const row of set.rows) {
      const id = `${row?.playerId}:${row?.role}`;
      if (
        !row ||
        !match.players.some((p) => p.id === row.playerId) ||
        !Object.hasOwn(roleLabels, row.role) ||
        ids.has(id) ||
        !row.counts ||
        typeof row.counts !== "object" ||
        Array.isArray(row.counts)
      )
        return ["Jogador/função inválido ou duplicado."];
      ids.add(id);
      for (const [key, n] of Object.entries(row.counts)) {
        const [skill, result, difficulty, tag, extra] = key.split(":");
        const definition =
          postSkills.includes(skill as (typeof postSkills)[number]) &&
          postResults(skill as Skill, game.mode).find((r) => r.id === result);
        if (
          !definition ||
          extra !== undefined ||
          (difficulty !== undefined &&
            assessmentError({
              skill: skill as Skill,
              result,
              assessment: {
                version: 1,
                difficulty: difficulty as Difficulty,
                tags: tag ? [tag] : [],
              },
            })) ||
          !Number.isInteger(n) ||
          n < 0 ||
          n > 1000
        )
          return [
            "Quantidades devem ser inteiros entre 0 e 1000, em resultados válidos.",
          ];
        count += n;
        if (definition.winner === "ours") ours += n;
        if (definition.winner === "theirs") theirs += n;
      }
    }
    if (final) {
      if (Math.max(...wins) >= targetWins)
        errors.push(`Set ${index + 1}: a partida já havia terminado.`);
      const target = index + 1 === game.bestOf ? 15 : 25;
      const max = Math.max(...set.score),
        min = Math.min(...set.score);
      if (max < target || max - min < 2 || (max > target && max - min !== 2))
        errors.push(
          `Set ${index + 1}: placar final inválido (até ${target}, diferença de 2).`,
        );
      else wins[set.score[0] > set.score[1] ? 0 : 1]++;
      if (ours > set.score[0] || theirs > set.score[1])
        errors.push(
          `Set ${index + 1}: pontos atribuídos ultrapassam o placar. Confira duplicações.`,
        );
    }
  }
  if (count > 20000) errors.push("Limite de 20.000 ações por ficha excedido.");
  if (final && Math.max(...wins) !== targetWins)
    errors.push(`Informe todos os sets até um time vencer ${targetWins}.`);
  return errors;
}
export function postEvents(game: PostGame, set = 0) {
  const events: (SkillEvent & { role: Role })[] = [];
  game.sets.forEach((s, index) => {
    if (set && index + 1 !== set) return;
    s.rows.forEach((row) =>
      Object.entries(row.counts).forEach(([key, count]) => {
        const [skill, result, difficulty, tag] = key.split(":");
        for (let i = 0; i < count; i++)
          events.push({
            playerId: row.playerId,
            role: row.role,
            skill: skill as Skill,
            result,
            assessment: difficulty
              ? {
                  version: 1,
                  difficulty: difficulty as Difficulty,
                  tags: tag ? [tag] : [],
                }
              : undefined,
          });
      }),
    );
  });
  return events;
}
export function postSummary(game: PostGame, match: Match, set = 0) {
  const events = postEvents(game, set);
  const players = match.players.map((player) => ({
    player,
    ...stats(
      events.filter((e) => e.playerId === player.id),
      match.weights,
      match.ratingProfiles ?? ratingProfiles,
    ),
  }));
  const eligible = players.filter((p) => p.count >= 3 && p.rating !== null);
  const ranked = (
    eligible.length ? eligible : players.filter((p) => p.rating !== null)
  ).sort((a, b) => b.rating! - a.rating!);
  return {
    events,
    players,
    team: stats(events, match.weights),
    highlight: ranked[0],
    attention: ranked.at(-1),
    provisional: !eligible.length,
  };
}
export function archivePostGame(game: PostGame, match: Match): ArchivedGame {
  const errors = postGameErrors(game, match, true);
  if (errors.length) throw new Error(errors.join(" "));
  const { events, players } = postSummary(game, match);
  const sets: [number, number] = [0, 0];
  game.sets.forEach((s) => sets[s.score[0] > s.score[1] ? 0 : 1]++);
  return {
    id: game.id,
    date: game.date,
    opponent: game.opponent,
    finished: true,
    sets,
    postGame: structuredClone(game),
    players: players.map((p) => ({
      playerId: p.player.id,
      rating: p.rating,
      count: p.count,
      points: p.points,
      errors: p.errors,
      metrics: p.list,
      roleStats: Object.fromEntries(
        [
          ...new Set(
            events.filter((e) => e.playerId === p.player.id).map((e) => e.role),
          ),
        ].map((role) => {
          const s = stats(
            events.filter((e) => e.playerId === p.player.id && e.role === role),
            match.weights,
            match.ratingProfiles ?? ratingProfiles,
          );
          return [
            role,
            {
              rating: s.rating,
              count: s.count,
              points: s.points,
              errors: s.errors,
              metrics: s.list,
            },
          ];
        }),
      ),
    })),
  };
}
export function postCoverage(game: PostGame, set: number) {
  const s = game.sets[set - 1];
  const events = postEvents(game, set);
  return [
    s.score[0] -
      s.opponentErrors -
      events.filter((e) => resultOf(e).winner === "ours").length,
    s.score[1] - events.filter((e) => resultOf(e).winner === "theirs").length,
  ];
}
