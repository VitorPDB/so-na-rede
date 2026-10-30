import test from "node:test";
import { normalAssessment } from "./assessment";
import assert from "node:assert/strict";
import { append, correct, project, rotate, stats, undo } from "./engine";
import {
  newMatch as makeNewMatch,
  simpleSkills,
  ratingProfiles,
  p1Roles,
  type Zone,
} from "./model";
import { assignToZone } from "./engine";
import { parseMatch, saveMatch, loadMatch } from "./storage";
import { formationAt, toP1 } from "./formation";
import { publicMedia, publicSnapshot } from "./publicSnapshot";
import {
  archivePostGame,
  emptyPostSet,
  newPostGame,
  postGameErrors,
  postSummary,
} from "./postgame";
import {
  newDetailedDraft,
  replayDetailed,
  validDetailedDraft,
} from "./postgameDetailed";

test("recarregar recupera todas as ações sem transmissão e restaura cópia ausente ou corrompida", () => {
  const values = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }});
  try {
    let match = makeNewMatch();
    for (let n = 0; n < 12; n++) {
      const next = append(match, {type:"point", winner:n % 2 ? "theirs" : "ours"});
      saveMatch(next, n ? match : undefined);
      match = next;
    }
    assert.deepEqual(loadMatch(), match);
    values.set("so-na-rede:match:v1", "{broken");
    assert.deepEqual(loadMatch(), match);
    values.delete("so-na-rede:match:v1");
    assert.deepEqual(loadMatch(), match);
    assert.deepEqual(project(loadMatch()!).score, [6,6]);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("falha na cópia redundante não perde salvamento principal; dados ilegíveis permanecem intactos", () => {
  const values = new Map<string, string>();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (key.endsWith(":backup")) throw new Error("quota");
      values.set(key, value);
    },
  }});
  try {
    const match = makeNewMatch();
    saveMatch(match);
    assert.deepEqual(loadMatch(), match);
    values.set("so-na-rede:match:v1", "{broken");
    assert.throws(() => loadMatch());
    assert.equal(values.get("so-na-rede:match:v1"), "{broken");
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("craque é salvo com quota cheia liberando somente o checkpoint idêntico", () => {
  const key = "so-na-rede:match:v1", backup = key + ":backup";
  const original = makeNewMatch();
  const raw = JSON.stringify(original);
  const next = { ...original, socialHighlightPlayerId: original.players[0].id };
  const values = new Map([[key, raw], [backup, raw]]);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let limit = raw.length * 2;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (k: string) => values.get(k) ?? null,
    removeItem: (k: string) => values.delete(k),
    setItem: (k: string, v: string) => {
      const size = [...values].reduce((n, [id, s]) => n + (id === k ? 0 : s.length), v.length);
      if (size > limit) throw new DOMException("quota", "QuotaExceededError");
      values.set(k, v);
    },
  }});
  try {
    saveMatch(next, original);
    assert.deepEqual(loadMatch(), next);
    assert.equal(values.has(backup), false);
    // If even the main copy cannot fit, the original primary copy survives.
    values.set(key, raw); values.set(backup, raw);
    limit = 1;
    assert.throws(() => saveMatch(next, original), { name: "QuotaExceededError" });
    assert.equal(values.get(key), raw);
    assert.deepEqual(loadMatch(), original);
    // A different recovery copy must never be discarded to free space.
    const other = JSON.stringify(makeNewMatch());
    values.set(backup, other);
    assert.throws(() => saveMatch(next, original), { name: "QuotaExceededError" });
    assert.equal(values.get(backup), other);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("importação preserva eventos e descarta relatórios derivados do JSON antigo", () => {
  const match = append(makeNewMatch(), { type: "point", winner: "ours" });
  const loaded = parseMatch(JSON.stringify({ ...match, projection: project(match), report: { redundant: "x".repeat(10000) } }));
  assert.deepEqual(loaded, match);
  assert.deepEqual(project(loaded), project(match));
});

test("totais pós-jogo calculam notas por função/set e entram no histórico sem alterar o jogo ao vivo", () => {
  const live = makeNewMatch();
  const draft = newPostGame(live);
  draft.bestOf = 3;
  draft.opponent = "Teste";
  draft.sets = [emptyPostSet(live), emptyPostSet(live)];
  draft.sets.forEach((s) => (s.score = [25, 10]));
  const playerId = live.players[0].id;
  const first = draft.sets[0].rows.find((r) => r.playerId === playerId)!;
  first.role = "opposite";
  first.counts = { "attack:simple_good": 9, "attack:simple_gafe": 1 };
  const second = draft.sets[1].rows.find((r) => r.playerId === playerId)!;
  second.role = "outside";
  second.counts = { "defense:simple_good": 4, "attack:simple_ours": 2 };
  assert.deepEqual(postGameErrors(draft, live, true), []);
  assert.equal(
    postSummary(draft, live, 1).players.find((p) => p.player.id === playerId)
      ?.count,
    10,
  );
  assert.equal(
    postSummary(draft, live).players.find((p) => p.player.id === playerId)
      ?.count,
    16,
  );
  const game = archivePostGame(draft, live);
  assert.deepEqual(game.sets, [2, 0]);
  assert.equal(
    game.players.find((p) => p.playerId === playerId)?.roleStats?.outside
      ?.count,
    6,
  );
  const next = { ...live, postGameDraft: draft, history: [game] };
  assert.deepEqual(project(next), project(live));
  assert.deepEqual(
    parseMatch(JSON.stringify(next)).history?.[0].postGame,
    draft,
  );
  assert.equal(
    playerCareer(next, playerId).average,
    game.players.find((p) => p.playerId === playerId)?.rating,
  );
  draft.sets[0].rows[0].counts = { "attack:simple_ours": 26 };
  assert.ok(
    postGameErrors(draft, live, true).some((e) => e.includes("ultrapassam")),
  );
  draft.sets[0].rows[0].counts = { "attack:simple_good": -1 };
  assert.ok(postGameErrors(draft, live).length);
});

test("ficha completa reproduz rotação, notas, tempos, trocas, líbero e timestamps, sem inventar rallies", () => {
  const source = makeNewMatch();
  const draft = newDetailedDraft(source);
  draft.bestOf = 3;
  draft.opponent = "Teste";
  let live: import("./model").Match = {
    ...source,
    id: draft.id,
    bestOf: 3,
    opponent: "Teste",
  };
  const add = (command: import("./model").Command) => {
    live = append(live, command);
    const id = live.audit.at(-1)!.id;
    draft.rows.push({ id, command });
  };
  add({ type: "timeout", side: "ours" });
  add({
    type: "event",
    event: {
      playerId: live.initialLineup[1],
      skill: "attack",
      result: "simple_theirs",
      touch: 3,
      zone: 2,
      videoTimestampMs: 12000,
    },
  });
  add({
    type: "event",
    event: {
      playerId: live.initialLineup[1],
      skill: "attack",
      result: "simple_ours",
    },
  });
  const outgoing = project(live).lineup[0];
  const incoming = live.players.find(
    (p) => !p.libero && !project(live).lineup.includes(p.id),
  )!.id;
  add({ type: "sub", outgoing, incoming });
  add({ type: "libero", playerId: "p10", replaced: project(live).lineup[4] });
  add({ type: "point", winner: "ours" });
  add({ type: "libero" });
  add({ type: "autoLibero", enabled: true });
  while (!project(live).setFinished) add({ type: "point", winner: "ours" });
  add({
    type: "nextSet",
    lineup: source.initialLineup,
    roles: source.initialRoles,
    server: "theirs",
  });
  add({
    type: "event",
    event: {
      playerId: source.initialLineup[1],
      skill: "reception",
      result: "+",
      touch: 1,
    },
  });
  add({ type: "point", winner: "ours" });
  while (!project(live).finished) add({ type: "point", winner: "ours" });
  assert.equal(validDetailedDraft(draft, source), true);
  const built = replayDetailed(draft, source);
  assert.equal(built.error, "");
  const actual = project(built.match),
    expected = project(live);
  assert.deepEqual(actual.score, expected.score);
  assert.deepEqual(actual.sets, expected.sets);
  assert.deepEqual(actual.lineup, expected.lineup);
  assert.equal(actual.rallies.length, expected.rallies.length);
  assert.equal(actual.markers.length, expected.markers.length);
  assert.equal(actual.events[0].videoTimestampMs, 12000);
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        stats(actual.events, source.weights, source.ratingProfiles),
      ),
    ),
    JSON.parse(
      JSON.stringify(
        stats(expected.events, source.weights, source.ratingProfiles),
      ),
    ),
  );
  assert.deepEqual(
    project(parseMatch(JSON.stringify({ ...source, detailedDraft: draft }))),
    project(source),
  );
  const invalid = {
    ...draft,
    rows: [
      {
        id: "bad",
        command: { type: "sub" as const, outgoing: "unknown", incoming: "p1" },
      },
    ],
  };
  assert.equal(validDetailedDraft(invalid, source), false);
  const cached = replayDetailed(draft, source, {
    draft,
    source,
    match: built.match,
  });
  assert.deepEqual(project(cached.match), actual);
});

