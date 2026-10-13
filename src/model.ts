import type { PostGame } from "./postgame";
import type { DetailedDraft } from "./postgameDetailed";
export type Side = "ours" | "theirs";
export type Zone = 1 | 2 | 3 | 4 | 5 | 6;
export type Role = "setter" | "outside" | "middle" | "opposite" | "libero";
export const roleLabels: Record<Role, string> = {
  setter: "Levantador",
  outside: "Ponteiro",
  middle: "Central",
  opposite: "Oposto",
  libero: "Líbero",
};
export const p1Roles: Role[] = [
  "setter",
  "outside",
  "middle",
  "opposite",
  "outside",
  "middle",
];
export interface Formation {
  id: string;
  name: string;
  lineup: string[];
}
export type RoleWeights = Record<Exclude<Skill, "opponent"> | "errors", number>;
export const ratingProfiles: Record<Role, RoleWeights> = {
  setter: {
    reception: 5,
    attack: 5,
    serve: 15,
    block: 10,
    defense: 15,
    set: 40,
    errors: 10,
  },
  outside: {
    reception: 25,
    attack: 30,
    serve: 10,
    block: 10,
    defense: 10,
    set: 5,
    errors: 10,
  },
  middle: {
    reception: 5,
    attack: 30,
    serve: 15,
    block: 30,
    defense: 5,
    set: 5,
    errors: 10,
  },
  opposite: {
    reception: 5,
    attack: 40,
    serve: 15,
    block: 15,
    defense: 10,
    set: 5,
    errors: 10,
  },
  libero: {
    reception: 45,
    attack: 0,
    serve: 0,
    block: 0,
    defense: 40,
    set: 5,
    errors: 10,
  },
};
export const ratingProfilesV2: Record<Role, RoleWeights> = {
  setter: {
    serve: 15,
    reception: 5,
    set: 45,
    attack: 5,
    block: 10,
    defense: 20,
    errors: 0,
  },
  outside: {
    serve: 10,
    reception: 25,
    set: 5,
    attack: 35,
    block: 10,
    defense: 15,
    errors: 0,
  },
  opposite: {
    serve: 15,
    reception: 5,
    set: 5,
    attack: 45,
    block: 15,
    defense: 15,
    errors: 0,
  },
  middle: {
    serve: 15,
    reception: 5,
    set: 5,
    attack: 35,
    block: 35,
    defense: 5,
    errors: 0,
  },
  libero: {
    serve: 0,
    reception: 45,
    set: 10,
    attack: 0,
    block: 0,
    defense: 45,
    errors: 0,
  },
};
export const middleBackrowWeights: RoleWeights = {
  serve: 20,
  reception: 30,
  set: 10,
  attack: 5,
  block: 0,
  defense: 35,
  errors: 0,
};
export interface RatingContext {
  role: Role;
  rotationZone?: Zone;
  source?: "totals";
  coverage: "standard" | "middle-backrow" | "middle-no-pass";
  weights: RoleWeights;
}
export type Skill =
  "reception" | "serve" | "attack" | "block" | "defense" | "set" | "opponent";
