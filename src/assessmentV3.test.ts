import test from "node:test";
import assert from "node:assert/strict";
import { newMatch, type SkillEvent, type AssessmentCriteria } from "./model";
import {
  assessed,
  assessmentError,
  normalAssessment,
  playerEvents,
  assessmentText,
} from "./assessment";
import { append, project, stats, correct, undo } from "./engine";
import { parseMatch } from "./storage";
import { effectiveDifficulty } from "./criteria";
import {
  newPostGame,
  countKey,
  postEvents,
  postGameErrors,
  postSummary,
} from "./postgame";
import { publicSnapshot } from "./publicSnapshot";
import { effectiveProfiles } from "./ratingV2";
const event = (
  skill: SkillEvent["skill"] = "defense",
  criteria: AssessmentCriteria = {},
  result = "simple_good",
): SkillEvent => ({
  skill,
  playerId: "p1",
  result,
  assessment: { ...normalAssessment(), criteria },
});
test("ABC descreve qualidade, não zona/levantador; C continua rally e erro direto fica separado", () => {
  const m = newMatch();
  for (const skill of ["reception", "defense"] as const) {
    assert.equal(assessed(event(skill, { passQuality: "A" })).quality, 0.9);
    assert.equal(assessed(event(skill, { passQuality: "B" })).quality, 0.75);
    assert.equal(assessed(event(skill, { passQuality: "C" })).quality, 0.3);
    assert.equal(assessed(event(skill, { passQuality: "C" })).error, false);
    for (const playerId of ["p1", "p2", "p5"]) {
      const record = append(m, {
        type: "event",
        event: { ...event(skill, {}, "simple_A"), playerId },
      });
      assert.equal(
        stats(
          playerEvents(project(record).events, playerId),
          m.weights,
          effectiveProfiles(m),
        ).rating,
        9,
      );
    }
    assert.deepEqual(
      project(append(m, { type: "event", event: event(skill, {}, "simple_C") }))
        .score,
      [0, 0],
    );
    assert.deepEqual(
      project(
        append(m, {
          type: "event",
          event: event(skill, { passQuality: "error" }, "simple_theirs"),
        }),
      ).score,
      [0, 1],
    );
  }
});
test("bloqueio duplo conserva precisão própria de cada participante e não multiplica pontos", () => {
  const e = event("block", { blockQuality: "effective" });
  e.assessment!.group = "double";
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
  const m = append(newMatch(), { type: "event", event: e }),
    rows = project(m).events;
  assert(Math.abs(assessed(playerEvents(rows, "p1")[0]).quality - 0.95) < 1e-9);
  assert.equal(assessed(playerEvents(rows, "p3")[0]).quality, 0.4);
  assert.deepEqual(project(m).score, [0, 0]);
  assert.deepEqual(parseMatch(JSON.stringify(m)).audit, m.audit);
});
test("qualidade domina; dificuldade pesa mais na defesa que na recepção e menos no bloco", () => {
  for (const skill of ["defense", "reception"] as const) {
    const easy = event(skill, { passQuality: "A" }),
      hard = event(skill, { passQuality: "A" });
    easy.assessment!.difficulty = "easy";
    hard.assessment!.difficulty = "hard";
    assert(assessed(hard).quality > assessed(easy).quality);
    assert(
      assessed(event(skill, { passQuality: "A" })).quality >
        assessed({
          ...event(skill, { passQuality: "C" }),
          assessment: {
            ...normalAssessment(),
            difficulty: "emergency",
            criteria: { passQuality: "C" },
          },
        }).quality,
    );
  }
  const hard = (skill: SkillEvent["skill"]) =>
    assessed({
      ...event(skill),
      assessment: { ...normalAssessment(), difficulty: "hard" },
    }).quality;
  assert(hard("defense") > hard("reception"));
  assert(hard("reception") > hard("block"));
});
test("tipo de bola/passe sugere dificuldade uma vez; escolha manual prevalece", () => {
  const automatic = event("defense", {
    incomingBall: "strong",
    passQuality: "A",
  });
  assert.equal(effectiveDifficulty(automatic), "hard");
  const manual = {
    ...automatic,
    assessment: {
      ...automatic.assessment!,
      difficulty: "hard" as const,
      difficultySource: "manual" as const,
    },
  };
  assert.equal(assessed(automatic).quality, assessed(manual).quality);
  const normal = {
    ...manual,
    assessment: { ...manual.assessment, difficulty: "normal" as const },
  };
  assert.equal(effectiveDifficulty(normal), "normal");
  assert.equal(assessed(normal).quality, 0.9);
  const tip = event("defense", { incomingBall: "tip", technique: "bump" });
  assert.equal(
    assessed(tip).quality,
    assessed({
      ...tip,
      assessment: {
        ...tip.assessment!,
        criteria: { incomingBall: "tip", technique: "touch" },
      },
    }).quality,
  );
});
test("levantamento avalia qualidade entregue dentro do passe recebido, não premia bola ruim por si só", () => {
  const difficult = event("set", {
    incomingPass: "C",
    technique: "bump",
    setDirection: "back",
  });
  assert.equal(effectiveDifficulty(difficult), "hard");
  assert.equal(assessed(difficult).quality, 0.825);
  const bad = { ...difficult, result: "simple_gafe" };
  assert(assessed(bad).quality < assessed(difficult).quality);
  assert.equal(
    assessed(difficult).quality,
    assessed({
      ...difficult,
      assessment: {
        ...difficult.assessment!,
        criteria: {
          incomingPass: "C",
          technique: "touch",
          setDirection: "front",
        },
      },
    }).quality,
  );
});
test("saque registra tipo e momento sem multiplicar nota; momento automático usa placar/tempo", () => {
  const serve = event("serve", { serveType: "jump", gameMoment: "decisive" });
  assert.equal(
    assessed(serve).quality,
    assessed(event("serve", { serveType: "underhand", gameMoment: "normal" }))
      .quality,
  );
  let m = append(newMatch(), { type: "timeout", side: "ours" });
  const record = { ...event("serve"), playerId: project(m).lineup[0] };
  m = append(m, { type: "event", event: record });
  assert.equal(
    project(m).events[0].assessment?.criteria?.gameMoment,
    "after-timeout",
  );
});
test("ataque recebe contexto do levantamento e passada tem desconto limitado sem repetir erro", () => {
  const comfortable = event("attack", {
    incomingSet: "A",
    attackType: "tip",
    approach: "adjusted",
  });
  const difficult = event("attack", {
    incomingSet: "C",
    attackType: "power",
    approach: "good",
  });
  assert(assessed(difficult).quality > assessed(comfortable).quality);
  const normal = event("attack", { approach: "good" });
  assert(
    Math.abs(
      assessed(normal).quality -
        assessed(event("attack", { approach: "poor" })).quality -
        0.025,
    ) < 1e-9,
  );
  assert.equal(
    assessed(event("attack", { approach: "poor" }, "simple_gafe")).quality,
    assessed(event("attack", { approach: "good" }, "simple_gafe")).quality,
  );
});
test("participantes não herdam critérios de outro fundamento; backup/correção/público mantêm notas", () => {
  const e = event("set", { incomingPass: "C" });
  e.playerId = "p5";
  e.assessment!.group = "combination";
  e.participants = [
    { playerId: "p5", skill: "set", responsibility: "correct" },
    {
      playerId: "p2",
      skill: "defense",
      responsibility: "correct",
      criteria: { passQuality: "C" },
    },
  ];
  const m = append(newMatch(), { type: "event", event: e });
  const rows = project(m).events;
  assert.deepEqual(playerEvents(rows, "p2")[0].assessment?.criteria, {
    passQuality: "C",
  });
  assert.equal(assessed(playerEvents(rows, "p2")[0]).quality, 0.3);
  const restored = parseMatch(JSON.stringify(m));
  assert.deepEqual(project(restored).events, rows);
  const single = append(newMatch(), {
    type: "event",
    event: event("defense", { passQuality: "C" }),
  });
  const changed = correct(
    single,
    single.audit[0].id,
    event("defense", { passQuality: "A" }),
    "Passe perfeito",
  );
  assert.equal(stats(project(changed).events, changed.weights).rating, 9);
  assert.equal(stats(project(undo(changed)).events, single.weights).rating, 3);
  assert.equal(
    publicSnapshot(changed).players.find((p) => p.id === "p1")?.stats.rating,
    9,
  );
  assert(
    assessmentText(project(changed).events[0]).includes(
      "A · perfeita para levantar",
    ),
  );
});
test("campos incompatíveis são rejeitados e notas continuam independentes do volume", () => {
  assert(assessmentError(event("block", { passQuality: "A" })));
  assert(assessmentError(event("reception", { incomingPass: "C" })));
  assert(assessmentError(event("serve", { serveType: "invalid" as "jump" })));
  const m = newMatch(),
    e = event("reception", { passQuality: "A" });
  assert.equal(
    stats([e], m.weights).rating,
    stats(
      Array.from({ length: 20 }, () => e),
      m.weights,
    ).rating,
  );
  assert.equal(stats([e], m.weights).provisional, true);
});
test("totais pós-jogo preservam cada combinação de critérios e quantidade, sem misturar filtros", () => {
  assert.equal(
    countKey(
      "set",
      "simple_good",
      "normal",
      "",
      { incomingPass: "C", technique: "bump" },
      "context",
    ),
    countKey(
      "set",
      "simple_good",
      "normal",
      "",
      { technique: "bump", incomingPass: "C" },
      "context",
    ),
  );
  const manualCell = countKey(
    "attack",
    "simple_good",
    "normal",
    "magic",
    {},
    "manual",
  );
  const manualGame = newPostGame(newMatch());
  manualGame.sets[0].rows[0].counts[manualCell] = 1;
  assert.equal(assessed(postEvents(manualGame)[0]).quality, 0.75);
  const m = newMatch(),
    g = newPostGame(m),
    row = g.sets[0].rows.find((r) => r.playerId === "p1")!;
  const a = countKey(
    "defense",
    "simple_A",
    "normal",
    "",
    { incomingBall: "strong" },
    "context",
  );
  const c = countKey(
    "defense",
    "simple_C",
    "normal",
    "",
    { incomingBall: "free" },
    "context",
  );
  row.counts = { [a]: 2, [c]: 3 };
  assert.deepEqual(postGameErrors(g, m), []);
  const events = postEvents(g);
  assert.equal(events.length, 5);
  assert.equal(events[0].assessment?.criteria?.incomingBall, "strong");
  assert.equal(events[4].assessment?.criteria?.incomingBall, "free");
  assert.equal(
    postSummary(g, m).players.find((p) => p.player.id === "p1")?.count,
    5,
  );
  assert.deepEqual(
    parseMatch(JSON.stringify({ ...m, postGameDraft: g })).postGameDraft,
    g,
  );
  row.counts["defense:simple_A:normal::malformed"] = 1;
  assert(postGameErrors(g, m).length > 0);
});
