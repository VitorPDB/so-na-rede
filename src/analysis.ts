import {
  type Match,
  type RallySummary,
  type Zone,
  ratingProfiles,
  resultOf,
} from "./model";
import { project, stats } from "./engine";
import { playerEvents, assessed } from "./assessment";

export function matchAnalysis(match: Match, set = 0) {
  const state = project(match);
  const rallies = state.rallies.filter((r) => !set || r.set === set);
  const events = state.events.filter((e) => !set || e.set === set);
  const markers = state.markers.filter((m) => !set || m.set === set);
  const players = match.players
    .map((player) => ({
      player,
      ...stats(
        playerEvents(events, player.id),
        match.weights,
        match.ratingProfiles ?? ratingProfiles,
      ),
    }))
    .filter((p) => p.rating !== null)
    .sort((a, b) => b.rating! - a.rating!);
  // Never compare a single action with a player who has a useful sample.
  const eligible = players.filter((p) => p.count >= 3);
  const candidates = eligible.length ? eligible : players;
  const rotations = ([1, 2, 3, 4, 5, 6] as Zone[]).map((p) => {
    const group = rallies.filter((r) => r.p === p);
    const receiving = group.filter((r) => r.serving === "theirs");
    const serving = group.filter((r) => r.serving === "ours");
    const won = group.filter((r) => r.winner === "ours").length;
    return {
      p,
      group,
      won,
      lost: group.length - won,
      receiving: receiving.length,
      sideouts: receiving.filter((r) => r.winner === "ours").length,
      serving: serving.length,
      serveWins: serving.filter((r) => r.winner === "ours").length,
    };
  });
  const currentSetRallies = state.rallies.filter(
    (r) => r.set === (set || state.set),
  );
  const last = currentSetRallies.at(-1);
  let streak = 0;
  for (
    let i = currentSetRallies.length - 1;
    i >= 0 && currentSetRallies[i].winner === last?.winner;
    i--
  )
    streak++;
  const recent = currentSetRallies.slice(-5);
  const recentErrors = recent
    .flatMap((r) => r.events)
    .filter((e) => assessed(e).error).length;
  const timeouts = markers
    .filter((m) => m.command.type === "timeout")
    .map((marker) => {
      const sameSet = state.rallies.filter((r) => r.set === marker.set);
      const before = sameSet.filter((r) => r.rally < marker.rally).slice(-5);
      const after = sameSet.filter((r) => r.rally >= marker.rally).slice(0, 5);
      return { marker, before, after };
    });
  return {
    state,
    rallies,
    events,
    markers,
    rotations,
    highlight: candidates[0],
    attention: candidates.at(-1),
    provisional: !eligible.length,
    streak,
    streakSide: last?.winner,
    recentErrors,
    recent,
    timeouts,
  };
}

export function wonWindow(rallies: RallySummary[]) {
  return `${rallies.filter((r) => r.winner === "ours").length}/${rallies.length}`;
}
