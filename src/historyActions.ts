import type { Match, ArchivedGame } from "./model";
export function removeArchivedMatch(match: Match, id: string): Match {
  if (id === match.id) return match;
  return {
    ...match,
    history: (match.history ?? []).filter((g) => g.id !== id),
  };
}
export function restoreArchivedMatch(match: Match, game: ArchivedGame): Match {
  if (game.id === match.id) return match;
  return {
    ...match,
    history: [
      ...(match.history ?? []).filter((g) => g.id !== game.id),
      game,
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
