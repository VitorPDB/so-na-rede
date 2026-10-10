import test from "node:test";
import assert from "node:assert/strict";
import { parseCloudConfig } from "./cloudConfig";
import { publicSnapshot } from "./publicSnapshot";
import { publicDemo, publicDemoHistory } from "./publicDemo";
import { archiveGame } from "./career";
import { parseMatch } from "./storage";
import { newMatch } from "./model";
import { append, project, undo } from "./engine";

test("configuração pública aceita publishable/anon e rejeita credenciais secretas", () => {
  assert.equal(parseCloudConfig({ supabaseUrl: "", publishableKey: "" }), null);
  const config = {
    supabaseUrl: " https://example.supabase.co/ ",
    publishableKey: "sb_publishable_example",
  };
  assert.equal(
    parseCloudConfig(config)?.supabaseUrl,
    "https://example.supabase.co",
  );
  const jwt = (role: string) =>
    `header.${btoa(JSON.stringify({ role }))}.signature`;
  assert.ok(parseCloudConfig({ ...config, publishableKey: jwt("anon") }));
  for (const key of [
    "sb_secret_example",
    jwt("service_role"),
    jwt("authenticated"),
    "invalid",
  ])
    assert.throws(
      () => parseCloudConfig({ ...config, publishableKey: key }),
      /chave pública/,
    );
  for (const url of [
    "http://example.supabase.co",
    "https://user:pass@example.supabase.co",
    "https://example.supabase.co/rest/v1",
    "invalid",
  ])
    assert.throws(() => parseCloudConfig({ ...config, supabaseUrl: url }));
});

test("filtros públicos por set usam somente as ações daquele set; desfazer recalcula", () => {
  let match = newMatch();
  const id = match.players[0].id;
  match = append(match, {
    type: "event",
    event: { playerId: id, skill: "attack", result: "simple_ours" },
  });
  for (let i = 0; i < 24; i++)
    match = append(match, { type: "point", winner: "ours" });
  const completed = project(match);
  match = append(match, {
    type: "nextSet",
    lineup: completed.lineup,
    roles: completed.roles,
    server: "theirs",
  });
  match = append(match, {
    type: "event",
    event: { playerId: id, skill: "attack", result: "simple_theirs" },
  });
  let snapshot = publicSnapshot(match);
  assert.equal(snapshot.periods.length, 2);
  assert.deepEqual(snapshot.periods[0].score, [25, 0]);
  assert.deepEqual(snapshot.periods[1].score, [0, 1]);
  assert.equal(
    snapshot.periods[0].players.find((p) => p.id === id)?.stats.points,
    1,
  );
  assert.equal(
    snapshot.periods[1].players.find((p) => p.id === id)?.stats.points,
    0,
  );
  assert.equal(
    snapshot.periods[1].players.find((p) => p.id === id)?.stats.errors,
    1,
  );
  assert.equal(snapshot.periods[0].teamStats.count, 1);
  assert.equal(snapshot.periods[1].teamStats.count, 1);
  snapshot = publicSnapshot(undo(match));
  assert.equal(snapshot.periods[1].teamStats.count, 0);
  assert.equal(snapshot.periods[1].highlight, null);
  assert.equal("audit" in snapshot.periods[0], false);
});

test("demonstração pública tem dados isolados, pontos e tempo, sem auditoria privada", () => {
  const demo = publicDemo();
  assert.equal(demo.snapshot.matchId, "public-demo");
  assert.equal(demo.snapshot.rallies.length, 31);
  assert.equal(demo.snapshot.timeouts.length, 1);
  assert.deepEqual(demo.snapshot.score, [19, 12]);
  assert.equal("audit" in demo.snapshot, false);
});
test("histórico de demonstração contém jogos encerrados e estatísticas de cada set", () => {
  const games = publicDemoHistory();
  assert.equal(games.length, 2);
  for (const game of games) {
    assert.equal(game.snapshot.finished, true);
    assert.deepEqual(game.snapshot.sets, [2, 0]);
    assert.equal(game.snapshot.periods.length, 2);
    assert.ok(game.snapshot.teamStats.count > 0);
  }
});
test("novo jogo preserva notas e conjuntos por set no histórico local e no backup", () => {
  let match = newMatch();
  match = append(match, {
    type: "event",
    event: {
      skill: "set",
      result: "simple_gafe",
      playerId: match.players[0].id,
      assessment: { version: 1, difficulty: "hard", tags: [] },
    },
  });
  const history = archiveGame(match);
  const next = { ...newMatch(), history };
  const restored = parseMatch(JSON.stringify(next));
  assert.equal(restored.history?.[0].publicData?.matchId, match.id);
  assert.equal(restored.history?.[0].publicData?.periods[0].teamStats.count, 1);
  assert.equal(
    restored.history?.[0].publicData?.players[0].stats.rating,
    publicSnapshot(match).players[0].stats.rating,
  );
  assert.equal("audit" in restored.history![0].publicData!, false);
});
