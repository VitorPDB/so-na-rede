import {
  type Match,
  type ArchivedGame,
  ratingProfiles,
  skills,
  type Skill,
  type Role,
} from "./model";
import { project, stats } from "./engine";
import { playerEvents } from "./assessment";
import { publicSnapshot } from "./publicSnapshot";
import { matchHighlights } from "./matchHighlights";
import { videoMoments } from "./videoMoments";

export function gameSnapshot(match: Match): ArchivedGame {
  const state = project(match);
  return {
    partnerships: matchHighlights(state.events).partnerships,
    videoMoments: videoMoments(state.events),
    ...(match.videos !== undefined ? { videos: match.videos } : {}),
    id: match.id,
    date: match.matchDate
      ? `${match.matchDate}T12:00:00`
      : (match.audit.at(-1)?.createdAt ?? new Date().toISOString()),
    opponent: match.opponent,
    finished: state.finished,
    sets: [...state.sets],
    players: match.players.map((p) => {
      const summary = stats(
        playerEvents(state.events, p.id),
        match.weights,
        match.ratingProfiles ?? ratingProfiles,
      );
      const roleStats = Object.fromEntries(
        [
          ...new Set(
            playerEvents(state.events, p.id)
              .filter((e) => e.role)
              .map((e) => e.role!),
          ),
        ].map((role) => {
          const byRole = stats(
            playerEvents(state.events, p.id).filter((e) => e.role === role),
            match.weights,
            match.ratingProfiles ?? ratingProfiles,
          );
          return [
            role,
            {
              rating: byRole.rating,
              count: byRole.count,
              points: byRole.points,
              errors: byRole.errors,
              metrics: byRole.list,
            },
          ];
        }),
      );
      return {
        roleStats,
        playerId: p.id,
        rating: summary.rating,
        count: summary.count,
        points: summary.points,
        errors: summary.errors,
        metrics: summary.list,
      };
    }),
  };
}
export function archiveGame(match: Match) {
  const previous = (match.history ?? []).filter((g) => g.id !== match.id);
  return match.audit.length
    ? [
        ...previous,
        { ...gameSnapshot(match), publicData: publicSnapshot(match) },
      ]
    : previous;
}
export function playerCareer(match: Match, playerId: string, role?: Role) {
  const games = [
    ...(match.history ?? []).filter((g) => g.id !== match.id),
    gameSnapshot(match),
  ];
  const completed = games
    .filter((g) => g.finished)
    .map((g) => ({
      game: g,
      player: (() => {
        const p = g.players.find((p) => p.playerId === playerId);
        return role ? p?.roleStats?.[role] : p;
      })(),
    }))
    .filter((row) => row.player && row.player.count > 0);
  const rated = completed.filter((row) => row.player!.rating !== null);
  const ranked = [...rated].sort(
    (a, b) => b.player!.rating! - a.player!.rating!,
  );
  const totals = completed.reduce(
    (total, row) => ({
      count: total.count + row.player!.count,
      points: total.points + row.player!.points,
      errors: total.errors + row.player!.errors,
    }),
    { count: 0, points: 0, errors: 0 },
  );
  const fundamentals = (Object.keys(skills) as Skill[])
    .filter((s) => s !== "opponent")
    .map((skill) => {
      const values = completed
        .map((row) => row.player!.metrics.find((m) => m.skill === skill))
        .filter((m) => m && m.count > 0);
      const count = values.reduce((n, m) => n + m!.count, 0);
      return {
        skill,
        label: skills[skill].label,
        count,
        quality: count
          ? values.reduce((n, m) => n + m!.count * m!.quality, 0) / count
          : 0,
      };
    })
    .filter((m) => m.count)
    .sort((a, b) => b.quality - a.quality || b.count - a.count);
  return {
    completed,
    rated,
    totals,
    fundamentals,
    best: ranked[0],
    worst: ranked.at(-1),
    average: rated.length
      ? rated.reduce((n, row) => n + row.player!.rating!, 0) / rated.length
      : null,
    strongest: fundamentals.find((m) => m.count >= 3) ?? fundamentals[0],
  };
}
