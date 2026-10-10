import { newMatch, type Match } from "./model";
import { append, project } from "./engine";
import { publicSnapshot } from "./publicSnapshot";
import type { PublicRow } from "./usePublicLive";

// Isolated demonstration: never reads or writes the commission's match.
export function publicDemo(): PublicRow {
  let match = { ...newMatch(), id: "public-demo", opponent: "Vôlei União" };
  for (let i = 0; i < 31; i++) {
    const state = project(match);
    const winner = i % 5 < 3 ? ("ours" as const) : ("theirs" as const);
    const zone = (i % 3) + 2;
    match = append(match, {
      type: "event",
      event: {
        skill: i % 4 === 0 ? "block" : "attack",
        result: winner === "ours" ? "simple_ours" : "simple_theirs",
        playerId: state.lineup[zone - 1],
      },
    });
    if (i === 11) match = append(match, { type: "timeout", side: "theirs" });
  }
  return {
    revision: 1,
    media_revision: 0,
    updated_at: new Date().toISOString(),
    snapshot: publicSnapshot(match),
  };
}

export function publicDemoHistory(): PublicRow[] {
  return ["Vôlei Horizonte", "Rede Sul"].map((opponent, index) => {
    let match: Match = {
      ...newMatch(),
      id: `demo-history-${index}`,
      opponent,
      bestOf: 3,
    };
    while (!project(match).finished) {
      const s = project(match);
      if (s.setFinished) {
        match = append(match, {
          type: "nextSet",
          lineup: match.initialLineup,
          roles: match.initialRoles,
          server: "ours",
        });
        continue;
      }
      const winner =
        s.score[0] < 25 && s.score[1] < 12 && (s.rally + index) % 4 === 0
          ? "theirs"
          : "ours";
      match = append(match, {
        type: "event",
        event: {
          skill: "attack",
          result: winner === "ours" ? "simple_ours" : "simple_theirs",
          playerId: s.lineup[(s.rally + index) % 6],
        },
      });
    }
    return {
      revision: index + 1,
      media_revision: 0,
      updated_at: new Date(Date.now() - (index + 1) * 86400000).toISOString(),
      snapshot: publicSnapshot(match),
    };
  });
}
