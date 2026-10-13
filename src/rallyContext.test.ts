import test from "node:test";
import assert from "node:assert/strict";
import { append, correct, project, undo } from "./engine";
import { newMatch, type SkillEvent } from "./model";
import { initialAssessment } from "./actionQuality";
import { withRallyContext } from "./rallyContext";
import { effectiveDifficulty, criteriaError, setTypeOptions } from "./criteria";
import { publicSnapshot } from "./publicSnapshot";
import { validPublicSnapshot } from "./publicValidation";
import { parseMatch } from "./storage";
import { analysisFields, distributionFromCube } from "./criteriaStats";
import { assessed } from "./assessment";
import { countKey, cellAssessment, newPostGame } from "./postgame";
import { playerEvents } from "./assessment";

const liveSet = (id: string): SkillEvent => ({
  skill: "set",
  result: "simple_good",
  playerId: id,
  assessment: {
    ...initialAssessment("set", "simple_good"),
    rallyContext: "auto",
  },
});
const liveAttack = (id: string): SkillEvent => ({
  skill: "attack",
  result: "simple_good",
  playerId: id,
  assessment: {
    ...initialAssessment("attack", "simple_good"),
    rallyContext: "auto",
  },
});
test("infrações por fundamento e erros de ataque encerram um único rally e desfazer restaura", () => {
  for (const skill of ["set", "attack", "block"] as const) {
    const faults =
      skill === "attack"
        ? (["net_touch", "invasion", "attack_net", "attack_out"] as const)
        : (["net_touch", "invasion"] as const);
    for (const faultType of faults) {
      const m = newMatch();
      const id = skill === "block" ? project(m).lineup[1] : m.players[0].id;
      const match = append(m, {
        type: "event",
        event: {
          skill,
          playerId: id,
          result: "simple_gafe",
          assessment: {
            ...initialAssessment(skill, "simple_gafe"),
            criteria: { faultType },
          },
        },
      });
      const state = project(match),
        event = state.events[0];
      assert.deepEqual(state.score, [0, 1]);
      assert.equal(state.rally, 2);
      assert.equal(state.events.length, 1);
      assert.equal(assessed(event).error, true);
      if (faultType === "net_touch" || faultType === "invasion")
        assert.equal(assessed(event).quality, 0);
      assert.equal(validPublicSnapshot(publicSnapshot(match)), true);
      assert.deepEqual(project(undo(match)).score, [0, 0]);
      const restored = parseMatch(JSON.stringify(match));
      assert.deepEqual(project(restored).score, [0, 1]);
    }
  }
  assert.ok(criteriaError("set", { faultType: "attack_out" }));
  assert.ok(criteriaError("defense", { faultType: "net_touch" }));
});
test("falta no bloqueio duplo pune o autor e preserva a avaliação do outro participante", () => {
  const m = newMatch(),
    [p1, p2] = project(m).lineup.slice(1, 3);
  const match = append(m, {
    type: "event",
    event: {
      skill: "block",
      result: "simple_gafe",
      playerId: p1,
      participants: [
        { playerId: p1, responsibility: "correct" },
        {
          playerId: p2,
          responsibility: "correct",
          criteria: { blockQuality: "direction" },
        },
      ],
      assessment: {
        ...initialAssessment("block", "simple_gafe"),
        group: "double",
        criteria: { faultType: "net_touch" },
      },
    },
  });
  const e = project(match).events[0];
  assert.equal(assessed(playerEvents([e], p1)[0]).error, true);
  assert.equal(assessed(playerEvents([e], p2)[0]).error, false);
  assert.deepEqual(project(match).score, [0, 1]);
});
test("passou de graça mantém o rally aberto e entra no relatório de tipo de ataque", () => {
  const m = newMatch();
  const match = append(m, {
    type: "event",
    event: {
      skill: "attack",
      playerId: m.players[0].id,
      result: "simple_good",
      assessment: {
        ...initialAssessment("attack", "simple_good"),
        criteria: { attackType: "free" },
      },
    },
  });
  assert.deepEqual(project(match).score, [0, 0]);
  assert.equal(project(match).rally, 1);
  const s = publicSnapshot(match);
  assert.equal(
    distributionFromCube(s.technical!.team, "attackType", "attack").rows.find(
      (r) => r.id === "free",
    )?.count,
    1,
  );
  assert.equal(validPublicSnapshot(s), true);
});
test("largadinha do levantador pontua uma vez e não é herdada como levantamento pelo atacante", () => {
  const m = newMatch();
  const id = m.players[0].id;
  const tip: SkillEvent = {
    ...liveSet(id),
    result: "simple_ours",
    assessment: {
      ...initialAssessment("set", "simple_ours"),
      rallyContext: "auto",
      setDifficultyVersion: 1,
      criteria: { setType: "setter_tip" },
    },
  };
  const match = append(m, { type: "event", event: tip });
  assert.deepEqual(project(match).score, [1, 0]);
  assert.equal(project(match).events.length, 1);
  assert.equal(validPublicSnapshot(publicSnapshot(match)), true);
  assert.deepEqual(project(undo(match)).score, [0, 0]);
  const continuing = append(m, {
    type: "event",
    event: { ...tip, result: "simple_good" },
  });
  assert.equal(
    withRallyContext(project(continuing), liveAttack(id)).assessment?.criteria
      ?.setType,
    undefined,
  );
  assert.ok(criteriaError("attack", { setType: "setter_tip" }));
});
test("tirou da cartola usa dificuldade contextual, respeita manual e aparece no público sem expor eventos", () => {
  for (const skill of ["set", "attack"] as const) {
    const m = newMatch();
    const id = m.players[0].id;
    const e: SkillEvent = {
      skill,
      result: "simple_good",
      playerId: id,
      assessment: {
        ...initialAssessment(skill, "simple_good"),
        tags: ["magic"],
      },
    };
    assert.equal(effectiveDifficulty(e), "emergency");
    assert.equal(
      effectiveDifficulty({
        ...e,
        assessment: {
          ...e.assessment!,
          difficultySource: "manual",
          difficulty: "normal",
        },
      }),
      "normal",
    );
    const match = append(m, { type: "event", event: e });
    const s = publicSnapshot(match);
    assert.equal(validPublicSnapshot(s), true);
    assert.equal(
      distributionFromCube(s.technical!.team, "special", skill).rows.find(
        (r) => r.id === "magic",
      )?.count,
      1,
    );
    assert.equal("audit" in s, false);
    assert.deepEqual(project(match).score, [0, 0]);
  }
});
test("falhas específicas do levantamento dificultam o ataque; erro direto não penaliza o atacante", () => {
  const m = newMatch();
  const id = m.players[0].id;
  for (const incomingSet of ["low", "short", "high_bad"] as const) {
    const e = {
      ...liveAttack(id),
      assessment: {
        ...liveAttack(id).assessment!,
        setDifficultyVersion: 1 as const,
        criteria: { incomingSet, setType: "third" as const },
      },
    };
    assert.equal(effectiveDifficulty(e), "hard");
    assert.equal(assessed(e).rated, true);
    assert.equal(criteriaError("attack", e.assessment.criteria), undefined);
  }
  const e = {
    ...liveAttack(id),
    assessment: {
      ...liveAttack(id).assessment!,
      criteria: { incomingSet: "error" as const },
    },
  };
  assert.equal(assessed(e).rated, false);
  assert.equal(assessed(e).error, false);
  const match = append(m, { type: "event", event: e });
  assert.deepEqual(project(match).score, [0, 0]);
  assert.equal(validPublicSnapshot(publicSnapshot(match)), true);
});
test("pós-jogo por totais preserva versão da dificuldade e usa o mesmo cálculo", () => {
  const game = newPostGame(newMatch());
  const key = countKey(
    "attack",
    "simple_good",
    "normal",
    "",
    { setType: "first", incomingSet: "good" },
    "context",
    1,
  );
  const a = cellAssessment(game, key)!;
  assert.equal(a.setDifficultyVersion, 1);
  assert.equal(
    effectiveDifficulty({
      skill: "attack",
      result: "simple_good",
      assessment: a,
    }),
    "hard",
  );
  const legacyKey = countKey(
    "attack",
    "simple_good",
    "normal",
    "",
    { setType: "china", incomingSet: "good" },
    "context",
  );
  assert.equal(
    cellAssessment(game, legacyKey)?.setDifficultyVersion,
    undefined,
  );
});
test("tipos sugerem dificuldade sem duplicar bônus nem mudar notas anteriores", () => {
  assert.deepEqual(Object.values(setTypeOptions), [
    "Primeiro tempo",
    "Segundo tempo",
    "Terceiro tempo",
    "Cabeça",
    "China",
    "Largadinha do levantador",
  ]);
  for (const skill of ["set", "attack"] as const) {
    const e: SkillEvent = {
      skill,
      result: "simple_good",
      assessment: {
        ...initialAssessment(skill, "simple_good"),
        setDifficultyVersion: 1,
      },
    };
    const good =
      skill === "set"
        ? { incomingPass: "A" as const }
        : { incomingSet: "good" as const };
    const poor =
      skill === "set"
        ? { incomingPass: "C" as const }
        : { incomingSet: "poor" as const };
    for (const type of Object.keys(
      setTypeOptions,
    ) as (keyof typeof setTypeOptions)[]) {
      if (skill === "attack" && type === "setter_tip") continue;
      const typed = {
        ...e,
        assessment: { ...e.assessment!, criteria: { ...good, setType: type } },
      };
      assert.equal(
        effectiveDifficulty(typed),
        type === "third"
          ? "easy"
          : type === "second" || type === "setter_tip"
            ? "normal"
            : "hard",
      );
      assert.equal(
        effectiveDifficulty({
          ...typed,
          assessment: {
            ...typed.assessment,
            criteria: { ...poor, setType: type },
          },
        }),
        "hard",
      );
      assert.equal(
        effectiveDifficulty({
          ...typed,
          assessment: {
            ...typed.assessment,
            difficultySource: "manual",
            difficulty: "normal",
          },
        }),
        "normal",
      );
    }
    const thirdUnknown = {
      ...e,
      assessment: { ...e.assessment!, criteria: { setType: "third" as const } },
    };
    assert.equal(effectiveDifficulty(thirdUnknown), "normal");
    const oldChina = {
      ...e,
      assessment: {
        ...e.assessment!,
        setDifficultyVersion: undefined,
        criteria: { ...good, setType: "china" as const },
      },
    };
    assert.equal(effectiveDifficulty(oldChina), "easy");
  }
});
test("correção do tempo herdado recalcula dificuldade e notas sem mudar o placar", () => {
  let match = newMatch();
  const id = match.players[0].id;
  const setter: SkillEvent = {
    ...liveSet(id),
    assessment: {
      ...liveSet(id).assessment!,
      setDifficultyVersion: 1,
      criteria: { setType: "first" },
    },
  };
  match = append(match, { type: "event", event: setter });
  const attack = {
    ...liveAttack(id),
    assessment: {
      ...liveAttack(id).assessment!,
      setDifficultyVersion: 1 as const,
      criteria: { incomingSet: "good" as const },
    },
  };
  match = append(match, {
    type: "event",
    event: withRallyContext(project(match), attack),
  });
  assert.equal(effectiveDifficulty(project(match).events.at(-1)!), "hard");
  match = correct(
    match,
    match.audit[0].id,
    {
      ...setter,
      assessment: { ...setter.assessment!, criteria: { setType: "third" } },
    },
    "Tempo observado no vídeo",
  );
  assert.equal(effectiveDifficulty(project(match).events.at(-1)!), "easy");
  assert.deepEqual(project(match).score, [0, 0]);
  assert.equal(validPublicSnapshot(publicSnapshot(match)), true);
});
test("ataque herda tipo do último levantamento; correção e desfazer atualizam a mesma bola", () => {
  let match = newMatch();
  const id = match.players[0].id;
  const setter: SkillEvent = {
    ...liveSet(id),
    assessment: { ...liveSet(id).assessment!, criteria: { setType: "chute" } },
  };
  match = append(match, { type: "event", event: setter });
  const setterId = match.audit[0].id;
  const draft = withRallyContext(project(match), liveAttack(id));
  assert.equal(draft.assessment?.criteria?.setType, "chute");
  assert.equal(draft.assessment?.setTypeSource, "rally");
  match = append(match, { type: "event", event: draft });
  match = correct(
    match,
    setterId,
    {
      ...setter,
      assessment: { ...setter.assessment!, criteria: { setType: "meter" } },
    },
    "Tipo corrigido",
  );
  assert.equal(
    project(match).events.at(-1)?.assessment?.criteria?.setType,
    "meter",
  );
  assert.equal(
    project(parseMatch(JSON.stringify(match))).events.at(-1)?.assessment
      ?.criteria?.setType,
    "meter",
  );
  const snapshot = publicSnapshot(match);
  assert.equal(validPublicSnapshot(snapshot), true);
  const distribution = distributionFromCube(
    snapshot.technical!.team,
    "setType",
    "attack",
  );
  assert.equal(distribution.rows.find((r) => r.id === "meter")?.count, 1);
  match = undo(match);
  assert.equal(
    project(match).events.at(-1)?.assessment?.criteria?.setType,
    "chute",
  );
  match = correct(
    match,
    setterId,
    { ...setter, assessment: { ...setter.assessment!, criteria: {} } },
    "Tipo não observado",
  );
  assert.equal(
    project(match).events.at(-1)?.assessment?.criteria?.setType,
    undefined,
  );
  assert.equal(
    project(match).events.at(-1)?.assessment?.setTypeSource,
    undefined,
  );
});
test("tipo automático não atravessa outro toque ou rally e permite informar quando não houve levantamento registrado", () => {
  let match = newMatch();
  const id = match.players[0].id;
  const manual = {
    ...liveAttack(id),
    assessment: {
      ...liveAttack(id).assessment!,
      criteria: { setType: "high" as const },
    },
  };
  assert.equal(
    withRallyContext(project(match), manual).assessment?.criteria?.setType,
    "high",
  );
  match = append(match, {
    type: "event",
    event: {
      ...liveSet(id),
      assessment: {
        ...liveSet(id).assessment!,
        criteria: { setType: "stretched" },
      },
    },
  });
  const inherited = withRallyContext(project(match), liveAttack(id));
  assert.equal(inherited.assessment?.criteria?.setType, "stretched");
  const afterDefense = append(match, {
    type: "event",
    event: {
      skill: "defense",
      result: "simple_good",
      playerId: id,
      assessment: initialAssessment("defense", "simple_good"),
    },
  });
  assert.equal(
    withRallyContext(project(afterDefense), inherited).assessment?.criteria
      ?.setType,
    undefined,
  );
  match = append(match, { type: "point", winner: "ours" });
  assert.equal(
    withRallyContext(project(match), inherited).assessment?.criteria?.setType,
    undefined,
  );
  assert.equal(
    withRallyContext(project(match), inherited).assessment?.setTypeSource,
    undefined,
  );
  const archived = {
    ...manual,
    assessment: { ...manual.assessment, rallyContext: undefined },
  };
  assert.equal(
    withRallyContext(project(match), archived).assessment?.criteria?.setType,
    "high",
  );
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