test("ficha completa aponta linha inválida e totais validam tie-break e fim da partida", () => {
  const source = makeNewMatch();
  const draft = newDetailedDraft(source);
  draft.rows = [
    {
      id: "bad",
      command: {
        type: "nextSet",
        lineup: draft.lineup,
        roles: draft.roles,
        server: "ours",
      },
    },
  ];
  const value = replayDetailed(draft, source);
  assert.equal(value.failedRow, 0);
  assert.ok(value.error.includes("Linha 1"));
  const g = newPostGame(source);
  g.opponent = "Teste";
  g.sets = Array.from({ length: 5 }, () => emptyPostSet(source));
  g.sets.forEach((s, i) => (s.score = i % 2 === 0 ? [25, 10] : [10, 25]));
  g.sets[4].score = [15, 13];
  assert.deepEqual(postGameErrors(g, source, true), []);
  g.sets[4].score = [15, 14];
  assert.ok(postGameErrors(g, source, true).length);
});

test("reiniciar set retira ações, tempos, trocas e notas, restaurando início sem apagar auditoria", () => {
  const base = makeNewMatch();
  let m = append(base, {
    type: "sub",
    outgoing: base.initialLineup[0],
    incoming: "p7",
  });
  m = append(m, { type: "timeout", side: "ours" });
  m = append(m, {
    type: "event",
    event: { playerId: "p7", skill: "attack", result: "simple_ours" },
  });
  m = append(m, {
    type: "event",
    event: {
      playerId: base.initialLineup[1],
      skill: "defense",
      result: "simple_gafe",
    },
  });
  const before = project(m),
    count = m.audit.length;
  const reset = append(m, { type: "restartSet" }),
    state = project(reset);
  assert.equal(reset.id, m.id);
  assert.equal(reset.audit.length, count + 1);
  assert.deepEqual(state.score, [0, 0]);
  assert.deepEqual(state.lineup, base.initialLineup);
  assert.equal(state.server, base.initialServer);
  assert.equal(state.events.length, 0);
  assert.equal(state.rallies.length, 0);
  assert.equal(state.markers.length, 0);
  assert.equal(state.substitutions, 0);
  assert.equal(stats(state.events, m.weights).rating, null);
  assert.equal(
    publicSnapshot(reset).players.every(
      (p) => p.stats.rating === null && p.stats.count === 0,
    ),
    true,
  );
  assert.deepEqual(project(parseMatch(JSON.stringify(reset))), state);
  assert.deepEqual(project(undo(reset)).score, before.score);
  assert.equal(project(undo(reset)).events.length, before.events.length);
  assert.throws(
    () =>
      correct(
        reset,
        m.audit[2].id,
        { playerId: "p7", skill: "attack", result: "simple_good" },
        "Não reativar",
      ),
    /ativa/,
  );
});

test("reiniciar segundo set mantém placar, pontos e notas do primeiro; remove só notas do segundo", () => {
  const base = makeNewMatch();
  let m = base;
  for (let i = 0; i < 25; i++)
    m = append(m, {
      type: "event",
      event: {
        playerId: base.initialLineup[0],
        skill: "attack",
        result: "simple_ours",
      },
    });
  const firstStats = publicSnapshot(m).players;
  m = append(m, {
    type: "nextSet",
    lineup: base.initialLineup,
    roles: base.initialRoles,
    server: "theirs",
  });
  m = append(m, {
    type: "event",
    event: {
      playerId: base.initialLineup[1],
      skill: "defense",
      result: "simple_theirs",
    },
  });
  m = append(m, { type: "restartSet" });
  const s = project(m);
  assert.equal(s.set, 2);
  assert.deepEqual(s.sets, [1, 0]);
  assert.deepEqual(s.score, [0, 0]);
  assert.equal(s.server, "theirs");
  assert.equal(s.events.length, 25);
  assert.equal(
    s.events.every((e) => e.set === 1),
    true,
  );
  assert.deepEqual(
    publicSnapshot(m).players.map((p) => p.stats),
    firstStats.map((p) => p.stats),
  );
  assert.deepEqual(project(parseMatch(JSON.stringify(m))), s);
});

