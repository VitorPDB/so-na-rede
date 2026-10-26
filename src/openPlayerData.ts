import type { PublicSnapshot, PublicMedia } from "./publicSnapshot";
import { validPublicSnapshot, validPublicMedia } from "./publicValidation";
import { validVideoMoments, type VideoMoment } from "./videoMoments";
import { validSocialCardData, type SocialCardData } from "./socialCardData";
export type OpenGame = {
  snapshot: PublicSnapshot;
  media: PublicMedia;
  moments: VideoMoment[];
  cards: SocialCardData[];
};
export function parseOpenGames(value: unknown): OpenGame[] {
  if (!Array.isArray(value)) throw Error("Resposta inválida do servidor.");
  return value.map((g) => {
    if (!validPublicSnapshot(g.snapshot) || !validVideoMoments(g.moments))
      throw Error(
        "Publicação incompatível. Peça à comissão para republicar o jogo.",
      );
    return {
      snapshot: g.snapshot,
      media: validPublicMedia(g.media)
        ? g.media
        : { photos: {}, opponentLogo: null },
      moments: g.moments,
      cards: Array.isArray(g.cards) ? g.cards.filter(validSocialCardData) : [],
    };
  });
}
export function playerRecap(games: OpenGame[], id: string) {
  const rows = games.flatMap((g) => {
    const p = g.snapshot.players.find((p) => p.id === id);
    return p && p.stats.count ? [{ game: g, stats: p.stats }] : [];
  });
  const rated = rows.filter((r) => r.stats.rating !== null);
  const metrics = new Map<
    string,
    PublicSnapshot["teamStats"]["metrics"][number]
  >();
  for (const { stats } of rows)
    for (const m of stats.metrics) {
      if (!m.count) continue;
      const old = metrics.get(m.skill);
      metrics.set(
        m.skill,
        old
          ? {
              ...m,
              count: old.count + m.count,
              successes: old.successes + m.successes,
              errors: old.errors + m.errors,
              quality:
                (old.quality * old.count + m.quality * m.count) /
                (old.count + m.count),
            }
          : { ...m },
      );
    }
  return {
    rows,
    rating: rated.length
      ? rated.reduce((sum, r) => sum + r.stats.rating!, 0) / rated.length
      : null,
    count: rows.reduce((s, r) => s + (r.stats.count ?? 0), 0),
    points: rows.reduce((s, r) => s + (r.stats.points ?? 0), 0),
    errors: rows.reduce((s, r) => s + (r.stats.errors ?? 0), 0),
    metrics: [...metrics.values()].sort((a, b) => b.quality - a.quality),
  };
}

// A finished fixture is an independent game even when its date/opponent match.
// Only the explicitly selected live game may appear as an unfinished publication.
export function visiblePlayerGames(
  games: OpenGame[],
  liveId: string | null,
): OpenGame[] {
  return [
    ...new Map(
      games
        .filter((g) => g.snapshot.finished || g.snapshot.matchId === liveId)
        .map((g) => [g.snapshot.matchId, g]),
    ).values(),
  ];
}
