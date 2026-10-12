import test from "node:test";
import assert from "node:assert/strict";
import { newMatch, type SkillEvent } from "./model";
import {
  assessed,
  normalAssessment,
  playerEvents,
  assessmentError,
} from "./assessment";
import { append, project, stats, undo } from "./engine";
import { parseMatch } from "./storage";
import { effectiveProfiles } from "./ratingV2";
import { newPostGame, countKey, postEvents, postResults } from "./postgame";
const event = (
  skill: SkillEvent["skill"],
  result = "simple_good",
): SkillEvent => ({
  skill,
  result,
  playerId: "p1",
  assessment: normalAssessment(),
});
test("v4 substitui etiquetas por qualidade: gafe continua e difícil cobra menos em todos os fundamentos", () => {
  for (const skill of [
    "defense",
    "reception",
    "attack",
    "set",
    "serve",
    "block",
  ] as const) {
    const gafe = event(skill, "simple_gafe");
    const easy = assessed({
      ...gafe,
      assessment: {
        ...gafe.assessment!,
        difficulty: "easy",
        difficultySource: "manual",
      },
    });
    const hard = assessed({
      ...gafe,
      assessment: {
        ...gafe.assessment!,
        difficulty: "hard",
        difficultySource: "manual",
      },
    });
    assert(easy.quality < hard.quality);
    assert(hard.quality < 0.5);
    assert.equal(hard.error, false);
    const base = newMatch();
    if (skill === "serve") gafe.playerId = base.initialLineup[0];
    const m = append(base, { type: "event", event: gafe });
    assert.deepEqual(project(m).score, [0, 0]);
  }
  const at = event("attack");
  assert.deepEqual(
    assessed(at),
    assessed({
      ...at,
      assessment: { ...at.assessment!, tags: ["magic", "ugly_error"] },
    }),
  );
  assert.equal(
    assessed({
      ...at,
      assessment: { ...at.assessment!, version: 3, tags: ["ugly_error"] },
    }).quality,
    0,
  );
});
test("v4 mantém ABC, volume independente e recuperação/desfazer sem misturar fórmulas antigas", () => {
  const m = newMatch(),
    a = event("defense", "simple_A");
  const one = append(m, { type: "event", event: a });
  assert.equal(parseMatch(JSON.stringify(one)).audit[0].command?.type, "event");
  const s = project(one);
  const grade = stats(s.events, m.weights, effectiveProfiles(m));
  assert.equal(grade.ratingVersion, "v4");
  assert.equal(grade.rating, 9);
  assert.equal(
    stats(
      Array.from({ length: 20 }, () => s.events[0]),
      m.weights,
      effectiveProfiles(m),
    ).rating,
    grade.rating,
  );
  assert.equal(project(undo(one)).events.length, 0);
});
test("v4 bloco avalia precisão de cada jogador e mantém um único ponto", () => {
  const e = event("block", "simple_ours");
  e.assessment = {
    ...e.assessment!,
    group: "double",
    criteria: { blockQuality: "perfect" },
  };
  e.participants = [
    {
      playerId: "p1",
      responsibility: "correct",
      criteria: { blockQuality: "perfect" },
    },
    {
      playerId: "p3",
      responsibility: "wrong",
      criteria: { blockQuality: "used" },
    },
  ];
  const m = append(newMatch(), { type: "event", event: e });
  const rows = project(m).events;
  assert.equal(assessed(playerEvents(rows, "p1")[0]).quality, 0.95);
  assert.equal(assessed(playerEvents(rows, "p3")[0]).quality, 0.4);
  assert.equal(assessed(playerEvents(rows, "p3")[0]).point, false);
  assert.deepEqual(project(m).score, [1, 0]);
});
test("v4 pós-jogo usa ficha nova, mantém critérios no backup e oculta resultados anteriores", () => {
  const m = newMatch(),
    game = newPostGame(m);
  assert.equal(game.ratingVersion, 4);
  assert.deepEqual(
    postResults("reception", "advanced", 4).map((r) => r.id),
    ["simple_ours", "simple_theirs", "simple_A", "simple_B", "simple_C"],
  );
  const key = countKey(
    "set",
    "simple_gafe",
    "hard",
    "",
    { incomingPass: "C" },
    "manual",
  );
  game.sets[0].rows[0].counts[key] = 1;
  const row = postEvents(game, 0, m)[0];
  assert.equal(row.assessment?.criteria?.incomingPass, "C");
  assert.equal(row.assessment?.version, 4);
  assert.equal(assessmentError(row), undefined);
  assert.equal(assessed(row).quality, 0.375);
});