test("reiniciar set final reabre partida e remove vitória; reinício restaura líbero e aceita nova marcação", () => {
  const base: import("./model").Match = { ...makeNewMatch(), bestOf: 3 };
  let m = base;
  for (let set = 1; set <= 2; set++) {
    for (let i = 0; i < 25; i++)
      m = append(m, { type: "point", winner: "ours" });
    if (set === 1)
      m = append(m, {
        type: "nextSet",
        lineup: base.initialLineup,
        server: "ours",
      });
  }
  assert.equal(project(m).finished, true);
  m = append(m, { type: "restartSet" });
  assert.equal(project(m).finished, false);
  assert.deepEqual(project(m).sets, [1, 0]);
  assert.equal(project(m).completed.length, 1);
  m = append(m, { type: "point", winner: "theirs" });
  assert.deepEqual(project(m).score, [0, 1]);
  let libero = append(makeNewMatch(), {
    type: "libero",
    playerId: "p10",
    replaced: makeNewMatch().initialLineup[4],
  });
  assert.ok(project(libero).libero);
  libero = append(libero, { type: "restartSet" });
  assert.equal(project(libero).libero, undefined);
  assert.deepEqual(project(libero).lineup, makeNewMatch().initialLineup);
});

test("publicação calcula nota e placar sem expor auditoria, fotos ou configurações", () => {
  let m = makeNewMatch();
  m.players[0].photo = {
    dataUrl: "data:image/jpeg;base64,PRIVATEPHOTO",
    x: 50,
    y: 50,
    zoom: 1,
  };
  m = append(m, {
    type: "event",
    event: {
      playerId: m.initialLineup[0],
      skill: "attack",
      result: "simple_ours",
    },
  });
  const published = publicSnapshot(m);
  assert.deepEqual(published.score, project(m).score);
  assert.equal(
    published.players.find((p) => p.id === m.initialLineup[0])?.stats.rating,
    stats(project(m).events, m.weights, m.ratingProfiles ?? ratingProfiles)
      .rating,
  );
  const json = JSON.stringify(published);
  for (const field of [
    "audit",
    "history",
    "weights",
    "ratingProfiles",
    "PRIVATEPHOTO",
    "password",
  ])
    assert.equal(json.includes(field), false);
  assert.equal(
    publicMedia(m).photos[m.players[0].id].dataUrl.includes("PRIVATEPHOTO"),
    true,
  );
});

test("correções e desfazer recompõem o placar publicado sem duplicar pontos", () => {
  const base = makeNewMatch();
  let m = append(base, {
    type: "event",
    event: {
      playerId: base.initialLineup[0],
      skill: "attack",
      result: "simple_ours",
    },
  });
  m = correct(
    m,
    m.audit[0].id,
    {
      playerId: base.initialLineup[0],
      skill: "attack",
      result: "simple_theirs",
    },
    "Correção privada",
  );
  assert.deepEqual(publicSnapshot(m).score, [0, 1]);
  assert.equal(publicSnapshot(m).rallies.length, 1);
  assert.equal(
    JSON.stringify(publicSnapshot(m)).includes("Correção privada"),
    false,
  );
  m = undo(m);
  assert.deepEqual(publicSnapshot(m).score, [1, 0]);
  m = undo(m);
  assert.deepEqual(publicSnapshot(m).score, [0, 0]);
  assert.equal(publicSnapshot(m).rallies.length, 0);
});
// Existing regression fixtures use the original lineup to exercise old backups.
const newMatch = () => {
  const { initialRoles, ...match } = makeNewMatch();
  return { ...match, initialLineup: ["p1", "p2", "p3", "p4", "p5", "p6"] };
};

