import { project, stats } from "./engine";
import { matchAnalysis } from "./analysis";
import { ratingProfiles, type Match } from "./model";
import { playerEvents } from "./assessment";
import { validVideos } from "./videos";
import { criteriaPublication, type PublicCriteriaData } from "./criteriaStats";
function technical(
  events: Parameters<typeof criteriaPublication>[0],
  match: Match,
): { technical?: PublicCriteriaData } {
  return {
    technical: criteriaPublication(
      events,
      match.players.map((p) => p.id),
    ),
  };
}

const summary = (s: ReturnType<typeof stats>) => ({
  rating: s.rating,
  count: s.count as number | null,
  points: s.points as number | null,
  errors: s.errors as number | null,
  best: s.best ? { label: s.best.label, reason: s.reason(s.best) } : null,
  worst: s.worst ? { label: s.worst.label, reason: s.reason(s.worst) } : null,
  metrics: s.list,
});

// Explicit public DTO: never publish the private match, audit, imports or settings.
export function publicSnapshot(match: Match) {
  const s = project(match),
    analysis = matchAnalysis(match);
  return {
    version: 1 as const,
    ...technical(s.events, match),
    ...(match.videos !== undefined && validVideos(match.videos)
      ? { videos: match.videos }
      : {}),
    matchId: match.id,
    playedAt: match.matchDate
      ? `${match.matchDate}T12:00:00`
      : (match.audit[0]?.createdAt ?? null),
    team: match.team,
    opponent: match.opponent,
    set: s.set,
    score: s.score,
    sets: s.sets,
    server: s.server,
    finished: s.finished,
    setFinished: s.setFinished,
    p: s.roles.indexOf("setter") + 1,
    teamStats: summary(stats(s.events, match.weights)),
    highlight: analysis.highlight?.player.id ?? null,
    attention: analysis.attention?.player.id ?? null,
    provisional: analysis.provisional,
    players: match.players.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      stats: summary(
        stats(
          playerEvents(s.events, p.id),
          match.weights,
          match.ratingProfiles ?? ratingProfiles,
        ),
      ),
      zone: s.lineup.indexOf(p.id) + 1,
    })),
    rallies: s.rallies.map((r) => ({
      set: r.set,
      rally: r.rally,
      score: r.score,
      winner: r.winner,
      p: r.p,
    })),
    rotations: analysis.rotations.map((r) => ({
      p: r.p,
      won: r.won,
      lost: r.lost,
      receiving: r.receiving,
      sideouts: r.sideouts,
    })),
    timeouts: analysis.timeouts.map((t) => ({
      set: t.marker.set,
      rally: t.marker.rally,
      score: t.marker.score,
      side:
        t.marker.command.type === "timeout" ? t.marker.command.side : "ours",
    })),
    periods: Array.from({ length: s.set }, (_, i) => {
      const set = i + 1;
      const period = matchAnalysis(match, set);
      return {
        set,
        ...technical(
          s.events.filter((e) => e.set === set),
          match,
        ),
        score: s.completed.find((p) => p.set === set)?.score ?? s.score,
        teamStats: summary(
          stats(
            s.events.filter((e) => e.set === set),
            match.weights,
          ),
        ),
        highlight: period.highlight?.player.id ?? null,
        attention: period.attention?.player.id ?? null,
        provisional: period.provisional,
        players: match.players.map((p) => ({
          id: p.id,
          stats: summary(
            stats(
              playerEvents(
                s.events.filter((e) => e.set === set),
                p.id,
              ),
              match.weights,
              match.ratingProfiles ?? ratingProfiles,
            ),
          ),
        })),
        rotations: period.rotations.map((r) => ({
          p: r.p,
          won: r.won,
          lost: r.lost,
          receiving: r.receiving,
          sideouts: r.sideouts,
        })),
      };
    }),
  };
}
export function publicMedia(match: Match) {
  return {
    photos: Object.fromEntries(
      match.players.filter((p) => p.photo).map((p) => [p.id, p.photo!]),
    ),
    opponentLogo:
      match.opponentTeams?.find(
        (t) =>
          t.name.trim().toLocaleLowerCase("pt-BR") ===
          match.opponent.trim().toLocaleLowerCase("pt-BR"),
      )?.logo ?? null,
  };
}
export type PublicSnapshot = ReturnType<typeof publicSnapshot>;
export type PublicMedia = ReturnType<typeof publicMedia>;
