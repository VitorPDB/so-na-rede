import test from "node:test";
import assert from "node:assert/strict";
import {
  assessed,
  assessmentError,
  playerEvents,
  normalAssessment as currentAssessment,
  toggleTag,
} from "./assessment";
import { newMatch, type SkillEvent } from "./model";
import { append, correct, project, stats, undo } from "./engine";
import { parseMatch } from "./storage";
import { newPostGame, postGameErrors, postSummary } from "./postgame";
import {
  newDetailedDraft,
  validDetailedDraft,
  replayDetailed,
} from "./postgameDetailed";
import { gameSnapshot } from "./career";
import { publicSnapshot } from "./publicSnapshot";
// These regression fixtures verify unchanged v1 semantics; v2 has its own tests.
const normalAssessment = () => ({
  ...currentAssessment(),
  version: 1 as const,
});
const action = (
  difficulty: "easy" | "normal" | "hard" | "emergency",
  result = "simple_good",
  tags: string[] = [],
): SkillEvent => ({
  skill: "attack",
  result,
  playerId: "p1",
  assessment: { version: 1, difficulty, tags },
});
test("dificuldade diferencia acertos e erros, neutro permanece neutro e contexto não muda o placar", () => {
  const levels = ["easy", "normal", "hard", "emergency"] as const;
  const successes = levels.map((d) => assessed(action(d)).quality);
  const failures = levels.map(
    (d) => assessed(action(d, "simple_gafe")).quality,
  );
  successes.forEach((v, i) => {
    if (i) assert.ok(v > successes[i - 1]);
  });
  failures.forEach((v, i) => {
    if (i) assert.ok(v > failures[i - 1]);
    assert.equal(assessed(action(levels[i], "in")).quality, 0.5);
  });
  assert.equal(assessed(action("normal", "simple_gafe")).penalty, 0);
  assert.equal(assessed({ skill: "attack", result: "error" }).penalty, 1);
  const match = append(newMatch(), {
    type: "event",
    event: action("emergency", "simple_ours", ["magic"]),
  });
  assert.deepEqual(project(match).score, [1, 0]);
  assert.equal(project(match).rallies.length, 1);
  assert.ok(stats(project(match).events, match.weights).rating! <= 10);
});
test("gafe fácil custa mais que difícil em cada fundamento; acerto difícil vale mais", () => {
  for (const skill of [
    "set",
    "reception",
    "attack",
    "block",
    "defense",
    "serve",
  ] as const) {
    const event = (
      difficulty: "easy" | "normal" | "hard" | "emergency",
      result: string,
    ): SkillEvent => ({
      skill,
      result,
      assessment: { version: 1, difficulty, tags: [] },
    });
    const levels = ["easy", "normal", "hard", "emergency"] as const;
    const bad = levels.map((d) => assessed(event(d, "simple_gafe")).quality);
    const good = levels.map((d) => assessed(event(d, "simple_good")).quality);
    assert.deepEqual(
      bad.map((n) => Number(n.toFixed(3))),
      [0, 0.05, 0.25, 0.36],
    );
    assert.deepEqual(
      good.map((n) => Number(n.toFixed(3))),
      [0.775, 0.875, 0.975, 1],
    );
    assert.ok(
      stats([event("hard", "simple_gafe")], newMatch().weights).rating! >
        stats([event("easy", "simple_gafe")], newMatch().weights).rating!,
    );
  }
});
test("salvadas e bloqueios refinam execução com bônus limitado e sem punir boa posição sem toque", () => {
  const defense = (tag: string, result = "simple_good"): SkillEvent => ({
    skill: "defense",
    result,
    assessment: { ...normalAssessment(), tags: [tag] },
  });
  assert.ok(
    assessed(defense("save_extreme")).quality >
      assessed(defense("save_hard")).quality,
  );
  assert.ok(
    assessed(defense("counterattack")).quality >
      assessed(defense("alive")).quality,
  );
  assert.ok(
    assessed(defense("magic", "simple_gafe")).quality <=
      assessed({
        ...defense("magic", "simple_gafe"),
        assessment: normalAssessment(),
      }).quality,
  );
  const block = (tag: string) =>
    assessed({
      skill: "block",
      result: "simple_good",
      assessment: { ...normalAssessment(), tags: [tag] },
    }).quality;
  assert.ok(block("perfect_block") > block("touch_effective"));
  assert.ok(block("touch_effective") > block("touch_simple"));
  assert.ok(block("block_used") > block("late"));
  assert.ok(block("late") > block("absent"));
  assert.ok(block("direction") > 0.5);
  assert.ok(
    assessmentError({
      skill: "defense",
      result: "good",
      assessment: { ...normalAssessment(), tags: ["save_extreme", "magic"] },
    }),
  );
  assert.deepEqual(toggleTag(["save_hard"], "save_extreme"), ["save_extreme"]);
  assert.deepEqual(toggleTag(["save_extreme"], "save_extreme"), []);
});
test("jogada ensaiada avalia fundamentos, dificuldade e funções de cada participante sem repetir ponto", () => {
  const original = newMatch();
  const event: SkillEvent = {
    ...action("hard", "simple_ours"),
    assessment: { ...normalAssessment(), group: "combination" },
    participants: [
      { playerId: "p1", responsibility: "correct" },
      {
        playerId: "p5",
        responsibility: "wrong",
        skill: "set",
        difficulty: "easy",
      },
    ],
  };
  const match = append(original, { type: "event", event });
  const events = project(match).events;
  assert.equal(events.length, 1);
  assert.deepEqual(project(match).score, [1, 0]);
  const attacker = stats(
    playerEvents(events, "p1"),
    match.weights,
    match.ratingProfiles,
  );
  const setter = stats(
    playerEvents(events, "p5"),
    match.weights,
    match.ratingProfiles,
  );
  assert.equal(attacker.count, 1);
  assert.equal(attacker.points, 1);
  assert.equal(attacker.errors, 0);
  assert.equal(setter.count, 1);
  assert.equal(setter.points, 0);
  assert.equal(setter.errors, 1);
  assert.equal(setter.list.find((m) => m.skill === "set")?.count, 1);
  assert.equal(playerEvents(events, "p5")[0].role, "setter");
  assert.ok(attacker.rating! > setter.rating!);
  assert.ok(
    assessed(playerEvents(events, "p1")[0]).quality <
      assessed(action("normal")).quality,
  );
  assert.equal(stats(events, match.weights).points, 1);
  const archived = gameSnapshot(match);
  assert.equal(archived.players.find((p) => p.playerId === "p5")?.count, 1);
  assert.equal(
    publicSnapshot(match).players.find((p) => p.id === "p5")?.stats.count,
    1,
  );
  assert.deepEqual(project(parseMatch(JSON.stringify(match))).score, [1, 0]);
});
test("bloqueio duplo/triplo exige atletas da rede e isola erro, parcial e ausência de responsabilidade", () => {
  const base = newMatch();
  const event: SkillEvent = {
    skill: "block",
    result: "simple_theirs",
    playerId: "p3",
    assessment: { ...normalAssessment(), group: "triple" },
    participants: [
      { playerId: "p3", responsibility: "wrong" },
      { playerId: "p2", responsibility: "correct" },
      { playerId: "p1", responsibility: "none" },
    ],
  };
  const match = append(base, { type: "event", event });
  const events = project(match).events;
  assert.equal(stats(playerEvents(events, "p2"), base.weights).errors, 0);
  assert.equal(stats(playerEvents(events, "p3"), base.weights).errors, 1);
  assert.equal(stats(playerEvents(events, "p1"), base.weights).rating, null);
  assert.equal(stats(playerEvents(events, "p2"), base.weights).points, 0);
  assert.deepEqual(project(match).score, [0, 1]);
  assert.throws(() =>
    append(base, {
      type: "event",
      event: {
        ...event,
        participants: event.participants!.map((p) =>
          p.playerId === "p1" ? { ...p, playerId: "p5" } : p,
        ),
      },
    }),
  );
  assert.throws(() =>
    append(base, {
      type: "event",
      event: {
        ...event,
        assessment: { ...event.assessment!, group: "double" },
      },
    }),
  );
  assert.throws(() =>
    append(base, {
      type: "event",
      event: {
        ...event,
        participants: [...event.participants!, event.participants![0]],
      },
    }),
  );
});
test("correção de dificuldade recalcula nota, preserva placar/auditoria e desfazer restaura a avaliação", () => {
  const first = append(newMatch(), {
    type: "event",
    event: action("easy", "simple_ours"),
  });
  const changed = correct(
    first,
    first.audit[0].id,
    action("hard", "simple_ours", ["magic"]),
    "Bola fora de equilíbrio",
  );
  assert.deepEqual(project(first).score, project(changed).score);
  assert.ok(
    stats(project(changed).events, changed.weights).rating! >
      stats(project(first).events, first.weights).rating!,
  );
  assert.equal(first.audit[0].command?.type, "event");
  assert.deepEqual(project(undo(changed)).events, project(first).events);
  assert.ok(assessmentError(action("hard", "simple_good", ["touch_simple"])));
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...first,
        audit: [
          {
            ...first.audit[0],
            command: {
              type: "event",
              event: action("hard", "simple_good", ["not_a_tag"]),
            },
          },
        ],
      }),
    ),
  );
});
test("pós-jogo conserva contexto em totais e permite salvar rascunho coletivo ainda incompleto", () => {
  const source = newMatch();
  const totals = newPostGame(source);
  const row = totals.sets[0].rows.find((r) => r.playerId === "p1")!;
  row.counts = {
    "attack:simple_good:easy": 4,
    "attack:simple_gafe:hard": 2,
    "attack:simple_good:emergency:magic": 1,
  };
  assert.deepEqual(postGameErrors(totals, source), []);
  assert.equal(
    postSummary(totals, source).players.find((p) => p.player.id === "p1")
      ?.count,
    7,
  );
  assert.deepEqual(
    parseMatch(JSON.stringify({ ...source, postGameDraft: totals }))
      .postGameDraft,
    totals,
  );
  row.counts = { "attack:simple_good:wrong_difficulty": 1 };
  assert.ok(postGameErrors(totals, source).length);
  const draft = newDetailedDraft(source);
  draft.rows = [
    {
      id: "row",
      command: {
        type: "event",
        event: {
          ...action("hard"),
          assessment: { ...normalAssessment(), group: "combination" },
          participants: [],
        },
      },
    },
  ];
  assert.equal(validDetailedDraft(draft, source), true);
  assert.deepEqual(
    parseMatch(JSON.stringify({ ...source, detailedDraft: draft }))
      .detailedDraft,
    draft,
  );
  assert.ok(replayDetailed(draft, source).error.includes("Linha 1"));
});