test("elenco real, posições ordenadas e Liam como líbero", () => {
  const m = newMatch();
  assert.equal(m.players.length, 10);
  assert.deepEqual(m.players[0].positions, ["Oposto", "Central", "Levantador"]);
  assert.equal(m.players.find((p) => p.number === 1)?.name, "Liam");
  assert.equal(m.players.find((p) => p.number === 1)?.libero, true);
});
test("side-out roda; ponto com nosso saque mantém formação; seis rotações retornam", () => {
  let m = newMatch();
  const original = [...m.initialLineup];
  for (let i = 0; i < 6; i++) {
    m = append(m, { type: "point", winner: "theirs" });
    const before = project(m);
    m = append(m, { type: "point", winner: "ours" });
    assert.deepEqual(project(m).lineup, rotate(before.lineup));
  }
  assert.deepEqual(project(m).lineup, original);
  const before = project(m);
  m = append(m, { type: "point", winner: "ours" });
  assert.deepEqual(project(m).lineup, before.lineup);
  assert.equal(project(m).rotation, 1);
});
test("desfazer restaura placar, saque, rotação, estatísticas sem apagar auditoria", () => {
  let m = newMatch();
  m = append(m, { type: "point", winner: "theirs" });
  const before = project(m);
  m = append(m, {
    type: "event",
    event: { skill: "attack", result: "kill", playerId: before.lineup[2] },
  });
  assert.equal(project(m).events.length, 1);
  m = undo(m);
  const after = project(m);
  assert.deepEqual(after.score, before.score);
  assert.equal(after.server, before.server);
  assert.deepEqual(after.lineup, before.lineup);
  assert.equal(after.events.length, 0);
  assert.equal(m.audit.length, 3);
});
test("24–24 precisa diferença de dois; bloqueia ponto após set; novo set zera formação", () => {
  let m = newMatch();
  for (let i = 0; i < 24; i++) {
    m = append(m, { type: "point", winner: "ours" });
    m = append(m, { type: "point", winner: "theirs" });
  }
  m = append(m, { type: "point", winner: "ours" });
  assert.equal(project(m).setFinished, false);
  m = append(m, { type: "point", winner: "ours" });
  assert.equal(project(m).setFinished, true);
  assert.deepEqual(project(m).score, [26, 24]);
  assert.throws(() => append(m, { type: "point", winner: "ours" }));
  m = append(m, { type: "nextSet", lineup: m.initialLineup, server: "theirs" });
  assert.equal(project(m).set, 2);
  assert.deepEqual(project(m).score, [0, 0]);
  assert.equal(project(m).rotation, 1);
});
test("melhor de cinco: tie-break até 15 e encerramento em três sets", () => {
  let m = newMatch();
  for (const winner of ["ours", "theirs", "ours", "theirs"] as const) {
    for (let i = 0; i < 25; i++) m = append(m, { type: "point", winner });
    m = append(m, { type: "nextSet", lineup: m.initialLineup, server: "ours" });
  }
  for (let i = 0; i < 14; i++) m = append(m, { type: "point", winner: "ours" });
  assert.equal(project(m).finished, false);
  m = append(m, { type: "point", winner: "ours" });
  assert.equal(project(m).finished, true);
  assert.deepEqual(project(m).sets, [3, 2]);
  assert.throws(() =>
    append(m, { type: "nextSet", lineup: m.initialLineup, server: "ours" }),
  );
  m = undo(m);
  assert.equal(project(m).finished, false);
  assert.deepEqual(project(m).sets, [2, 2]);
});
test("correção recalcula side-out e pode ser desfeita; original preservado", () => {
  let m = newMatch();
  m = append(m, {
    type: "event",
    event: { playerId: "p1", skill: "attack", result: "kill" },
  });
  const id = m.audit[0].id;
  m = correct(
    m,
    id,
    { playerId: "p1", skill: "attack", result: "error" },
    "Árbitro sinalizou fora",
  );
  assert.deepEqual(project(m).score, [0, 1]);
  assert.equal(
    m.audit[0].command?.type === "event" && m.audit[0].command.event.result,
    "kill",
  );
  m = undo(m);
  assert.deepEqual(project(m).score, [1, 0]);
});
test("correção que invalida saque posterior exige desfazer dependências", () => {
  let m = newMatch();
  m = append(m, {
    type: "event",
    event: { playerId: "p1", skill: "attack", result: "kill" },
  });
  const id = m.audit[0].id;
  m = append(m, {
    type: "event",
    event: { playerId: "p1", skill: "serve", result: "ace" },
  });
  assert.throws(
    () =>
      correct(
        m,
        id,
        { playerId: "p1", skill: "attack", result: "error" },
        "Correção",
      ),
    /incompatível/,
  );
});
test("líbero entra no fundo e retorna automaticamente antes da rede", () => {
  let m = newMatch();
  m = append(m, { type: "libero", playerId: "p10", replaced: "p5" });
  assert.equal(project(m).lineup[4], "p10");
  assert.throws(() => append(m, { type: "libero" }), /rally completo/);
  m = append(m, { type: "point", winner: "theirs" });
  m = append(m, { type: "point", winner: "ours" });
  assert.equal(project(m).libero, undefined);
  assert.equal(project(m).lineup[3], "p5");
  assert.throws(
    () =>
      append(newMatch(), { type: "libero", playerId: "p10", replaced: "p1" }),
    /não pode sacar/,
  );
});
test("substituição preserva zona e retorno apenas no mesmo par", () => {
  let m = newMatch();
  m = append(m, { type: "sub", outgoing: "p2", incoming: "p7" });
  assert.equal(project(m).lineup[1], "p7");
  assert.throws(
    () => append(m, { type: "sub", outgoing: "p7", incoming: "p8" }),
    /mesmo par/,
  );
  m = append(m, { type: "sub", outgoing: "p7", incoming: "p2" });
  assert.equal(project(m).lineup[1], "p2");
  assert.throws(
    () => append(m, { type: "sub", outgoing: "p2", incoming: "p8" }),
    /já retornou/,
  );
});
test("evento em jogo não soma ponto; metadados incluem set rally rotação lado do saque", () => {
  let m = newMatch();
  m = append(m, {
    type: "event",
    event: {
      playerId: "p2",
      skill: "reception",
      result: "+",
      touch: 1,
      zone: 6,
      videoTimestampMs: 2300,
    },
  });
  const s = project(m);
  assert.deepEqual(s.score, [0, 0]);
  assert.equal(s.rally, 1);
  assert.equal(s.events[0].touch, 1);
  assert.equal(s.events[0].videoTimestampMs, 2300);
  assert.equal(s.events[0].serving, "ours");
});
test("rating não inventa nota; limites 0–10; erros adversários não afetam nota", () => {
  const m = newMatch();
  assert.equal(stats([], m.weights).rating, null);
  const kills = Array.from({ length: 50 }, () => ({
    skill: "attack" as const,
    result: "kill",
    playerId: "p1",
  }));
  assert.ok(stats(kills, m.weights).rating! > 9);
  assert.ok(stats(kills, m.weights).rating! <= 10);
  const errors = kills.map((e) => ({ ...e, result: "error" }));
  assert.ok(stats(errors, m.weights).rating! < 1);
  assert.ok(stats(errors, m.weights).rating! >= 0);
  assert.equal(
    stats([{ skill: "opponent", result: "error" }], m.weights).rating,
    null,
  );
});
test("serialização JSON mantém estado e trilha de auditoria", () => {
  let m = newMatch();
  m = append(m, { type: "point", winner: "theirs" });
  m = append(m, { type: "point", winner: "ours" });
  m = undo(m);
  const restored = JSON.parse(JSON.stringify(m));
  assert.deepEqual(project(restored), project(m));
});
test("backup válido é restaurável; esquema e formação inválidos são rejeitados", () => {
  const m = newMatch();
  assert.deepEqual(parseMatch(JSON.stringify(m)), m);
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...m,
        initialLineup: ["p1", "p1", "p3", "p4", "p5", "p6"],
      }),
    ),
  );
  assert.throws(() =>
    parseMatch(JSON.stringify({ ...m, weights: { ...m.weights, attack: -1 } })),
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...m,
        players: m.players.map((p) => ({ ...p, positions: undefined })),
      }),
    ),
  );
  const played = append(m, {
    type: "event",
    event: { playerId: "p1", skill: "serve", result: "ace" },
  });
  assert.deepEqual(
    project(parseMatch(JSON.stringify(played))),
    project(played),
  );
});
test("alteração de outra aba bloqueia sobrescrita de jogo em andamento", () => {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
    },
  });
  const original = newMatch();
  saveMatch(original);
  const newer = append(original, { type: "point", winner: "ours" });
  saveMatch(newer, original);
  assert.throws(
    () =>
      saveMatch(
        append(original, { type: "point", winner: "theirs" }),
        original,
      ),
    /outra aba/,
  );
  assert.equal(memory.values().next().value, JSON.stringify(newer));
});
test("modo simples: Bom e Gafe continuam o rally nos cinco fundamentos", () => {
  for (const skill of simpleSkills) {
    let match = newMatch();
    const playerId = skill === "block" ? "p2" : "p1";
    match = append(match, {
      type: "event",
      event: { skill, playerId, result: "simple_good" },
    });
    match = append(match, {
      type: "event",
      event: { skill, playerId, result: "simple_gafe" },
    });
    assert.deepEqual(project(match).score, [0, 0]);
    assert.equal(project(match).rally, 1);
    assert.equal(project(match).events.length, 2);
    assert.equal(stats(project(match).events, match.weights).errors, 1);
    assert.deepEqual(
      project(parseMatch(JSON.stringify(match))),
      project(match),
    );
  }
});
test("modo simples: Ponto nosso/deles fecha o rally e preserva o resultado no backup", () => {
  for (const skill of simpleSkills) {
    for (const side of ["ours", "theirs"] as const) {
      let match = newMatch();
      const playerId = skill === "block" ? "p2" : "p1";
      match = append(match, {
        type: "event",
        event: { skill, playerId, result: `simple_${side}` },
      });
      assert.deepEqual(project(match).score, side === "ours" ? [1, 0] : [0, 1]);
      assert.equal(project(match).rally, 2);
      assert.deepEqual(
        project(parseMatch(JSON.stringify(match))),
        project(match),
      );
      assert.deepEqual(project(undo(match)).score, [0, 0]);
    }
  }
});
test("mini quadra troca jogadores de qualquer posição sem duplicar titulares", () => {
  let match = newMatch();
  const swapped = assignToZone(match.initialLineup, 1, "p5"); // levantador ↔ oposto
  assert.equal(swapped[0], "p5");
  assert.equal(swapped[4], "p1");
  assert.equal(new Set(swapped).size, 6);
  const fromBench = assignToZone(swapped, 1, "p7"); // central no lugar do levantador
  match = append(match, { type: "setup", lineup: fromBench, server: "ours" });
  assert.equal(project(match).lineup[0], "p7");
  match = append(match, { type: "sub", outgoing: "p7", incoming: "p5" });
  assert.equal(project(match).lineup[0], "p5");
});

