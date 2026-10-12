import test from "node:test";
import assert from "node:assert/strict";
import { type SkillEvent, newMatch } from "./model";
import { normalAssessment } from "./assessment";
import { criterionDistribution, analysisParticipations } from "./criteriaStats";
import { append, project, correct, undo } from "./engine";
import { countKey, newPostGame, postEvents } from "./postgame";
const event = (
  technique?: "touch" | "bump",
  result = "simple_good",
): SkillEvent => ({
  skill: "defense",
  result,
  playerId: "p1",
  assessment: {
    ...normalAssessment(),
    criteria: technique ? { technique } : {},
  },
});
test("técnica usa detalhes informados, empates e denominador sem ausentes", () => {
  const d = criterionDistribution(
    [event("bump"), event("bump"), event("touch"), event()],
    "technique",
  );
  assert.equal(d.known, 3);
  assert.equal(d.missing, 1);
  assert.equal(d.coverage, 75);
  assert.equal(d.leaders[0].id, "bump");
  assert.equal(d.rows.find((r) => r.id === "bump")?.percent, 200 / 3);
  assert.equal(
    criterionDistribution([event("touch"), event("bump")], "technique").leaders
      .length,
    2,
  );
  const old = event();
  delete old.assessment;
  assert.equal(criterionDistribution([old], "technique").known, 0);
  assert.equal(criterionDistribution([old], "passQuality").known, 0);
});
test("ABC e média respeitam Bom/Gafe, qualidades explícitas e ações sem nota", () => {
  const a = event("touch");
  a.assessment!.criteria!.passQuality = "A";
  const un = event("bump");
  un.assessment!.execution = "unrated";
  const d = criterionDistribution(
    [
      a,
      event("bump"),
      event("bump", "simple_gafe"),
      event("bump", "simple_theirs"),
      un,
    ],
    "passQuality",
  );
  assert.equal(d.known, 5);
  assert.equal(d.rows.find((r) => r.id === "A")?.rating, 9);
  assert.equal(d.rows.find((r) => r.id === "B")?.count, 2);
  assert.equal(d.rows.find((r) => r.id === "B")?.rated, 1);
  assert.equal(d.rows.find((r) => r.id === "C")?.rating, 3);
  assert.equal(d.rows.find((r) => r.id === "error")?.rating, 1);
});
test("coletivas contam participações próprias, sem herdar técnica de outro fundamento", () => {
  const e: SkillEvent = {
    ...event("touch"),
    skill: "set",
    assessment: {
      ...normalAssessment(),
      group: "combination",
      criteria: { technique: "touch" },
    },
    participants: [
      { playerId: "p1", responsibility: "correct" },
      {
        playerId: "p2",
        responsibility: "correct",
        skill: "defense",
        criteria: { technique: "bump" },
      },
      { playerId: "p3", responsibility: "none" },
    ],
  };
  const rows = analysisParticipations([e]);
  assert.equal(rows.length, 2);
  assert.equal(criterionDistribution(rows, "technique").leaders.length, 2);
  assert.equal(
    criterionDistribution(analysisParticipations([e], "p2"), "technique")
      .leaders[0].id,
    "bump",
  );
  const block: SkillEvent = {
    ...event(),
    skill: "block",
    assessment: { ...normalAssessment(), group: "double" },
    participants: [
      {
        playerId: "p1",
        responsibility: "correct",
        criteria: { blockQuality: "perfect" },
      },
      {
        playerId: "p2",
        responsibility: "wrong",
        criteria: { blockQuality: "used" },
      },
    ],
  };
  assert.equal(
    criterionDistribution(analysisParticipations([block]), "group").rows.find(
      (r) => r.id === "double",
    )?.count,
    2,
  );
  assert.equal(
    criterionDistribution(analysisParticipations([block]), "blockQuality")
      .known,
    2,
  );
});
test("totais, correção e desfazer atualizam a distribuição", () => {
  const m = newMatch(),
    g = newPostGame(m);
  g.sets[0].rows[0].counts[
    countKey("defense", "simple_good", "normal", "", { technique: "bump" })
  ] = 4;
  assert.equal(
    criterionDistribution(postEvents(g), "technique").rows.find(
      (r) => r.id === "bump",
    )?.count,
    4,
  );
  const one = append(m, { type: "event", event: event("touch") });
  const edited = correct(
    one,
    one.audit[0].id,
    event("bump"),
    "Técnica corrigida",
  );
  assert.equal(
    criterionDistribution(project(edited).events, "technique").leaders[0].id,
    "bump",
  );
  assert.equal(
    criterionDistribution(project(undo(edited)).events, "technique").leaders[0]
      .id,
    "touch",
  );
  assert.equal(
    criterionDistribution(project(undo(one)).events, "technique").known,
    0,
  );
});
