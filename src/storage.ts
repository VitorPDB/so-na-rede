import { validCriteriaData } from "./criteriaStats";
import { validPartnerships } from "./matchHighlights";
import { validVideoMoments } from "./videoMoments";
import {
  type Match,
  type Command,
  type PlayerGame,
  skills,
  resultOf,
  roleLabels,
  ratingProfiles,
} from "./model";
import { activeEntries, project, validate } from "./engine";
import { postGameErrors } from "./postgame";
import { validDetailedDraft } from "./postgameDetailed";
import { assessmentError } from "./assessment";
import { mirrorMatch, recoveryCopies } from "./matchBackup";
import { validVideos } from "./videos";
const KEY = "so-na-rede:match:v1";
const BACKUP_KEY = KEY + ":backup";
export let recoveryNotice = "";
export function parseMatch(raw: string): Match {
  const data = JSON.parse(raw) as Match;
  const invalid = () => {
    throw new Error(
      "Backup ou arquivo local incompatível. Exporte a cópia antes de iniciar outro jogo.",
    );
  };
  if (!validVideos(data?.videos)) invalid();
  if (
    data?.socialHighlightPlayerId !== undefined &&
    (typeof data.socialHighlightPlayerId !== "string" ||
      !data.players?.some((p) => p.id === data.socialHighlightPlayerId))
  )
    invalid();
  if (
    data?.matchDate !== undefined &&
    (typeof data.matchDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.matchDate))
  )
    invalid();
  if (
    !data ||
    data.schemaVersion !== 1 ||
    typeof data.id !== "string" ||
    !data.id ||
    typeof data.team !== "string" ||
    typeof data.opponent !== "string" ||
    ![3, 5].includes(data.bestOf) ||
    !["ours", "theirs"].includes(data.initialServer) ||
    !Array.isArray(data.audit) ||
    !Array.isArray(data.players) ||
    data.players.length < 6 ||
    !Array.isArray(data.initialLineup) ||
    data.initialLineup.length !== 6 ||
    !data.weights
  )
    invalid();
  if (data.opponentTeams !== undefined) {
    if (!Array.isArray(data.opponentTeams)) invalid();
    const teamIds = new Set<string>(),
      teamNames = new Set<string>();
    for (const team of data.opponentTeams) {
      if (
        !team ||
        typeof team.id !== "string" ||
        !team.id ||
        teamIds.has(team.id) ||
        typeof team.name !== "string" ||
        !team.name.trim() ||
        teamNames.has(team.name.trim().toLocaleLowerCase("pt-BR")) ||
        (team.logo !== undefined &&
          (typeof team.logo !== "string" ||
            team.logo.length > 200000 ||
            !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
              team.logo,
            )))
      )
        invalid();
      teamIds.add(team.id);
      teamNames.add(team.name.trim().toLocaleLowerCase("pt-BR"));
    }
  }
  const ids = new Set<string>();
  if (
    data.initialAutoLibero !== undefined &&
    typeof data.initialAutoLibero !== "boolean"
  )
    invalid();
  if (data.defenseMap !== undefined) {
    if (
      !data.defenseMap ||
      typeof data.defenseMap !== "object" ||
      Array.isArray(data.defenseMap)
    )
      invalid();
    for (const role of Object.keys(roleLabels) as (keyof typeof roleLabels)[])
      if (![1, 5, 6].includes(data.defenseMap[role])) invalid();
  }
  const numbers = new Set<number>();
  for (const p of data.players) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !p.id ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      !Number.isInteger(p.number) ||
      p.number < 1 ||
      p.number > 99 ||
      numbers.has(p.number) ||
      typeof p.libero !== "boolean" ||
      !Array.isArray(p.positions) ||
      !p.positions.length ||
      p.positions.some((x) => typeof x !== "string" || !x.trim())
    )
      invalid();
    ids.add(p.id);
    numbers.add(p.number);
    if (
      p.photo &&
      (typeof p.photo.dataUrl !== "string" ||
        !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.photo.dataUrl) ||
        p.photo.dataUrl.length > 160000 ||
        !Number.isFinite(p.photo.x) ||
        p.photo.x < 0 ||
        p.photo.x > 100 ||
        !Number.isFinite(p.photo.y) ||
        p.photo.y < 0 ||
        p.photo.y > 100 ||
        !Number.isFinite(p.photo.zoom) ||
        p.photo.zoom < 1 ||
        p.photo.zoom > 3)
    )
      invalid();
  }
  if (data.history !== undefined) {
    if (!Array.isArray(data.history)) invalid();
    const historyIds = new Set<string>();
    for (const game of data.history) {
      if (game.fullMatch !== undefined) {
        if (
          game.fullMatch.history !== undefined ||
          game.fullMatch.id !== game.id
        )
          invalid();
        const full = parseMatch(JSON.stringify(game.fullMatch));
        if (!project(full).finished) invalid();
      }
      if (
        !game ||
        typeof game.id !== "string" ||
        historyIds.has(game.id) ||
        !Number.isFinite(Date.parse(game.date)) ||
        typeof game.opponent !== "string" ||
        typeof game.finished !== "boolean" ||
        !Array.isArray(game.sets) ||
        game.sets.length !== 2 ||
        game.sets.some((n) => !Number.isInteger(n) || n < 0 || n > 3) ||
        !Array.isArray(game.players)
      )
        invalid();
      historyIds.add(game.id);
      if (!validVideos(game.videos) || !validVideos(game.publicData?.videos))
        invalid();
      if (game.publicData !== undefined) {
        const publication = game.publicData;
        const validSummary = (s: typeof publication.teamStats) =>
          s &&
          (s.rating === null ||
            (Number.isFinite(s.rating) && s.rating >= 0 && s.rating <= 10)) &&
          [s.count, s.points, s.errors].every(
            (n) => n === null || (Number.isInteger(n) && n >= 0),
          ) &&
          Array.isArray(s.metrics) &&
          s.metrics.every(
            (m) =>
              m &&
              typeof m.label === "string" &&
              Number.isFinite(m.quality) &&
              Number.isInteger(m.count),
          ) &&
          [s.best, s.worst].every(
            (m) =>
              m === null ||
              (m &&
                typeof m.label === "string" &&
                typeof m.reason === "string"),
          );
        const validPlayers = (
          rows:
            | typeof publication.players
            | (typeof publication.periods)[number]["players"],
        ) =>
          Array.isArray(rows) &&
          rows.every(
            (p) => p && typeof p.id === "string" && validSummary(p.stats),
          );
        if (
          !publication ||
          publication.version !== 1 ||
          (publication.technical !== undefined &&
            !validCriteriaData(publication.technical)) ||
          publication.matchId !== game.id ||
          typeof publication.team !== "string" ||
          typeof publication.opponent !== "string" ||
          !validSummary(publication.teamStats) ||
          !validPlayers(publication.players) ||
          !Array.isArray(publication.periods) ||
          publication.periods.some(
            (p) =>
              !p ||
              (p.technical !== undefined && !validCriteriaData(p.technical)) ||
              !Number.isInteger(p.set) ||
              !validSummary(p.teamStats) ||
              !validPlayers(p.players),
          ) ||
          !Array.isArray(publication.rallies) ||
          publication.rallies.some(
            (r) =>
              !r ||
              !Number.isInteger(r.set) ||
              !Array.isArray(r.score) ||
              r.score.length !== 2 ||
              r.score.some((n) => !Number.isInteger(n) || n < 0),
          )
        )
          invalid();
      }
      const playerIds = new Set<string>();
      if (
        game.videoMoments !== undefined &&
        !validVideoMoments(game.videoMoments)
      )
        invalid();
      if (
        game.partnerships !== undefined &&
        !validPartnerships(game.partnerships)
      )
        invalid();
      for (const row of game.players) {
        if (
          !row ||
          typeof row.playerId !== "string" ||
          playerIds.has(row.playerId) ||
          (row.rating !== null &&
            (!Number.isFinite(row.rating) ||
              row.rating < 0 ||
              row.rating > 10)) ||
          [row.count, row.points, row.errors].some(
            (n) => !Number.isInteger(n) || n < 0,
          ) ||
          row.points > row.count ||
          row.errors > row.count ||
          !Array.isArray(row.metrics)
        )
          invalid();
        playerIds.add(row.playerId);
        const checkSummary = (
          summary: Omit<PlayerGame, "playerId" | "roleStats">,
        ) => {
          if (
            !summary ||
            (summary.rating !== null &&
              (!Number.isFinite(summary.rating) ||
                summary.rating < 0 ||
                summary.rating > 10)) ||
            [summary.count, summary.points, summary.errors].some(
              (n) => !Number.isInteger(n) || n < 0,
            ) ||
            summary.points > summary.count ||
            summary.errors > summary.count ||
            !Array.isArray(summary.metrics)
          )
            invalid();
          const metricSkills = new Set<string>();
          for (const metric of summary.metrics) {
            if (
              !metric ||
              !Object.hasOwn(skills, metric.skill) ||
              metric.skill === "opponent" ||
              metricSkills.has(metric.skill) ||
              typeof metric.label !== "string" ||
              !Number.isFinite(metric.quality) ||
              metric.quality < 0 ||
              metric.quality > 1 ||
              [metric.count, metric.successes, metric.errors].some(
                (n) => !Number.isInteger(n) || n < 0,
              ) ||
              metric.successes > metric.count ||
              metric.errors > metric.count
            )
              invalid();
            metricSkills.add(metric.skill);
          }
          if (
            summary.metrics.reduce((n, m) => n + m.count, 0) !== summary.count
          )
            invalid();
        };
        checkSummary(row);
        if (row.roleStats !== undefined) {
          if (
            !row.roleStats ||
            typeof row.roleStats !== "object" ||
            Array.isArray(row.roleStats)
          )
            invalid();
          for (const [role, summary] of Object.entries(row.roleStats)) {
            if (!Object.hasOwn(roleLabels, role)) invalid();
            checkSummary(summary!);
          }
          if (
            Object.values(row.roleStats).reduce(
              (n, summary) => n + summary!.count,
              0,
            ) > row.count
          )
            invalid();
        }
      }
    }
  }
  for (const k of [
    "reception",
    "attack",
    "serve",
    "block",
    "support",
    "errors",
  ] as const)
    if (
      !Number.isFinite(data.weights[k]) ||
      data.weights[k] < 0 ||
      data.weights[k] > 100
    )
      invalid();
  const validLineup = (lineup: string[]) =>
    Array.isArray(lineup) &&
    lineup.length === 6 &&
    new Set(lineup).size === 6 &&
    lineup.every((id) => data.players.some((p) => p.id === id && !p.libero));
  if (!validLineup(data.initialLineup)) invalid();
  const validRoles = (roles: unknown) =>
    Array.isArray(roles) &&
    roles.length === 6 &&
    roles.every(
      (r) =>
        typeof r === "string" && r !== "libero" && Object.hasOwn(roleLabels, r),
    );
  if (data.initialRoles !== undefined && !validRoles(data.initialRoles))
    invalid();
  if (data.formations !== undefined) {
    if (!Array.isArray(data.formations)) invalid();
    const formationIds = new Set<string>();
    for (const f of data.formations) {
      if (
        !f ||
        typeof f.id !== "string" ||
        !f.id ||
        formationIds.has(f.id) ||
        typeof f.name !== "string" ||
        !f.name.trim() ||
        !validLineup(f.lineup)
      )
        invalid();
      formationIds.add(f.id);
    }
  }
  if (data.ratingProfiles !== undefined) {
    for (const role of Object.keys(
      ratingProfiles,
    ) as (keyof typeof ratingProfiles)[]) {
      const profile = data.ratingProfiles[role];
      if (!profile) invalid();
      for (const key of Object.keys(
        ratingProfiles[role],
      ) as (keyof typeof profile)[]) {
        if (
          !Number.isFinite(profile[key]) ||
          profile[key] < 0 ||
          profile[key] > 100
        )
          invalid();
      }
    }
  }
  if (
    data.middleCoverage !== undefined &&
    !["auto", "defense-only", "standard"].includes(data.middleCoverage)
  )
    invalid();
  if (
    data.middleBackrowWeights !== undefined &&
    Object.keys(ratingProfiles.middle).some((k) => {
      const n =
        data.middleBackrowWeights![k as keyof typeof ratingProfiles.middle];
      return !Number.isFinite(n) || n < 0 || n > 100;
    })
  )
    invalid();
  const checkCommand = (c: Command) => {
    if (
      !c ||
      ![
        "event",
        "point",
        "timeout",
        "setup",
        "nextSet",
        "sub",
        "libero",
        "autoLibero",
        "restartSet",
      ].includes(c.type)
    )
      invalid();
    if (c.type === "timeout" && !["ours", "theirs"].includes(c.side)) invalid();
    if (c.type === "autoLibero" && typeof c.enabled !== "boolean") invalid();
    if (
      (c.type === "setup" || c.type === "nextSet") &&
      c.roles !== undefined &&
      !validRoles(c.roles)
    )
      invalid();
    if (c.type === "event") {
      const e = c.event;
      if (
        !e ||
        !skills[e.skill]?.results.some((r) => r.id === e.result) ||
        (e.skill !== "opponent" && !ids.has(e.playerId ?? "")) ||
        (e.zone !== undefined && ![1, 2, 3, 4, 5, 6].includes(e.zone)) ||
        (e.touch !== undefined && ![1, 2, 3].includes(e.touch)) ||
        (e.videoSource !== undefined &&
          (typeof e.videoSource !== "string" || e.videoSource.length > 600)) ||
        (e.videoTimestampMs !== undefined &&
          (!Number.isFinite(e.videoTimestampMs) || e.videoTimestampMs < 0)) ||
        (e.winner !== undefined && !["ours", "theirs"].includes(e.winner)) ||
        assessmentError(e) ||
        e.participants?.some((p) => !ids.has(p.playerId))
      )
        invalid();
    }
    if (c.type === "point" && !["ours", "theirs"].includes(c.winner)) invalid();
    if (
      (c.type === "setup" || c.type === "nextSet") &&
      (!validLineup(c.lineup) || !["ours", "theirs"].includes(c.server))
    )
      invalid();
    if (c.type === "sub" && (!ids.has(c.incoming) || !ids.has(c.outgoing)))
      invalid();
    if (
      c.type === "libero" &&
      c.playerId &&
      (!ids.has(c.playerId) || !ids.has(c.replaced ?? ""))
    )
      invalid();
  };
  const auditIds = new Set<string>();
  for (const entry of data.audit) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      auditIds.has(entry.id) ||
      !Number.isFinite(Date.parse(entry.createdAt)) ||
      !["action", "undo", "correction", "insertion"].includes(entry.kind)
    )
      invalid();
    if (
      entry.kind === "action" ||
      entry.kind === "correction" ||
      entry.kind === "insertion"
    )
      checkCommand(entry.command!);
    if (
      entry.kind === "insertion" &&
      (entry.command?.type !== "event" ||
        !entry.reason?.trim() ||
        entry.command.event.winner ||
        resultOf(entry.command.event).winner)
    )
      invalid();
    if (
      entry.kind !== "action" &&
      (!entry.target || !auditIds.has(entry.target))
    )
      invalid();
    if (
      entry.kind === "correction" &&
      (!entry.reason?.trim() || entry.command?.type !== "event")
    )
      invalid();
    auditIds.add(entry.id);
  }
  if (
    data.postGameDraft !== undefined &&
    postGameErrors(data.postGameDraft, data).length
  )
    invalid();
  if (
    data.detailedDraft !== undefined &&
    !validDetailedDraft(data.detailedDraft, data)
  )
    invalid();
  for (const game of data.history ?? []) {
    if (game.postGame && postGameErrors(game.postGame, data, true).length)
      invalid();
    if (
      game.postGameRevisions !== undefined &&
      (!Array.isArray(game.postGameRevisions) ||
        game.postGameRevisions.some(
          (g) => postGameErrors(g, data, true).length,
        ))
    )
      invalid();
  }
  const replay = { ...data, audit: [] as Match["audit"] };
  if (data.postGameVersions !== undefined) {
    if (!Array.isArray(data.postGameVersions)) invalid();
    for (const version of data.postGameVersions) {
      if (!version || !Number.isFinite(Date.parse(version.savedAt))) invalid();
      parseMatch(
        JSON.stringify({
          ...data,
          ...version,
          postGameVersions: undefined,
          history: undefined,
          postGameDraft: undefined,
          detailedDraft: undefined,
        }),
      );
    }
  }
  for (const entry of activeEntries(data.audit)) {
    if (validate(replay, project(replay), entry.command!)) invalid();
    replay.audit.push(entry);
  }
  return data;
}
export function loadMatch(): Match | undefined {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      return parseMatch(raw);
    } catch {
      /* Try the independent checkpoint. */
    }
  }
  const backup = localStorage.getItem(BACKUP_KEY);
  if (backup) {
    const match = parseMatch(backup);
    localStorage.setItem(KEY, backup);
    recoveryNotice = "Partida recuperada da cópia automática local.";
    return match;
  }
  if (raw) return parseMatch(raw); // Preserve the original and block edits on invalid data.
}
export async function initializeMatchStorage() {
  try {
    const match = loadMatch();
    if (match) {
      mirrorMatch(JSON.stringify(match));
      return;
    }
  } catch {
    /* IndexedDB can recover a damaged local checkpoint. */
  }
  for (const raw of await recoveryCopies()) {
    try {
      parseMatch(raw);
      localStorage.setItem(KEY, raw);
      recoveryNotice =
        "Partida recuperada do backup automático do dispositivo.";
      return;
    } catch {
      /* Never replace a damaged file with another invalid copy. */
    }
  }
}
export function saveMatch(match: Match, expected?: Match) {
  const current = localStorage.getItem(KEY);
  if (
    current &&
    expected &&
    JSON.stringify(JSON.parse(current)) !== JSON.stringify(expected)
  )
    throw new Error(
      "O jogo foi alterado em outra aba. Recarregue esta aba antes de continuar.",
    );
  const raw = JSON.stringify(match);
  localStorage.setItem(KEY, raw);
  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    /* IndexedDB remains available. */
  }
  mirrorMatch(raw);
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: (string | number | null | undefined)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");
            return (
              '"' +
              (/^[\s\u0000-\u001f]*[=+@\-]/.test(text) ? "'" : "") +
              text.replaceAll('"', '""') +
              '"'
            );
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
