import type { PublicSnapshot } from "./publicSnapshot";

// Used on incoming public data too, including older cached publications.
export function safePublicSnapshot(snapshot: PublicSnapshot): PublicSnapshot {
  const summary = (s: PublicSnapshot["teamStats"]) => ({
    rating: s.rating,
    count: null,
    points: null,
    errors: null,
    metrics: [],
    best: s.best
      ? { label: s.best.label, reason: "Destaque do jogador" }
      : null,
    worst: s.worst
      ? { label: s.worst.label, reason: "Fundamento a desenvolver" }
      : null,
  });
  const { technical: _technical, ...rest } = snapshot;
  return {
    ...rest,
    teamStats: summary(snapshot.teamStats),
    players: snapshot.players.map((p) => ({ ...p, stats: summary(p.stats) })),
    periods: snapshot.periods.map(({ technical: _t, ...p }) => ({
      ...p,
      teamStats: summary(p.teamStats),
      players: p.players.map((v) => ({ ...v, stats: summary(v.stats) })),
    })),
  };
}
