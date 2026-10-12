import test from "node:test";
import assert from "node:assert/strict";
import { newMatch, ratingProfiles, type SkillEvent } from "./model";
import { append, correct, project, stats, undo } from "./engine";
import {
  assessed,
  assessmentError,
  normalAssessment as currentAssessment,
  playerEvents,
} from "./assessment";
import { contextFor, effectiveProfiles } from "./ratingV2";
import { parseMatch } from "./storage";
import { newPostGame, countKey, postGameErrors, postSummary } from "./postgame";
import { publicSnapshot } from "./publicSnapshot";
const normalAssessment = () => ({
  difficulty: "normal" as const,
  tags: [],
  version: 2 as const,
});
const event = (
  result = "simple_good",
  patch: Partial<SkillEvent["assessment"]> = {},
): SkillEvent => ({
  skill: "attack",
  playerId: "p1",
  result,
  assessment: { ...normalAssessment(), ...patch },
});

test("v2: uma ou vinte ações iguais têm a mesma nota, amostra é independente", () => {
  const m = newMatch();
  const one = stats([event()], m.weights);
  const many = stats(
    Array.from({ length: 20 }, () => event()),
    m.weights,
  );
  assert.equal(one.rating, 7.5);
  assert.equal(many.rating, 7.5);
  assert.equal(one.provisional, true);
  assert.equal(many.provisional, false);
  const receive = {
    ...event(),
    skill: "reception" as const,
    assessment: { ...normalAssessment(), execution: "neutral" as const },
  };
  assert.equal(
    stats([event(), receive], m.weights).rating,
    stats([...Array.from({ length: 20 }, () => event()), receive], m.weights)
      .rating,
  );
  assert.equal(stats([], m.weights).rating, null);
});
test("v2: tabela de dificuldade diferencia gafe de erro direto e mantém neutro", () => {
  const levels = ["easy", "normal", "hard", "emergency"] as const;
  assert.deepEqual(
    levels.map(
      (d) => assessed(event("simple_good", { difficulty: d })).quality * 10,
    ),
    [6.5, 7.5, 8.5, 9],
  );
  assert.deepEqual(
    levels.map(
      (d) => assessed(event("simple_gafe", { difficulty: d })).quality * 10,
    ),
    [2, 3, 4, 5],
  );
  assert.deepEqual(
    levels.map((d) => assessed(event("error", { difficulty: d })).quality * 10),
    [0, 1, 2, 3],
  );
  assert.equal(assessed(event("simple_gafe")).error, false);
  for (const difficulty of levels)
    assert.equal(assessed(event("in", { difficulty })).quality, 0.5);
});
test("v2: saque não recebe bônus por dificuldade, infração vale zero e salvada não acumula bônus", () => {
  for (const difficulty of ["easy", "normal", "hard", "emergency"] as const) {
    assert.equal(
      assessed({ ...event("simple_good", { difficulty }), skill: "serve" })
        .quality,
      0.7,
    );
    assert.equal(
      assessed(event("simple_gafe", { difficulty, tags: ["rule_fault"] }))
        .quality,
      0,
    );
  }
  const defense = {
    ...event("simple_good", {
      difficulty: "emergency",
      tags: ["save_extreme"],
    }),
    skill: "defense" as const,
  };
  assert.equal(
    assessed(defense).quality,
    assessed({
      ...defense,
      assessment: { ...normalAssessment(), difficulty: "emergency" },
    }).quality,
  );
  assert.equal(
    assessed(event("simple_gafe", { tags: ["magic"] })).quality,
    0.3,
  );
});
test("v2: execução individual é independente do placar e decisões têm desconto limitado", () => {
  const m = append(newMatch(), {
    type: "event",
    event: event("simple_theirs", { execution: "good" }),
  });
  assert.deepEqual(project(m).score, [0, 1]);
  assert.equal(stats(project(m).events, m.weights).rating, 7.5);
  assert.equal(stats(project(m).events, m.weights).errors, 0);
  assert.equal(
    assessed(event("simple_ours", { execution: "neutral" })).quality,
    0.5,
  );
  assert.equal(
    assessed(event("simple_good", { tags: ["bad_choice", "communication"] }))
      .quality,
    0.7,
  );
  assert.equal(
    assessed(event("simple_theirs", { execution: "unrated" })).rated,
    false,
  );
  assert(assessmentError(event("simple_good", { execution: "point" })));
});
test("v2: bloco efetivo > toque simples; usado > atrasado > ausência evitável", () => {
  const block = (tag: string) =>
    assessed({ ...event("simple_good", { tags: [tag] }), skill: "block" })
      .quality;
  assert(block("perfect_block") > block("touch_effective"));
  assert(block("touch_effective") > block("touch_simple"));
  assert(block("block_used") > block("late"));
  assert(block("late") > block("absent"));
});
test("v2: pipe/saída exigem jogador do fundo e não inventam dificuldade", () => {
  const base = newMatch();
  const back = {
    ...event("simple_good", { tags: ["attack_pipe"] }),
    playerId: "p4",
  };
  const m = append(base, { type: "event", event: back });
  assert.equal(stats(project(m).events, m.weights).rating, 7.5);
  assert.throws(
    () =>
      append(base, {
        type: "event",
        event: event("simple_good", { tags: ["attack_back_one"] }),
      }),
    /jogador do fundo/,
  );
  const lib = append(base, { type: "libero", playerId: "p10", replaced: "p4" });
  assert.throws(
    () => append(lib, { type: "event", event: { ...back, playerId: "p10" } }),
    /líbero/,
  );
});
test("v2: central sem líbero usa fundo; retorna ao perfil da rede sem alterar ações anteriores", () => {
  let m = append(newMatch(), {
    type: "event",
    event: { ...event(), skill: "defense", playerId: "p4" },
  });
  const first = project(m).events[0].ratingContext!;
  assert.equal(first.coverage, "middle-backrow");
  assert.equal(first.weights.defense, 35);
  for (let n = 0; n < 2; n++) {
    m = append(m, { type: "point", winner: "theirs" });
    m = append(m, { type: "point", winner: "ours" });
  }
  m = append(m, { type: "event", event: { ...event(), playerId: "p4" } });
  const rows = project(m).events;
  assert.deepEqual(rows[0].ratingContext, first);
  assert.equal(rows[1].ratingContext?.coverage, "standard");
  assert.equal(rows[1].ratingContext?.weights.block, 35);
  assert.deepEqual(project(parseMatch(JSON.stringify(m))).events, rows);
});
test("v2: opções do central e pesos ficam fotografados no instante da ação", () => {
  const base = newMatch(),
    state = project(base);
  assert.equal(
    contextFor({ ...base, middleCoverage: "defense-only" }, state, "p4")
      ?.weights.reception,
    0,
  );
  assert.equal(
    contextFor({ ...base, middleCoverage: "standard" }, state, "p4")?.coverage,
    "standard",
  );
  const m = append(base, {
    type: "event",
    event: { ...event(), skill: "defense", playerId: "p4" },
  });
  const old = project(m).events[0].ratingContext;
  const changed = {
    ...m,
    middleCoverage: "standard" as const,
    middleBackrowWeights: { ...effectiveProfiles(m).middle, defense: 100 },
  };
  assert.deepEqual(project(changed).events[0].ratingContext, old);
  const lib = append(base, { type: "libero", playerId: "p10", replaced: "p4" });
  assert.equal(contextFor(lib, project(lib), "p10")?.role, "libero");
});
test("v2: participantes têm notas próprias sem redução de 65%, um ponto coletivo", () => {
  const e = event("simple_ours", { group: "combination" });
  e.participants = [
    { playerId: "p1", responsibility: "correct" },
    { playerId: "p5", responsibility: "correct", skill: "set" },
  ];
  const m = append(newMatch(), { type: "event", event: e }),
    rows = project(m).events;
  assert.equal(
    stats(playerEvents(rows, "p1"), m.weights, ratingProfiles).rating,
    9,
  );
  assert.equal(
    stats(playerEvents(rows, "p5"), m.weights, ratingProfiles).rating,
    7.5,
  );
  assert.equal(stats(rows, m.weights).points, 1);
  assert.equal(stats(playerEvents(rows, "p5"), m.weights).points, 0);
});
test("v2: correção/desfazer e público mantêm nota e auditoria; históricos v1 ficam na fórmula antiga", () => {
  const m = append(newMatch(), { type: "event", event: event() });
  const changed = correct(
    m,
    m.audit[0].id,
    event("simple_good", { difficulty: "hard" }),
    "Bola difícil",
  );
  assert.equal(stats(project(changed).events, m.weights).rating, 8.5);
  assert.equal(stats(project(undo(changed)).events, m.weights).rating, 7.5);
  const pub = publicSnapshot(changed);
  assert.equal(pub.players.find((p) => p.id === "p1")?.stats.rating, 8.5);
  const old = {
    ...event(),
    assessment: { ...normalAssessment(), version: 1 as const },
  };
  assert.equal(stats([old], m.weights).rating, 5.9375);
  assert.equal(stats([old, event()], m.weights).ratingVersion, "mixed");
});
test("v2: pós-jogo por totais usa médias e permite separar central rede/fundo", () => {
  const m = newMatch(),
    game = newPostGame(m);
  const row = game.sets[0].rows.find((r) => r.playerId === "p4")!;
  row.counts[countKey("attack", "simple_good", "normal")] = 1;
  game.sets[0].rows.push({
    playerId: "p4",
    role: "middle",
    coverage: "middle-backrow",
    counts: { [countKey("defense", "simple_gafe", "hard")]: 2 },
  });
  assert.deepEqual(postGameErrors(game, m), []);
  const report = postSummary(game, m);
  assert(report.players.find((p) => p.player.id === "p4")!.rating! > 4);
  const roleRows = report.events.filter((e) => e.playerId === "p4");
  assert.equal(roleRows[1].ratingContext?.coverage, "middle-backrow");
  assert.equal(roleRows[1].ratingContext?.rotationZone, undefined);
  assert.equal(roleRows[1].ratingContext?.source, "totals");
  row.counts[countKey("attack", "simple_good", "normal")] = 20;
  assert.equal(
    postSummary(game, m).players.find((p) => p.player.id === "p4")!.rating,
    report.players.find((p) => p.player.id === "p4")!.rating,
  );
  assert.deepEqual(
    parseMatch(JSON.stringify({ ...m, postGameDraft: game })).postGameDraft,
    game,
  );
});