test("P1–P6: setter zone, opposites, unique athletes and complete cycle", () => {
  const m = makeNewMatch();
  for (const p of [1, 2, 3, 4, 5, 6] as Zone[]) {
    const f = formationAt(m.initialLineup, p);
    assert.equal(f.lineup[p - 1], "p5");
    assert.equal(f.roles[p - 1], "setter");
    assert.equal(f.roles[(p + 2) % 6], "opposite");
    assert.equal(new Set(f.lineup).size, 6);
    assert.deepEqual(toP1(f.lineup, p), m.initialLineup);
    let game = append(m, { type: "setup", ...f, server: "theirs" });
    game = append(game, { type: "point", winner: "ours" });
    const next = formationAt(m.initialLineup, (p === 1 ? 6 : p - 1) as Zone);
    assert.deepEqual(project(game).lineup, next.lineup);
    assert.deepEqual(project(game).roles, next.roles);
    assert.deepEqual(project(undo(game)).roles, f.roles);
  }
});

test("substitute inherits tactical role; libero events keep their own role", () => {
  let m = makeNewMatch();
  m = append(m, { type: "sub", outgoing: "p2", incoming: "p7" });
  m = append(m, {
    type: "event",
    event: { playerId: "p7", skill: "reception", result: "simple_good" },
  });
  assert.equal(project(m).events[0].role, "outside");
  m = append(m, { type: "point", winner: "theirs" });
  m = append(m, { type: "libero", playerId: "p10", replaced: "p4" });
  m = append(m, {
    type: "event",
    event: { playerId: "p10", skill: "defense", result: "good" },
  });
  assert.equal(project(m).events[1].role, "libero");
  assert.deepEqual(
    project(parseMatch(JSON.stringify(m))).events,
    project(m).events,
  );
});

test("role rating favors expected responsibility, never action volume or absent skills", () => {
  const actions = [
    ...Array.from({ length: 8 }, () => ({
      skill: "set" as const,
      result: "good",
    })),
    ...Array.from({ length: 8 }, () => ({
      skill: "reception" as const,
      result: "E",
    })),
  ];
  const m = makeNewMatch();
  const setter = stats(
    actions.map((e) => ({ ...e, role: "setter" as const })),
    m.weights,
    ratingProfiles,
  );
  const outside = stats(
    actions.map((e) => ({ ...e, role: "outside" as const })),
    m.weights,
    ratingProfiles,
  );
  assert.ok(setter.rating! > outside.rating!);
  const rec = [
    { skill: "reception" as const, result: "+", role: "middle" as const },
  ];
  const a = stats(rec, m.weights, ratingProfiles);
  const b = stats(rec, m.weights, {
    ...ratingProfiles,
    middle: { ...ratingProfiles.middle, attack: 100, block: 100 },
  });
  assert.equal(a.rating, b.rating);
  assert.equal(stats([], m.weights, ratingProfiles).rating, null);
});

test("formation library and role weights persist; invalid extras rejected", () => {
  const m = {
    ...makeNewMatch(),
    formations: [
      { id: "main", name: "Principal", lineup: makeNewMatch().initialLineup },
    ],
    ratingProfiles,
  };
  assert.deepEqual(parseMatch(JSON.stringify(m)), m);
  assert.throws(() =>
    parseMatch(JSON.stringify({ ...m, initialRoles: ["setter"] })),
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...m,
        formations: [{ ...m.formations[0], lineup: ["p1"] }],
      }),
    ),
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...m,
        ratingProfiles: {
          ...ratingProfiles,
          setter: { ...ratingProfiles.setter, set: -1 },
        },
      }),
    ),
  );
});

import { archiveGame, gameSnapshot, playerCareer } from "./career";

test("Akira keeps assigned setter role even though his preferred position is outside", () => {
  let match = makeNewMatch();
  const lineup = assignToZone(match.initialLineup, 1, "p2");
  match = append(match, {
    type: "setup",
    lineup,
    roles: [...p1Roles],
    server: "ours",
  });
  assert.equal(
    match.players.find((p) => p.id === "p2")!.positions[0],
    "Ponteiro",
  );
  assert.equal(
    project(match).roles[project(match).lineup.indexOf("p2")],
    "setter",
  );
  match = append(match, {
    type: "event",
    event: { playerId: "p2", skill: "set", result: "simple_good" },
  });
  assert.equal(project(match).events[0].role, "setter");
  assert.equal(project(parseMatch(JSON.stringify(match))).roles[0], "setter");
});

