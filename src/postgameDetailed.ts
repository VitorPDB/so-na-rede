import { append, assignToZone, project } from "./engine";
import { assessmentError, normalAssessment } from "./assessment";
import {
  newMatch,
  skills,
  type Command,
  type Match,
  type Role,
  type Side,
} from "./model";
import { legacyRoles } from "./formation";

export interface DetailedDraft {
  id: string;
  date: string;
  opponent: string;
  bestOf: 3 | 5;
  lineup: string[];
  roles: Role[];
  server: Side;
  rows: { id: string; command: Command }[];
}
export function newDetailedDraft(match: Match): DetailedDraft {
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
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    opponent: "",
    bestOf: match.bestOf,
    lineup: [...lineup],
    roles: [...(roles ?? legacyRoles(lineup, match.players))],
    server: match.initialServer,
    rows: [],
  };
}
export function replayDetailed(
  draft: DetailedDraft,
  source: Match,
  previous?: { draft: DetailedDraft; source: Match; match: Match },
) {
  let match: Match = {
    ...newMatch(),
    id: draft.id,
    team: source.team,
    opponent: draft.opponent,
    bestOf: draft.bestOf,
    players: source.players,
    weights: source.weights,
    ratingProfiles: source.ratingProfiles,
    initialLineup: draft.lineup,
    initialRoles: draft.roles,
    initialServer: draft.server,
    initialAutoLibero: source.initialAutoLibero,
    formations: source.formations,
    defenseMap: source.defenseMap,
    opponentTeams: source.opponentTeams,
  };
  let error = "";
  let failedRow = -1;
  let start = 0;
  if (
    previous &&
    previous.source.players === source.players &&
    previous.source.weights === source.weights &&
    previous.source.ratingProfiles === source.ratingProfiles &&
    previous.source.initialAutoLibero === source.initialAutoLibero &&
    previous.draft.id === draft.id &&
    previous.draft.date === draft.date &&
    previous.draft.opponent === draft.opponent &&
    previous.draft.bestOf === draft.bestOf &&
    previous.draft.server === draft.server &&
    JSON.stringify(previous.draft.lineup) === JSON.stringify(draft.lineup) &&
    JSON.stringify(previous.draft.roles) === JSON.stringify(draft.roles)
  ) {
    while (
      start < draft.rows.length &&
      start < previous.match.audit.length &&
      previous.draft.rows[start] === draft.rows[start]
    )
      start++;
    match.audit = previous.match.audit.slice(0, start);
  }
  for (const [offset, row] of draft.rows.slice(start).entries()) {
    const index = start + offset;
    try {
      match = append(match, row.command);
      const entry = match.audit.at(-1)!;
      // This is the entry date, not an invented in-game time or video offset.
      entry.id = row.id;
      entry.createdAt = draft.date;
    } catch (e) {
      error = `Linha ${index + 1}: ${(e as Error).message}`;
      failedRow = index;
      break;
    }
  }
  return { match, error, failedRow };
}
export function moveDetailedZone(
  draft: DetailedDraft,
  zone: number,
  playerId: string,
): DetailedDraft {
  return { ...draft, lineup: assignToZone(draft.lineup, zone, playerId) };
}
export function validDetailedDraft(
  value: unknown,
  match: Match,
): value is DetailedDraft {
  const d = value as DetailedDraft;
  if (
    !d ||
    typeof d.id !== "string" ||
    !d.id ||
    !Number.isFinite(Date.parse(d.date)) ||
    typeof d.opponent !== "string" ||
    ![3, 5].includes(d.bestOf) ||
    !["ours", "theirs"].includes(d.server) ||
    !Array.isArray(d.lineup) ||
    d.lineup.length !== 6 ||
    new Set(d.lineup).size !== 6 ||
    d.lineup.some(
      (id) => !match.players.some((p) => p.id === id && !p.libero),
    ) ||
    !Array.isArray(d.roles) ||
    d.roles.length !== 6 ||
    d.roles.some(
      (r) => !["setter", "outside", "middle", "opposite"].includes(r),
    ) ||
    !Array.isArray(d.rows) ||
    d.rows.length > 5000
  )
    return false;
  const ids = new Set<string>();
  return d.rows.every((r) => {
    if (
      !r ||
      typeof r.id !== "string" ||
      !r.id ||
      ids.has(r.id) ||
      !r.command ||
      typeof r.command !== "object"
    )
      return false;
    ids.add(r.id);
    const c = r.command,
      player = (id: unknown) =>
        typeof id === "string" && match.players.some((p) => p.id === id);
    const side = (s: unknown) => s === "ours" || s === "theirs";
    if (c.type === "event") {
      const e = c.event;
      return (
        !!e &&
        !assessmentError(e, true) &&
        (!e.participants || e.participants.every((p) => player(p.playerId))) &&
        !!skills[e.skill]?.results.some((r) => r.id === e.result) &&
        (e.skill === "opponent" ||
          player(e.playerId) ||
          (!!e.assessment?.group && e.playerId === undefined)) &&
        (e.zone === undefined || [1, 2, 3, 4, 5, 6].includes(e.zone)) &&
        (e.touch === undefined || [1, 2, 3].includes(e.touch)) &&
        (e.winner === undefined || side(e.winner)) &&
        (e.videoTimestampMs === undefined ||
          (Number.isFinite(e.videoTimestampMs) && e.videoTimestampMs >= 0))
      );
    }
    if (c.type === "point") return side(c.winner);
    if (c.type === "timeout") return side(c.side);
    if (c.type === "autoLibero") return typeof c.enabled === "boolean";
    if (c.type === "sub") return player(c.incoming) && player(c.outgoing);
    if (c.type === "libero")
      return (
        c.playerId === undefined || (player(c.playerId) && player(c.replaced))
      );
    if (c.type === "setup" || c.type === "nextSet")
      return (
        side(c.server) &&
        Array.isArray(c.lineup) &&
        c.lineup.length === 6 &&
        new Set(c.lineup).size === 6 &&
        c.lineup.every((id) =>
          match.players.some((p) => p.id === id && !p.libero),
        ) &&
        (c.roles === undefined ||
          (Array.isArray(c.roles) &&
            c.roles.length === 6 &&
            c.roles.every((r) =>
              ["setter", "outside", "middle", "opposite"].includes(r),
            )))
      );
    return c.type === "restartSet";
  });
}
