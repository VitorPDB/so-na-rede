import {
  criteriaPublication,
  distributionFromCube,
  validCriteriaData,
  analysisFields,
} from "./criteriaStats";
import { publicSnapshot } from "./publicSnapshot";
import { archiveGame } from "./career";
import { parseMatch } from "./storage";

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

test("público recebe agregados equivalentes, sem eventos privados ou média de médias", () => {
  const rows = [
    event("touch"),
    event("bump"),
    event("bump", "simple_gafe"),
    event(),
  ];
  const pub = criteriaPublication(rows, ["p1", "p2"]);
  assert(validCriteriaData(pub));
  for (const field of analysisFields) {
    const actual = distributionFromCube(pub.team, field.key),
      expected = criterionDistribution(analysisParticipations(rows), field.key);
    assert.equal(actual.total, expected.total);
    assert.equal(actual.known, expected.known);
    assert.equal(actual.missing, expected.missing);
    actual.rows.forEach((r, i) => {
      assert.equal(r.count, expected.rows[i].count);
      assert.equal(r.percent, expected.rows[i].percent);
      assert(
        Math.abs((r.rating ?? 0) - (expected.rows[i].rating ?? 0)) < 1e-10,
      );
    });
  }
  assert.equal(distributionFromCube(pub.players[1].data, "technique").known, 0);
  for (const c of pub.team) {
    assert.deepEqual(Object.keys(c).sort(), ["key", "rows", "skill", "total"]);
    for (const r of c.rows)
      assert.deepEqual(Object.keys(r).sort(), [
        "count",
        "id",
        "qualitySum",
        "rated",
      ]);
  }
  assert.equal(
    validCriteriaData({ ...pub, team: [...pub.team, pub.team[0]] }),
    false,
  );
  const invalid = structuredClone(pub);
  invalid.team[0].rows[0].qualitySum = Infinity;
  assert.equal(validCriteriaData(invalid), false);
});
test("publicação separa sets/jogadores, persiste no histórico e corrige/desfaz técnicas", () => {
  let m = append(newMatch(), { type: "event", event: event("touch") });
  const original = m;
  while (!project(m).setFinished)
    m = append(m, { type: "point", winner: "ours" });
  m = append(m, {
    type: "nextSet",
    lineup: m.initialLineup,
    roles: m.initialRoles,
    server: "ours",
  });
  m = append(m, { type: "event", event: { ...event("bump"), playerId: "p2" } });
  const s = publicSnapshot(m);
  assert(validCriteriaData(s.technical));
  assert.equal(
    distributionFromCube(s.periods[0].technical!.team, "technique").leaders[0]
      .id,
    "touch",
  );
  assert.equal(
    distributionFromCube(s.periods[1].technical!.team, "technique").leaders[0]
      .id,
    "bump",
  );
  assert.equal(
    distributionFromCube(
      s.periods[1].technical!.players.find((p) => p.id === "p1")!.data,
      "technique",
    ).known,
    0,
  );
  const restored = parseMatch(
    JSON.stringify({ ...newMatch(), history: archiveGame(m) }),
  );
  assert(validCriteriaData(restored.history![0].publicData!.technical));
  const changed = correct(
    original,
    original.audit[0].id,
    event("bump"),
    "motivo privado",
  );
  assert.equal(
    distributionFromCube(publicSnapshot(changed).technical!.team, "technique")
      .leaders[0].id,
    "bump",
  );
  assert(!JSON.stringify(publicSnapshot(changed)).includes("motivo privado"));
  assert.equal(
    distributionFromCube(
      publicSnapshot(undo(changed)).technical!.team,
      "technique",
    ).leaders[0].id,
    "touch",
  );
});

test("direção de ataque permanece após backup e desfazer, sem alterar nota", () => {
  let m = newMatch();
  const a = normalAssessment();
  a.criteria = { attackDirection: "cross" };
  const action: SkillEvent = {
    skill: "attack",
    result: "simple_good",
    playerId: "p1",
    assessment: a,
  };
  m = append(m, { type: "event", event: action });
  const loaded = parseMatch(JSON.stringify(m));
  assert.equal(
    project(loaded).events[0].assessment?.criteria?.attackDirection,
    "cross",
  );
  const dist = distributionFromCube(
    criteriaPublication(project(loaded).events, ["p1"]).players[0].data,
    "attackDirection",
    "attack",
  );
  assert.equal(dist.known, 1);
  assert.equal(dist.leaders[0].id, "cross");
  assert.equal(
    criterionDistribution(
      [{ ...action, assessment: { ...a, criteria: {} } }],
      "attackDirection",
    ).known,
    0,
  );
  assert.equal(
    criteriaPublication(project(undo(loaded)).events, [
      "p1",
    ]).players[0].data.find((c) => c.key === "attackDirection")?.total ?? 0,
    0,
  );
  const other = append(newMatch(), {
    type: "event",
    event: {
      ...action,
      assessment: { ...a, criteria: { attackDirection: "line" } },
    },
  });
  assert.equal(
    publicSnapshot(other).players[0].stats.rating,
    publicSnapshot(m).players[0].stats.rating,
  );
});

test("atlas usa os mesmos dados locais e publicados, sem inventar tendência em empate", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { FoundationAtlas } = await import("./FoundationAtlas");
  const rows: SkillEvent[] = ["line", "cross"].map((direction) => ({
    ...event(),
    skill: "attack",
    assessment: {
      ...normalAssessment(),
      criteria: {
        attackDirection: direction as "line" | "cross",
        attackBlockers: "double",
        attackType: "power",
      },
    },
  }));
  const cube = criteriaPublication(rows, ["p1"]);
  const local = renderToStaticMarkup(
    createElement(FoundationAtlas, {
      skill: "attack",
      period: "Teste",
      distribution: (skill, key) =>
        criterionDistribution(
          rows.filter((e) => e.skill === skill),
          key,
        ),
    }),
  );
  const published = renderToStaticMarkup(
    createElement(FoundationAtlas, {
      skill: "attack",
      period: "Teste",
      distribution: (skill, key) => distributionFromCube(cube.team, key, skill),
    }),
  );
  assert.equal(local, published);
  assert.match(local, /Paralela \/ Diagonal/);
  assert.match(local, /empate/);
  assert.doesNotMatch(local, /class="fv-trajectory"/);
  assert.equal((local.match(/fv-opponent/g) ?? []).length, 2);
});

test("atlas vazio não inventa bloqueio ou direção; com marcação a paralela é reta", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { FoundationAtlas } = await import("./FoundationAtlas");
  const empty = renderToStaticMarkup(
    createElement(FoundationAtlas, {
      skill: "attack",
      period: "Teste",
      distribution: (_, key) => criterionDistribution([], key),
    }),
  );
  assert.match(empty, /Sem informação/);
  assert.doesNotMatch(empty, /fv-opponent|class="fv-trajectory"/);
  const { FoundationCourt } = await import("./FoundationCourt");
  const line = renderToStaticMarkup(
    createElement(FoundationCourt, {
      skill: "attack",
      blockers: 0,
      direction: "line",
    }),
  );
  assert.match(line, /M188 170 L230 112/);
  assert.doesNotMatch(line, /fv-opponent/);
});
