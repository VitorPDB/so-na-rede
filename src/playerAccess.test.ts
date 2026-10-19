import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { newMatch } from "./model";
import { append } from "./engine";
import { publicSnapshot } from "./publicSnapshot";
import { safePublicSnapshot } from "./playerPrivacy";
import { validPublicSnapshot } from "./publicValidation";

test("PIN, isolamento de jogador e remoção de detalhes de todos os endpoints públicos", async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create publication supabase_realtime;`);
    for (const file of [
      "live.sql",
      "videos.sql",
      "security-schema.sql",
      "security.sql",
    ])
      await db.exec(
        readFileSync(new URL(`../supabase/${file}`, import.meta.url), "utf8"),
      );
    const editor = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into auth.users values($1)", [editor]);
    await db.query("insert into public.scout_editors values($1)", [editor]);
    let m = newMatch();
    m = append(m, {
      type: "event",
      event: { skill: "attack", playerId: "p1", result: "simple_good" },
    });
    m = append(m, {
      type: "event",
      event: { skill: "attack", playerId: "p2", result: "simple_good" },
    });
    const snapshot = publicSnapshot(m);
    snapshot.finished = true;
    assert.equal(validPublicSnapshot(safePublicSnapshot(snapshot)), true);
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${editor}',false);`,
    );
    await db.query("select public.publish_live(0,$1,null,$2)", [
      snapshot,
      crypto.randomUUID(),
    ]);
    await db.exec("reset role");
    await db.exec(
      readFileSync(new URL("../supabase/players.sql", import.meta.url), "utf8"),
    );
    await db.exec(`insert into public.player_access(player_id,name,number,pin_hash) values
      ('p1','Vidro',11,extensions.crypt('1234',extensions.gen_salt('bf',4))),
      ('p2','Akira',2,extensions.crypt('5678',extensions.gen_salt('bf',4)));`);
    await db.exec("set role authenticated");
    await db.query("select public.publish_player_live(1,$1,null,$2,$3)", [
      snapshot,
      crypto.randomUUID(),
      [],
    ]);
    await db.exec("reset role; set role anon;");
    for (const table of ["live_public", "public_matches"]) {
      const rows = await db.query<{ snapshot: typeof snapshot }>(
        `select snapshot from public.${table}`,
      );
      assert.equal(rows.rows[0].snapshot.players[0].stats.count, null);
      assert.deepEqual(rows.rows[0].snapshot.players[0].stats.metrics, []);
      assert.equal(rows.rows[0].snapshot.technical, undefined);
      assert.equal(validPublicSnapshot(rows.rows[0].snapshot), true);
    }
    for (const table of [
      "player_access",
      "player_sessions",
      "player_match_private",
    ])
      await assert.rejects(
        db.query(`select * from public.${table}`),
        /permission denied/,
      );
    await assert.rejects(
      db.query("select public.publish_player_live(1,$1,null,$2,$3)", [
        snapshot,
        crypto.randomUUID(),
        [],
      ]),
      /permission denied/,
    );
    const login = async (pin: string) =>
      (
        await db.query<{ v: { token?: string; error?: string } }>(
          "select public.player_login($1,$2) v",
          ["p1", pin],
        )
      ).rows[0].v;
    for (let i = 0; i < 5; i++)
      assert.equal((await login("0000")).error, "invalid_credentials");
    assert.equal((await login("1234")).error, "locked");
    await db.exec(
      "reset role; update public.player_access set locked_until=now()-interval '1 minute' where player_id='p1'; set role anon;",
    );
    const token = (await login("1234")).token!;
    assert.equal(token.length, 64);
    const data = (
      await db.query<{
        v: {
          playerId: string;
          games: {
            own: typeof snapshot.teamStats;
            public: typeof snapshot;
            technical: { players: { id: string }[] };
          }[];
        };
      }>("select public.player_dashboard($1) v", [token])
    ).rows[0].v;
    assert.equal(data.playerId, "p1");
    assert.equal(data.games[0].own.count, 1);
    assert.ok(data.games[0].own.metrics.length);
    assert.ok(data.games[0].technical.players.every((p) => p.id === "p1"));
    assert.equal(data.games[0].public.players[1].stats.count, null);
    assert.deepEqual(data.games[0].public.players[1].stats.metrics, []);
    await assert.rejects(
      db.query("select public.player_dashboard($1)", [token + "x"]),
      /session_expired/,
    );
    await db.query("select public.player_logout($1)", [token]);
    await assert.rejects(
      db.query("select public.player_dashboard($1)", [token]),
      /session_expired/,
    );
    await db.exec("reset role");
    await db.exec(
      readFileSync(new URL("../supabase/players.sql", import.meta.url), "utf8"),
    );
    const preserved = await db.query<{ snapshot: typeof snapshot }>(
      "select snapshot from public.player_match_private",
    );
    assert.equal(preserved.rows[0].snapshot.players[0].stats.count, 1);
  } finally {
    await db.close();
  }
});