export interface Player {
  id: string;
  name: string;
  number: number;
  positions: string[];
  libero: boolean;
  photo?: { dataUrl: string; x: number; y: number; zoom: number };
}
export interface PlayerGame {
  roleStats?: Partial<Record<Role, Omit<PlayerGame, "playerId" | "roleStats">>>;
  playerId: string;
  rating: number | null;
  count: number;
  points: number;
  errors: number;
  metrics: {
    skill: Skill;
    count: number;
    quality: number;
    successes: number;
    errors: number;
    label: string;
  }[];
}
export interface ArchivedGame {
  videos?: MatchVideo[];
  publicData?: import("./publicSnapshot").PublicSnapshot;
  postGame?: PostGame;
  postGameRevisions?: PostGame[];
  id: string;
  date: string;
  opponent: string;
  finished: boolean;
  sets: [number, number];
  players: PlayerGame[];
}
export interface Result {
  id: string;
  label: string;
  quality: number;
  winner?: Side;
  error?: boolean;
  reception?: 0 | 1 | 2 | 3;
}
export interface SkillEvent {
  assessment?: {
    version: 1 | 2 | 3 | 4;
    criteria?: AssessmentCriteria;
    difficultySource?: "manual" | "context";
    rallyContext?: "auto";
    setTypeSource?: "rally";
    setDifficultyVersion?: 1;
    difficulty: "easy" | "normal" | "hard" | "emergency";
    tags: string[];
    group?: "combination" | "double" | "triple";
    responsibility?: "correct" | "partial" | "wrong" | "none";
    execution?:
      "error" | "poor" | "neutral" | "good" | "excellent" | "point" | "unrated";
  };
  ratingContext?: RatingContext;
  participants?: {
    playerId: string;
    responsibility: "correct" | "partial" | "wrong" | "none";
    role?: Role;
    skill?: Exclude<Skill, "opponent">;
    difficulty?: "easy" | "normal" | "hard" | "emergency";
    ratingContext?: RatingContext;
    criteria?: AssessmentCriteria;
  }[];
  playerId?: string;
  skill: Skill;
  result: string;
  zone?: Zone;
  touch?: 1 | 2 | 3;
  videoTimestampMs?: number;
  winner?: Side;
}
export interface AssessmentCriteria {
  blockQuality?:
    | "error"
    | "perfect"
    | "effective"
    | "simple"
    | "direction"
    | "used"
    | "late"
    | "absent"
    | "gap"
    | "unrated";
  passQuality?: "A" | "B" | "C" | "error";
  technique?: "touch" | "bump" | "one-hand" | "emergency";
  incomingBall?: "strong" | "long" | "tip" | "free" | "deflection";
  receivedServe?: "underhand" | "float" | "jump";
  serveType?: "underhand" | "float" | "jump" | "targeted";
  gameMoment?: "normal" | "decisive" | "after-timeout" | "error-streak";
  incomingSet?:
    "A" | "B" | "C" | "good" | "poor" | "low" | "short" | "high_bad" | "error";
  setType?:
    | "chute"
    | "meter"
    | "stretched"
    | "high"
    | "half"
    | "quick"
    | "china"
    | "first"
    | "second"
    | "third"
    | "head"
    | "setter_tip";
  attackBlockers?: "none" | "single" | "double" | "triple";
  attackType?: "power" | "tip" | "placed" | "tool" | "quick";
  approach?: "good" | "adjusted" | "poor";
  incomingPass?: "A" | "B" | "C";
  setDirection?: "front" | "back" | "middle" | "backrow";
}
export type Command =
  | { type: "restartSet" }
  | { type: "event"; event: SkillEvent }
  | { type: "point"; winner: Side }
  | { type: "timeout"; side: Side }
  | { type: "sub"; outgoing: string; incoming: string }
  | { type: "libero"; playerId?: string; replaced?: string }
  | { type: "autoLibero"; enabled: boolean }
  | { type: "nextSet"; lineup: string[]; server: Side; roles?: Role[] }
  | { type: "setup"; lineup: string[]; server: Side; roles?: Role[] };
