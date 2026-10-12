import { newMatch, type Match } from "./model";
import { append, project } from "./engine";
import { publicSnapshot } from "./publicSnapshot";
import type { PublicRow } from "./usePublicLive";
import { normalAssessment } from "./assessment";

// Isolated demonstration: never reads or writes the commission's match.
export function publicDemo(): PublicRow {
  let match = { ...newMatch(), id: "public-demo", opponent: "Vôlei União" };
  for (let i = 0; i < 31; i++) {
    const state = project(match);
    const winner = i % 5 < 3 ? ("ours" as const) : ("theirs" as const);
    const zone = (i % 3) + 2;
    if (i % 3 === 0) {
      match = append(match, {
        type: "event",
        event: {
          skill: "defense",
          result: "simple_good",
          playerId: state.lineup[5],
          assessment: {
            ...normalAssessment(),
            criteria: {
              passQuality: i % 2 ? "A" : "B",
              technique: i % 2 ? "touch" : "bump",
              incomingBall: i % 2 ? "tip" : "strong",
            },
          },
        },
      });
      match = append(match, {
        type: "event",
        event: {
          skill: "set",
          result: "simple_good",
          playerId: state.lineup[state.roles.indexOf("setter")],
          assessment: {
            ...normalAssessment(),
            criteria: {
              technique: "touch",
              incomingPass: "B",
              setDirection: i % 2 ? "back" : "front",
            },
          },
        },
      });
    }
    match = append(match, {
      type: "event",
      event: {
        skill: i % 4 === 0 ? "block" : "attack",
        result: winner === "ours" ? "simple_ours" : "simple_theirs",
        playerId: state.lineup[zone - 1],
        assessment: {
          ...normalAssessment(),
          criteria:
            i % 4 === 0
              ? { blockQuality: winner === "ours" ? "perfect" : "used" }
              : {
                  attackType: i % 2 ? "power" : "tip",
                  incomingSet: i % 2 ? "A" : "B",
                  approach: "good",
                },
        },
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
          assessment: {
            ...normalAssessment(),
            criteria: {
              attackType: s.rally % 2 ? "power" : "placed",
              incomingSet: "B",
              approach: "good",
            },
          },
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
