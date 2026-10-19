import test from "node:test";
import assert from "node:assert/strict";
import { newMatch, type RecordedEvent } from "./model";
import { append, completeRally, project, undo, correct } from "./engine";
import { parseMatch } from "./storage";
import { matchHighlights } from "./matchHighlights";
import { normalAssessment, assessed } from "./assessment";

test("complementação preserva placar, rotação, auditoria e backup", () => {
  let m = append(newMatch(), { type: "point", winner: "ours" });
  m = append(m, { type: "point", winner: "theirs" });
  const before = project(m);
  const r = before.rallies[0];
  m = completeRally(m, r.id, {
    skill: "set",
    playerId: r.lineup[0],
    result: "simple_good",
    assessment: normalAssessment(),
    videoTimestampMs: 12345,
    videoSource: "teste.mp4|123|456",
  });
  m = completeRally(m, r.id, {
    skill: "attack",
    playerId: r.lineup[1],
    result: "simple_ours",
    assessment: normalAssessment(),
  });
  assert.deepEqual(project(m).score, before.score);
  assert.deepEqual(project(m).lineup, before.lineup);
  assert.equal(project(m).rallies.length, 2);
  assert.equal(project(m).events.length, 2);
  assert.deepEqual(
    parseMatch(JSON.stringify(m)),
    JSON.parse(JSON.stringify(m)),
  );
  assert.equal(matchHighlights(project(m).events).partnerships[0].count, 1);
  assert.equal(project(undo(m)).events.length, 1);
  assert.deepEqual(project(undo(m)).score, before.score);
  assert.equal(project(undo(undo(m))).events.length, 0);
});
test("complementação recusa trocar vencedor e duplicar ponto", () => {
  const m = append(newMatch(), { type: "point", winner: "ours" });
  const r = project(m).rallies[0];
  assert.throws(() =>
    completeRally(m, r.id, {
      skill: "attack",
      playerId: r.lineup[1],
      result: "simple_theirs",
    }),
  );
  const next = completeRally(m, r.id, {
    skill: "attack",
    playerId: r.lineup[1],
    result: "simple_ours",
  });
  assert.throws(() =>
    completeRally(next, r.id, {
      skill: "attack",
      playerId: r.lineup[1],
      result: "simple_ours",
    }),
  );
});
test("correção e reinício mantêm semântica das inserções", () => {
  let m = append(newMatch(), { type: "point", winner: "ours" });
  const r = project(m).rallies[0];
  m = completeRally(m, r.id, {
    skill: "set",
    playerId: r.lineup[0],
    result: "simple_good",
  });
  const e = project(m).events[0];
  m = correct(m, e.id, { ...e, videoTimestampMs: 4000 }, "Ajuste do vídeo");
  assert.equal(project(m).events[0].videoTimestampMs, 4000);
  assert.deepEqual(
    parseMatch(JSON.stringify(m)),
    JSON.parse(JSON.stringify(m)),
  );
  const reset = append(m, { type: "restartSet" });
  assert.equal(project(reset).events.length, 0);
  assert.deepEqual(project(reset).score, [0, 0]);
});
const ev = (patch: Partial<RecordedEvent>): RecordedEvent => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  set: 1,
  rally: 1,
  rotation: 1,
  serving: "ours",
  scoreBefore: [0, 0],
  skill: "attack",
  result: "simple_good",
  ...patch,
});
test("pontos não confundem bom com ponto; dupla não duplica e tripla fica fora", () => {
  const data = matchHighlights([
    ev({ playerId: "a", result: "simple_good" }),
    ev({ playerId: "a", result: "simple_ours" }),
    ev({ skill: "serve", playerId: "b", result: "ace" }),
    ev({
      skill: "block",
      playerId: "a",
      result: "simple_ours",
      participants: [
        { playerId: "a", responsibility: "correct" },
        { playerId: "b", responsibility: "correct" },
      ],
    }),
    ev({
      skill: "block",
      playerId: "a",
      result: "simple_ours",
      participants: [
        { playerId: "a", responsibility: "correct" },
        { playerId: "b", responsibility: "correct" },
        { playerId: "c", responsibility: "correct" },
      ],
    }),
  ]);
  assert.equal(data.scorers.find((p) => p.player === "a")?.attacks, 1);
  assert.equal(data.scorers.find((p) => p.player === "b")?.aces, 1);
  assert.equal(data.pairs[0].points, 1);
});
test("parceria não atravessa rally, outro toque ou largadinha", () => {
  const set = ev({ skill: "set", playerId: "s" });
  const attack = ev({ playerId: "a" });
  assert.equal(matchHighlights([set, attack]).partnerships.length, 1);
  assert.equal(
    matchHighlights([set, { ...attack, rally: 2 }]).partnerships.length,
    0,
  );
  assert.equal(
    matchHighlights([set, ev({ skill: "defense" }), attack]).partnerships
      .length,
    0,
  );
  assert.equal(
    matchHighlights([
      {
        ...set,
        assessment: {
          ...normalAssessment(),
          criteria: { setType: "setter_tip" },
        },
      },
      attack,
    ]).partnerships.length,
    0,
  );
});
test("contexto forçado não muda nota nem invalida backup", () => {
  const e = ev({ skill: "set", assessment: normalAssessment() });
  assert.equal(
    assessed(e).quality,
    assessed({
      ...e,
      assessment: { ...e.assessment!, criteria: { ballConstraint: "forced" } },
    }).quality,
  );
});