test("simple defense is separate from reception and Bom/Gafe do not score", () => {
  let match = makeNewMatch();
  for (const result of ["simple_good", "simple_gafe"])
    match = append(match, {
      type: "event",
      event: { playerId: "p5", skill: "defense", result },
    });
  assert.deepEqual(project(match).score, [0, 0]);
  const summary = stats(project(match).events, match.weights, ratingProfiles);
  assert.equal(summary.list.find((m) => m.skill === "defense")!.count, 2);
  assert.equal(summary.list.find((m) => m.skill === "reception")!.count, 0);
  assert.deepEqual(project(parseMatch(JSON.stringify(match))), project(match));
});

function finishedFixture(result: "good" | "bad", opponent: string) {
  let match: ReturnType<typeof makeNewMatch> = {
    ...makeNewMatch(),
    bestOf: 3,
    opponent,
  };
  match = append(match, {
    type: "event",
    event: { playerId: "p5", skill: "set", result },
  });
  for (let set = 0; set < 2; set++) {
    for (let point = 0; point < 25; point++)
      match = append(match, { type: "point", winner: "ours" });
    if (set === 0)
      match = append(match, {
        type: "nextSet",
        lineup: match.initialLineup,
        roles: match.initialRoles,
        server: "ours",
      });
  }
  return match;
}

test("career deduplicates current game, excludes unfinished matches and preserves archived grades", () => {
  const good = finishedFixture("good", "Time A");
  const bad = finishedFixture("bad", "Time B");
  const partial = makeNewMatch();
  const history = [
    gameSnapshot(good),
    gameSnapshot(bad),
    gameSnapshot(partial),
  ];
  const match = { ...good, history };
  const career = playerCareer(match, "p5");
  assert.equal(career.completed.length, 2);
  assert.equal(career.best!.game.opponent, "Time A");
  assert.equal(career.worst!.game.opponent, "Time B");
  assert.equal(
    career.average,
    (career.best!.player!.rating! + career.worst!.player!.rating!) / 2,
  );
  assert.equal(archiveGame(match).filter((g) => g.id === match.id).length, 1);
  assert.equal(playerCareer(match, "p10").average, null);
  assert.deepEqual(parseMatch(JSON.stringify(match)).history, history);
});

test("photo crop survives backups and invalid photo/history metadata is rejected", () => {
  const match = makeNewMatch();
  match.players[0].photo = {
    dataUrl: "data:image/jpeg;base64,AA==",
    x: 30,
    y: 70,
    zoom: 1.5,
  };
  assert.deepEqual(
    parseMatch(JSON.stringify(match)).players[0].photo,
    match.players[0].photo,
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...match,
        players: match.players.map((p, i) =>
          i ? p : { ...p, photo: { ...p.photo, zoom: 9 } },
        ),
      }),
    ),
  );
  const game = gameSnapshot(finishedFixture("good", "Time A"));
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...match,
        history: [{ ...game, players: [{ ...game.players[0], rating: 99 }] }],
      }),
    ),
  );
});

import { openingRoleMigration } from "./engine";
test("legacy pre-match P1 gets tactical roles without changing lineup, score or history", () => {
  const old = newMatch();
  old.initialLineup = assignToZone(old.initialLineup, 1, "p2");
  const updated = openingRoleMigration(old);
  assert.deepEqual(project(updated).lineup, old.initialLineup);
  assert.deepEqual(project(updated).score, [0, 0]);
  assert.equal(project(updated).roles[0], "setter");
  assert.equal(updated.audit.length, old.audit.length + 1);
  assert.equal(openingRoleMigration(updated), updated);
  const played = append(old, { type: "point", winner: "ours" });
  assert.equal(openingRoleMigration(played), played);
});

test("auto libero enters after the serving middle loses serve; disabled mode leaves him on court", () => {
  const base = makeNewMatch();
  const lineup = [
    ...base.initialLineup.slice(2),
    ...base.initialLineup.slice(0, 2),
  ];
  const roles = [...p1Roles.slice(2), ...p1Roles.slice(0, 2)];
  let match = append(base, { type: "setup", lineup, roles, server: "ours" });
  const without = append(match, { type: "point", winner: "theirs" });
  assert.equal(project(without).lineup[0], "p3");
  match = append(match, { type: "autoLibero", enabled: true });
  const before = match;
  match = append(match, {
    type: "event",
    event: { playerId: "p3", skill: "serve", result: "error" },
  });
  assert.equal(project(match).lineup[0], "p10");
  assert.deepEqual(project(match).libero, { playerId: "p10", replaced: "p3" });
  assert.equal(project(match).events[0].role, "middle");
  assert.equal(project(match).substitutions, 0);
  assert.deepEqual(
    project(undo(match)),
    project({ ...before, audit: [...before.audit] }),
  );
  assert.deepEqual(project(parseMatch(JSON.stringify(match))), project(match));
});

test("auto libero returns at front row, can be disabled legally, and cannot alter an open rally", () => {
  const base = makeNewMatch();
  let match = append(base, {
    type: "setup",
    lineup: [...base.initialLineup.slice(2), ...base.initialLineup.slice(0, 2)],
    roles: [...p1Roles.slice(2), ...p1Roles.slice(0, 2)],
    server: "ours",
  });
  match = append(match, { type: "autoLibero", enabled: true });
  match = append(match, { type: "point", winner: "theirs" });
  assert.throws(
    () => append(match, { type: "autoLibero", enabled: false }),
    /rally/,
  );
  const afterEntry = match;
  match = append(match, { type: "point", winner: "theirs" });
  match = append(match, { type: "autoLibero", enabled: false });
  assert.equal(project(match).libero, undefined);
  assert.equal(project(match).lineup[0], "p3");
  assert.equal(project(match).autoLibero, false);
  match = afterEntry;
  for (let n = 0; n < 3; n++) {
    match = append(match, { type: "point", winner: "ours" });
    if (n < 2) match = append(match, { type: "point", winner: "theirs" });
  }
  assert.equal(project(match).libero, undefined);
  assert.equal(project(match).lineup[3], "p3");
  const open = append(base, {
    type: "event",
    event: { playerId: "p5", skill: "set", result: "simple_good" },
  });
  assert.throws(
    () => append(open, { type: "autoLibero", enabled: true }),
    /Encerre/,
  );
  const ordinary = append(append(base, { type: "autoLibero", enabled: true }), {
    type: "point",
    winner: "theirs",
  });
  assert.equal(project(ordinary).libero, undefined);
});

