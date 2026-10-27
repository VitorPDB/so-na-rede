import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { newMatch } from "./model";
import { append, project } from "./engine";
import { parseMatch } from "./storage";

test("continuidade: isolamento, retry, transferência de aparelho e partidas independentes", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table public.scout_editors(id uuid primary key);
      create function public.can_publish() returns boolean language sql security definer set search_path='' as $$ select exists(select 1 from public.scout_editors where id=auth.uid()) $$;`);
    const a = crypto.randomUUID(),
      b = crypto.randomUUID(),
      outsider = crypto.randomUUID(),
      device1 = crypto.randomUUID(),
      device2 = crypto.randomUUID();
    for (const id of [a, b, outsider])
      await db.query("insert into auth.users values($1)", [id]);
    for (const id of [a, b])
      await db.query("insert into public.scout_editors values($1)", [id]);
    const sql = readFileSync(
      new URL("../supabase/match-sync.sql", import.meta.url),
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql); // Safe migration rerun.
    const login = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    const call = async (
      action: string,
      id: string | null = null,
      body: unknown = null,
      rev: number | null = null,
      device: string | null = null,
      request: string | null = null,
    ) =>
      (
        await db.query<{ result: any }>(
          "select public.scout_match_sync($1,$2,$3,$4,$5,$6) result",
          [action, id, body, rev, device, request],
        )
      ).rows[0].result;
    let match = append(newMatch(), { type: "point", winner: "ours" });
    await login(a);
    await assert.rejects(
      db.query("select * from public.scout_matches"),
      /permission denied/,
    );
    const request = crypto.randomUUID();
    const first = await call("save", match.id, match, 0, device1, request);
    assert.equal(first.revision, 1);
    assert.equal(
      (await call("save", match.id, match, 0, device1, request)).revision,
      1,
    );
    await assert.rejects(
      call(
        "save",
        match.id,
        { ...match, opponent: "Changed" },
        0,
        device1,
        request,
      ),
      /request_conflict/,
    );
    const read = await call("read", match.id);
    const restored = parseMatch(JSON.stringify(read.body));
    assert.deepEqual(project(restored), project(match));
    assert.deepEqual(restored.audit, match.audit);
    const claim = crypto.randomUUID();
    assert.equal(
      (await call("claim", match.id, null, 1, device2, claim)).revision,
      2,
    );
    assert.equal(
      (await call("claim", match.id, null, 1, device2, claim)).revision,
      2,
    );
    await assert.rejects(
      call("save", match.id, match, 1, device1, crypto.randomUUID()),
      /device_conflict/,
    );
    await assert.rejects(
      call("claim", match.id, null, 1, device1, crypto.randomUUID()),
      /revision_conflict/,
    );
    match = append(match, { type: "point", winner: "theirs" });
    assert.equal(
      (await call("save", match.id, match, 2, device2, crypto.randomUUID()))
        .revision,
      3,
    );
    await assert.rejects(
      call("save", match.id, match, 2, device2, crypto.randomUUID()),
      /revision_conflict/,
    );
    const other = newMatch();
    await call("save", other.id, other, 0, device1, crypto.randomUUID());
    assert.equal((await call("status", match.id)).device, device2);
    assert.equal((await call("status", other.id)).device, device1);
    assert.equal((await call("list")).length, 2);
    await login(b);
    assert.deepEqual(await call("list"), []);
    await assert.rejects(call("read", match.id), /match_missing/);
    await assert.rejects(
      call("claim", match.id, null, 3, device1, crypto.randomUUID()),
      /match_missing/,
    );
    await assert.rejects(
      call("save", other.id, {}, 0, device1, crypto.randomUUID()),
      /invalid_match/,
    );
    // Same match ID in a different account cannot touch the original row.
    await call("save", match.id, match, 0, device1, crypto.randomUUID());
    await login(a);
    assert.equal((await call("status", match.id)).revision, 3);
    // Round trip: the first device may reclaim the same match, while the former
    // owner must stop writing even if it still has a valid session.
    assert.equal((await call("claim", match.id, null, 3, device1, crypto.randomUUID())).revision, 4);
    assert.equal((await call("status", match.id)).device, device1);
    assert.deepEqual((await call("read", match.id)).body, match);
    await assert.rejects(call("save", match.id, match, 3, device2, crypto.randomUUID()), /device_conflict/);
    await login(outsider);
    await assert.rejects(call("list"), /not_authorized/);
    await db.exec("reset role; set role anon");
    await assert.rejects(call("list"), /permission denied/);
    await assert.rejects(
      db.query("select * from public.scout_matches"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
