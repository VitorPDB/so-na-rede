import test from "node:test";
import assert from "node:assert/strict";
import { append, correct, project, undo } from "./engine";
import { newMatch, type SkillEvent } from "./model";
import { initialAssessment } from "./actionQuality";
import { withRallyContext } from "./rallyContext";
import { effectiveDifficulty, criteriaError } from "./criteria";
import { publicSnapshot } from "./publicSnapshot";
import { validPublicSnapshot } from "./publicValidation";
import { parseMatch } from "./storage";
import { analysisFields, distributionFromCube } from "./criteriaStats";

const liveSet = (id: string): SkillEvent => ({
  skill: "set",
  result: "simple_good",
  playerId: id,
  assessment: {
    ...initialAssessment("set", "simple_good"),
    rallyContext: "auto",
  },
});
test("levantamento herda passe do rally e recalcula após correção/desfazer, sem alterar históricos manuais", () => {
  let match = newMatch();
  const id = match.players[0].id;
  match = append(match, {
    type: "event",
    event: {
      playerId: id,
      skill: "reception",
      result: "simple_good",
      assessment: {
        ...initialAssessment("reception", "simple_good"),
        criteria: { passQuality: "A" },
      },
    },
  });
  const passId = match.audit[0].id;
  const draft = withRallyContext(project(match), liveSet(id));
  assert.equal(draft.assessment?.criteria?.incomingPass, "A");
  assert.equal(effectiveDifficulty(draft), "easy");
  match = append(match, { type: "event", event: draft });
  let events = project(match).events;
  assert.equal(events.at(-1)?.assessment?.criteria?.incomingPass, "A");
  match = correct(
    match,
    passId,
    {
      ...events[0],
      result: "simple_gafe",
      assessment: {
        ...initialAssessment("reception", "simple_gafe"),
        criteria: { passQuality: "C" },
      },
    },
    "Revisão da qualidade do passe",
  );
  assert.equal(
    project(match).events.at(-1)?.assessment?.criteria?.incomingPass,
    "C",
  );
  assert.equal(effectiveDifficulty(project(match).events.at(-1)!), "hard");
  assert.equal(
    parseMatch(JSON.stringify(match)).audit.length,
    match.audit.length,
  );
  match = undo(match);
  assert.equal(
    project(match).events.at(-1)?.assessment?.criteria?.incomingPass,
    "A",
  );
  assert.equal(
    withRallyContext(project(match), liveSet(id)).assessment?.criteria
      ?.incomingPass,
    undefined,
  );
  const manual: SkillEvent = {
    ...liveSet(id),
    assessment: {
      ...initialAssessment("set", "simple_good"),
      criteria: { incomingPass: "C" },
    },
  };
  assert.equal(
    withRallyContext(project(match), manual).assessment?.criteria?.incomingPass,
    "C",
  );
});
test("passe automático não atravessa ataque, bloqueio, ponto, reinício nem outro set", () => {
  let match = newMatch();
  const id = match.players[0].id;
  match = append(match, {
    type: "event",
    event: {
      skill: "defense",
      result: "simple_good",
      playerId: id,
      assessment: {
        ...initialAssessment("defense", "simple_good"),
        criteria: { passQuality: "B" },
      },
    },
  });
  assert.equal(
    withRallyContext(project(match), liveSet(id)).assessment?.criteria
      ?.incomingPass,
    "B",
  );
  const afterAttack = append(match, {
    type: "event",
    event: {
      skill: "attack",
      result: "simple_good",
      playerId: id,
      assessment: initialAssessment("attack", "simple_good"),
    },
  });
  assert.equal(
    withRallyContext(project(afterAttack), liveSet(id)).assessment?.criteria
      ?.incomingPass,
    undefined,
  );
  const front = project(match).lineup[1];
  const afterBlock = append(match, {
    type: "event",
    event: {
      skill: "block",
      result: "simple_good",
      playerId: front,
      assessment: initialAssessment("block", "simple_good"),
    },
  });
  assert.equal(
    withRallyContext(project(afterBlock), liveSet(id)).assessment?.criteria
      ?.incomingPass,
    undefined,
  );
  match = append(match, { type: "point", winner: "ours" });
  assert.equal(
    withRallyContext(project(match), liveSet(id)).assessment?.criteria
      ?.incomingPass,
    undefined,
  );
  const reset = append(match, { type: "restartSet" });
  assert.equal(
    withRallyContext(project(reset), liveSet(id)).assessment?.criteria
      ?.incomingPass,
    undefined,
  );
  for (let i = 0; i < 24; i++)
    match = append(match, { type: "point", winner: "ours" });
  match = append(match, {
    type: "nextSet",
    lineup: project(match).lineup,
    roles: project(match).roles,
    server: "theirs",
  });
  assert.equal(
    withRallyContext(project(match), liveSet(id)).assessment?.criteria
      ?.incomingPass,
    undefined,
  );
});
test("ataque registra tipo, qualidade e bloqueadores, mantém ABC legado e publica estatísticas", () => {
  assert.equal(
    criteriaError("attack", {
      setType: "chute",
      incomingSet: "poor",
      attackBlockers: "triple",
    }),
    undefined,
  );
  assert.ok(criteriaError("defense", { attackBlockers: "double" }));
  assert.ok(criteriaError("attack", { attackBlockers: "four" }));
  let match = newMatch();
  const id = match.players[0].id;
  match = append(match, {
    type: "event",
    event: {
      skill: "attack",
      result: "simple_good",
      playerId: id,
      assessment: {
        ...initialAssessment("attack", "simple_good"),
        criteria: {
          setType: "chute",
          incomingSet: "poor",
          attackBlockers: "triple",
        },
      },
    },
  });
  const snapshot = publicSnapshot(match);
  assert.equal(validPublicSnapshot(snapshot), true);
  const dist = distributionFromCube(
    snapshot.technical!.team,
    "attackBlockers",
    "attack",
  );
  assert.equal(dist.rows.find((r) => r.id === "triple")?.count, 1);
  assert.ok(analysisFields.find((f) => f.key === "setType"));
  const e = project(match).events[0];
  assert.equal(effectiveDifficulty(e), "hard");
  assert.equal(
    effectiveDifficulty({
      ...e,
      assessment: { ...e.assessment!, criteria: { incomingSet: "good" } },
    }),
    "easy",
  );
  assert.equal(
    effectiveDifficulty({
      ...e,
      assessment: { ...e.assessment!, criteria: { incomingSet: "B" } },
    }),
    "normal",
  );
});