import { defaultDefenseMap, selectionZone } from "./PlayerChooser";
test("defensive view maps only back-row roles and does not change rotation", () => {
  assert.equal(selectionZone(5, "outside", true), 6);
  assert.equal(selectionZone(6, "middle", true), 5);
  assert.equal(selectionZone(1, "opposite", true), 1);
  assert.equal(selectionZone(2, "outside", true), 2);
  assert.equal(selectionZone(5, "outside", false), 5);
  assert.equal(
    selectionZone(5, "outside", true, { ...defaultDefenseMap, outside: 1 }),
    1,
  );
  const match = { ...makeNewMatch(), defenseMap: { ...defaultDefenseMap } };
  assert.deepEqual(project(match).lineup, match.initialLineup);
  assert.deepEqual(
    parseMatch(JSON.stringify(match)).defenseMap,
    defaultDefenseMap,
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...match,
        defenseMap: { ...defaultDefenseMap, outside: 2 },
      }),
    ),
  );
});
test("rally recap includes sequence, correction preserves score and undo restores original attribution", () => {
  let m = makeNewMatch();
  m = append(m, {
    type: "event",
    event: { skill: "defense", result: "simple_gafe", playerId: "p1" },
  });
  m = append(m, {
    type: "event",
    event: { skill: "attack", result: "simple_ours", playerId: "p1" },
  });
  const before = project(m);
  assert.equal(before.rallies.length, 1);
  assert.equal(before.rallies[0].events.length, 2);
  assert.deepEqual(before.rallies[0].score, [1, 0]);
  const target = before.events[1].id;
  const fixed = correct(
    m,
    target,
    { skill: "attack", result: "simple_ours", playerId: "p2" },
    "Jogador errado",
  );
  assert.deepEqual(project(fixed).score, before.score);
  assert.equal(project(fixed).rallies[0].events[1].playerId, "p2");
  assert.equal(fixed.audit.at(-1)?.kind, "correction");
  assert.equal(project(undo(fixed)).events[1].playerId, "p1");
  assert.equal(project(undo(m)).rallies.length, 0);
  assert.equal(project(undo(m)).events.length, 1);
});
test("career role filter uses recorded tactical role and preserves legacy overall history", () => {
  const first = finishedFixture("good", "Time A");
  const snapshot = gameSnapshot(first);
  assert.equal(
    snapshot.players.find((p) => p.playerId === "p5")!.roleStats!.setter!.count,
    1,
  );
  const old = {
    ...snapshot,
    id: "legacy",
    players: snapshot.players.map(({ roleStats, ...p }) => p),
  };
  const current = { ...makeNewMatch(), history: [snapshot, old] };
  assert.equal(playerCareer(current, "p5").completed.length, 2);
  assert.equal(playerCareer(current, "p5", "setter").completed.length, 1);
  assert.equal(playerCareer(current, "p5", "outside").completed.length, 0);
  assert.deepEqual(
    parseMatch(JSON.stringify(current)).history,
    current.history,
  );
  const invalid = {
    ...snapshot,
    players: snapshot.players.map((p) =>
      p.playerId === "p5"
        ? {
            ...p,
            roleStats: { setter: { ...p.roleStats!.setter!, count: 99 } },
          }
        : p,
    ),
  };
  assert.throws(() =>
    parseMatch(JSON.stringify({ ...current, history: [invalid] })),
  );
});

import { matchAnalysis } from "./analysis";
test("analysis counts every rally in the pre-side-out P and separates serve from receive", () => {
  let match: ReturnType<typeof makeNewMatch> = {
    ...makeNewMatch(),
    initialServer: "theirs",
  };
  for (const winner of ["ours", "theirs", "theirs", "ours", "ours"] as const)
    match = append(match, { type: "point", winner });
  const a = matchAnalysis(match);
  assert.equal(a.rallies.length, 5);
  assert.deepEqual(
    a.rallies.map((r) => r.p),
    [1, 6, 6, 6, 5],
  );
  const p6 = a.rotations.find((r) => r.p === 6)!;
  assert.deepEqual(
    [p6.won, p6.lost, p6.sideouts, p6.receiving, p6.serveWins, p6.serving],
    [1, 2, 1, 2, 0, 1],
  );
  assert.equal(a.streak, 2);
  assert.equal(a.streakSide, "ours");
  assert.deepEqual(a.rallies[0].lineup, match.initialLineup);
  assert.notDeepEqual(a.rallies.at(-1)!.lineup, a.rallies[0].lineup);
});
test("timeouts preserve score and formation, limit each side, survive JSON, and undo restores allowance", () => {
  let match = makeNewMatch();
  const before = project(match);
  match = append(match, { type: "timeout", side: "ours" });
  match = append(match, { type: "timeout", side: "theirs" });
  match = append(match, { type: "timeout", side: "ours" });
  const after = project(match);
  assert.deepEqual(after.score, before.score);
  assert.deepEqual(after.lineup, before.lineup);
  assert.equal(after.rally, before.rally);
  assert.equal(after.events.length, 0);
  assert.equal(after.markers.length, 3);
  assert.throws(
    () => append(match, { type: "timeout", side: "ours" }),
    /dois pedidos/,
  );
  assert.equal(
    project(append(undo(match), { type: "timeout", side: "ours" })).markers
      .length,
    3,
  );
  assert.deepEqual(
    project(parseMatch(JSON.stringify(match))).markers,
    after.markers,
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...match,
        audit: [
          { ...match.audit[0], command: { type: "timeout", side: "invalid" } },
        ],
      }),
    ),
  );
  const open = append(makeNewMatch(), {
    type: "event",
    event: { playerId: "p1", skill: "defense", result: "simple_good" },
  });
  assert.throws(
    () => append(open, { type: "timeout", side: "ours" }),
    /Encerre o rally/,
  );
});
test("timeout before and after windows stay in the same set, reset allowance and expose incomplete windows", () => {
  let match = makeNewMatch();
  for (let i = 0; i < 23; i++)
    match = append(match, { type: "point", winner: "ours" });
  match = append(match, { type: "timeout", side: "ours" });
  for (let i = 0; i < 2; i++)
    match = append(match, { type: "point", winner: "ours" });
  assert.throws(
    () => append(match, { type: "timeout", side: "ours" }),
    /encerrado/,
  );
  match = append(match, {
    type: "nextSet",
    lineup: match.initialLineup,
    roles: match.initialRoles,
    server: "theirs",
  });
  match = append(match, { type: "timeout", side: "ours" });
  match = append(match, { type: "point", winner: "theirs" });
  const a = matchAnalysis(match);
  assert.equal(a.timeouts[0].before.length, 5);
  assert.equal(a.timeouts[0].after.length, 2);
  assert.equal(a.timeouts[1].before.length, 0);
  assert.equal(a.timeouts[1].after.length, 1);
  assert.equal(matchAnalysis(match, 1).rallies.length, 25);
  assert.equal(matchAnalysis(match, 2).rallies.length, 1);
  assert.equal(matchAnalysis(match, 2).streakSide, "theirs");
});
test("substitution markers and formation snapshots remain tied to their actual rally", () => {
  let match = makeNewMatch();
  match = append(match, { type: "point", winner: "ours" });
  match = append(match, { type: "sub", outgoing: "p1", incoming: "p9" });
  match = append(match, { type: "point", winner: "ours" });
  const a = matchAnalysis(match);
  assert.ok(a.rallies[0].lineup.includes("p1"));
  assert.ok(!a.rallies[0].lineup.includes("p9"));
  assert.ok(a.rallies[1].lineup.includes("p9"));
  assert.equal(a.markers[0].rally, 2);
  assert.deepEqual(a.markers[0].score, [1, 0]);
});
test("correcting a point updates the analysis and undo restores the original chart", () => {
  let match = makeNewMatch();
  match = append(match, {
    type: "event",
    event: { playerId: "p1", skill: "attack", result: "simple_ours" },
  });
  const fixed = correct(
    match,
    match.audit[0].id,
    { playerId: "p1", skill: "attack", result: "simple_theirs" },
    "Vencedor corrigido",
  );
  assert.deepEqual(matchAnalysis(fixed).rallies[0].score, [0, 1]);
  assert.equal(matchAnalysis(fixed).rotations[0].lost, 1);
  assert.deepEqual(matchAnalysis(undo(fixed)).rallies[0].score, [1, 0]);
});