export interface Context {
  set: number;
  rally: number;
  rotation: number;
  serving: Side;
}
export interface AuditEntry {
  id: string;
  createdAt: string;
  command?: Command;
  context?: Context;
  kind: "action" | "undo" | "correction";
  target?: string;
  reason?: string;
}
export interface Weights {
  reception: number;
  attack: number;
  serve: number;
  block: number;
  support: number;
  errors: number;
}
export interface Match {
  videos?: MatchVideo[];
  middleCoverage?: "auto" | "defense-only" | "standard";
  middleBackrowWeights?: RoleWeights;
  postGameVersions?: {
    savedAt: string;
    initialLineup: string[];
    initialRoles?: Role[];
    initialServer: Side;
    initialAutoLibero?: boolean;
    bestOf: 3 | 5;
    opponent: string;
    audit: AuditEntry[];
    weights: Weights;
    ratingProfiles?: Record<Role, RoleWeights>;
  }[];
  postGameDraft?: PostGame;
  detailedDraft?: DetailedDraft;
  opponentTeams?: { id: string; name: string; logo?: string }[];
  defenseMap?: Record<Role, 1 | 5 | 6>;
  schemaVersion: 1;
  id: string;
  team: string;
  opponent: string;
  bestOf: 3 | 5;
  players: Player[];
  initialLineup: string[];
  initialRoles?: Role[];
  formations?: Formation[];
  ratingProfiles?: Record<Role, RoleWeights>;
  history?: ArchivedGame[];
  initialServer: Side;
  initialAutoLibero?: boolean;
  audit: AuditEntry[];
  weights: Weights;
}
export interface MatchVideo {
  id: string;
  title: string;
  youtubeId: string;
  startSeconds: number;
  kind: "live" | "replay" | "highlights";
  set?: number;
}
export interface RecordedEvent extends SkillEvent, Context {
  role?: Role;
  id: string;
  createdAt: string;
  scoreBefore: [number, number];
}
export interface SetSummary {
  set: number;
  score: [number, number];
  winner: Side;
}
export interface RallySummary {
  id: string;
  createdAt: string;
  set: number;
  rally: number;
  winner: Side;
  serving: Side;
  p: Zone | null;
  lineup: string[];
  roles: Role[];
  score: [number, number];
  events: RecordedEvent[];
}
export interface MatchMarker {
  id: string;
  createdAt: string;
  set: number;
  rally: number;
  score: [number, number];
  command: Extract<Command, { type: "timeout" | "sub" }>;
}
export interface Projection {
  rallies: RallySummary[];
  markers: MatchMarker[];
  set: number;
  rally: number;
  score: [number, number];
  sets: [number, number];
  server: Side;
  rotation: number;
  lineup: string[];
  roles: Role[];
  libero?: { playerId: string; replaced: string };
  autoLibero: boolean;
  completed: SetSummary[];
  setFinished: boolean;
  finished: boolean;
  events: RecordedEvent[];
  active: AuditEntry[];
  substitutions: number;
  subPairs: Record<string, string>;
  returned: string[];
  lastLiberoRally?: number;
}
export const defaultWeights: Weights = {
  reception: 25,
  attack: 25,
  serve: 15,
  block: 15,
  support: 10,
  errors: 10,
};
export const skills: Record<
  Skill,
  { label: string; short: string; results: Result[] }
> = {
  reception: {
    label: "Recepção",
    short: "REC",
    results: [
      {
        id: "E",
        label: "E · Erro (0)",
        quality: 0,
        reception: 0,
        winner: "theirs",
        error: true,
      },
      { id: "-", label: "− · Negativa (1)", quality: 1 / 3, reception: 1 },
      { id: "!", label: "! · Neutra (2)", quality: 2 / 3, reception: 2 },
      { id: "+", label: "+ · Boa (3)", quality: 1, reception: 3 },
      { id: "#", label: "# · Perfeita (3)", quality: 1, reception: 3 },
    ],
  },
  serve: {
    label: "Saque",
    short: "SAQ",
    results: [
      { id: "ace", label: "Ace", quality: 1, winner: "ours" },
      { id: "error", label: "Erro", quality: 0, winner: "theirs", error: true },
      { id: "good", label: "Bom", quality: 0.8 },
      { id: "neutral", label: "Neutro", quality: 0.5 },
      { id: "easy", label: "Fácil", quality: 0.2 },
    ],
  },
  attack: {
    label: "Ataque / corte",
    short: "ATQ",
    results: [
      { id: "kill", label: "Ponto", quality: 1, winner: "ours" },
      {
        id: "error",
        label: "Errado",
        quality: 0,
        winner: "theirs",
        error: true,
      },
      { id: "in", label: "Certo · em jogo", quality: 0.5 },
    ],
  },
  block: {
    label: "Bloqueio",
    short: "BLQ",
    results: [
      { id: "point", label: "Ponto", quality: 1, winner: "ours" },
      { id: "touch", label: "Toque efetivo", quality: 0.7 },
      { id: "error", label: "Erro", quality: 0, winner: "theirs", error: true },
    ],
  },
  defense: {
    label: "Defesa",
    short: "DEF",
    results: [
      { id: "good", label: "Boa", quality: 1 },
      { id: "neutral", label: "Neutra", quality: 0.5 },
      { id: "error", label: "Erro", quality: 0, winner: "theirs", error: true },
    ],
  },
  set: {
    label: "Levantamento",
    short: "LEV",
    results: [
      { id: "good", label: "Bom", quality: 1 },
      { id: "bad", label: "Ruim", quality: 0.25 },
      { id: "error", label: "Erro", quality: 0, winner: "theirs", error: true },
    ],
  },
  opponent: {
    label: "Erro adversário",
    short: "ADV",
    results: [
      {
        id: "error",
        label: "Erro bobo · ponto nosso",
        quality: 1,
        winner: "ours",
      },
    ],
  },
};
export const simpleSkills: Skill[] = [
  "serve",
  "reception",
  "set",
  "attack",
  "block",
];
// Separate result IDs keep the simplified observation and its point outcome
// reproducible in reports, backups and corrections without changing old events.
for (const skill of [...simpleSkills, "defense" as const]) {
  skills[skill].results.push(
    {
      id: "simple_good",
      label: "Bom",
      quality: 1,
      ...(skill === "reception" ? { reception: 3 as const } : {}),
    },
    {
      id: "simple_gafe",
      label: "Gafe · em jogo",
      quality: 0,
      error: true,
      ...(skill === "reception" ? { reception: 0 as const } : {}),
    },
    { id: "simple_ours", label: "Ponto nosso", quality: 1, winner: "ours" },
    {
      id: "simple_theirs",
      label: "Ponto deles",
      quality: 0,
      error: true,
      winner: "theirs",
    },
  );
}
export function resultOf(event: SkillEvent) {
  return skills[event.skill].results.find((r) => r.id === event.result)!;
}
for (const skill of ["reception", "defense"] as const) {
  skills[skill].results.push(
    {
      id: "simple_A",
      label: "A · perfeita para levantar",
      quality: 0.9,
      ...(skill === "reception" ? { reception: 3 as const } : {}),
    },
    {
      id: "simple_B",
      label: "B · exige ajuste",
      quality: 0.75,
      ...(skill === "reception" ? { reception: 2 as const } : {}),
    },
    {
      id: "simple_C",
      label: "C · bola ruim",
      quality: 0.3,
      ...(skill === "reception" ? { reception: 1 as const } : {}),
    },
  );
}
export function newMatch(): Match {
  const roster: [string, number, string[]][] = [
    ["Vidro", 11, ["Oposto", "Central", "Levantador"]],
    ["Akira", 2, ["Ponteiro", "Levantador"]],
    ["Leo Godoy", 7, ["Central", "Oposto"]],
    ["Leo sá", 18, ["Central", "Ponteiro"]],
    ["Vitor", 4, ["Levantador"]],
    ["Foden", 10, ["Ponteiro"]],
    ["Andrey", 22, ["Central"]],
    ["Maath", 14, ["Ponteiro"]],
    ["Pedro", 6, ["Ponteiro", "Oposto"]],
    ["Liam", 1, ["Líbero"]],
  ];
  const players = roster.map(([name, number, positions], i) => ({
    id: `p${i + 1}`,
    name,
    number,
    positions,
    libero: positions[0] === "Líbero",
  }));
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    team: "Só na Rede",
    opponent: "Visitantes",
    bestOf: 5,
    players,
    initialLineup: ["p5", "p2", "p3", "p1", "p6", "p4"],
    initialRoles: [...p1Roles],
    initialServer: "ours",
    audit: [],
    weights: { ...defaultWeights },
  };
}