import { opponentTeam } from "./OpponentLogos";
test("opponent logo library survives backup and follows team name without leaking to another opponent", () => {
  const match = {
    ...makeNewMatch(),
    opponent: "  Time A  ",
    opponentTeams: [
      { id: "a", name: "Time A", logo: "data:image/png;base64,AA==" },
      { id: "b", name: "Time B", logo: "data:image/png;base64,AQ==" },
    ],
  };
  const loaded = parseMatch(JSON.stringify(match));
  assert.equal(opponentTeam(loaded)?.id, "a");
  assert.equal(opponentTeam({ ...loaded, opponent: "time b" })?.id, "b");
  assert.equal(opponentTeam({ ...loaded, opponent: "Outro time" }), undefined);
  assert.deepEqual(loaded.opponentTeams, match.opponentTeams);
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...match,
        opponentTeams: [...match.opponentTeams, { id: "c", name: "TIME A" }],
      }),
    ),
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...match,
        opponentTeams: [
          {
            id: "a",
            name: "Time A",
            logo: "https://external.example/logo.png",
          },
        ],
      }),
    ),
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...match,
        opponentTeams: [
          { id: "a", name: "Time A", logo: "data:image/svg+xml;base64,AA==" },
        ],
      }),
    ),
  );
});


test("líbero secundário da partida faz trocas livres e preserva função dos lances anteriores", () => {
  let match = makeNewMatch();
  match.players.find((p) => p.id === "p8")!.positions.push("Líbero");
  match = append(match, { type: "sub", incoming: "p8", outgoing: "p6" });
  match = append(match, { type: "event", event: { playerId: "p8", skill: "defense", result: "simple_good", assessment: normalAssessment() } });
  match = append(match, { type: "point", winner: "theirs" });
  match = append(match, { type: "sub", incoming: "p6", outgoing: "p8" });
  const originalRole = project(match).events[0].role;
  match = append(match, { type: "selectLibero", playerId: "p8" });
  const before = project(match);
  match = append(match, { type: "libero", playerId: "p8", replaced: before.lineup[4] });
  assert.equal(project(match).substitutions, before.substitutions);
  match = append(match, { type: "event", event: { playerId: "p8", skill: "defense", result: "simple_good", assessment: normalAssessment() } });
  assert.equal(project(match).events[0].role, originalRole);
  assert.notEqual(originalRole, "libero");
  assert.equal(project(match).events[1].role, "libero");
  assert.equal(project(match).events[1].ratingContext?.role, "libero");
  assert.equal(JSON.stringify(project(parseMatch(JSON.stringify(match)))), JSON.stringify(project(match)));
  assert.equal(match.players.find((p) => p.id === "p8")!.libero, false);
  assert.throws(() => append(match, { type: "selectLibero", playerId: "p10" }), /rally|Retire/);
});

test("seleção do líbero valida tag e banco e dirige a entrada automática", () => {
  let match = makeNewMatch();
  match.players.find((p) => p.id === "p8")!.positions.push("Líbero");
  match.players.find((p) => p.id === "p2")!.positions.push("Líbero");
  assert.throws(() => append(match, { type: "selectLibero", playerId: "p9" }), /tag Líbero/);
  assert.throws(() => append(match, { type: "selectLibero", playerId: "p2" }), /banco/);
  match = append(match, { type: "selectLibero", playerId: "p8" });
  assert.equal(project(undo(match)).designatedLiberoId, "p10");
  assert.throws(() => append(match, { type: "sub", incoming: "p8", outgoing: "p6" }), /troca de líbero/);
  assert.throws(() => append(match, { type: "setup", lineup: match.initialLineup.map((id) => id === "p6" ? "p8" : id), server: "ours" }), /sem líbero/);
  match = append(match, { type: "setup", lineup: [...match.initialLineup.slice(2), ...match.initialLineup.slice(0, 2)], roles: [...p1Roles.slice(2), ...p1Roles.slice(0, 2)], server: "ours" });
  match = append(match, { type: "autoLibero", enabled: true });
  match = append(match, { type: "point", winner: "theirs" });
  assert.equal(project(match).libero?.playerId, "p8");
  assert.equal(project(match).substitutions, 0);
  match = append(match, { type: "restartSet" });
  assert.equal(project(match).designatedLiberoId, "p8");
  assert.equal(project(match).libero, undefined);
});
