import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("banco: visitante só lê, comissão autorizada publica, revisão protege e retry não duplica", async () => {
  const db = new PGlite();
  try {
    // Reproduce Supabase database roles and auth.uid() with a controlled test identity.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      create publication supabase_realtime;
    `);
    const migration = readFileSync(
      new URL("../supabase/live.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);
    // Re-running the setup should also be harmless.
    await db.exec(migration);
    const editor = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values ($1),($2)", [editor, other]);
    await db.query("insert into public.scout_editors values ($1)", [editor]);
    const snapshot = { version: 1, matchId: "test-game", score: [1, 0] };
    const request = "00000000-0000-4000-8000-000000000011";
    await db.exec("set role anon");
    assert.equal(
      (await db.query("select * from public.live_public")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.live_public(slug,snapshot) values ('so-na-rede','{}')",
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.publish_live($1,$2,$3,$4)", [
        0,
        snapshot,
        null,
        request,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from public.scout_editors"),
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      other,
    ]);
    await assert.rejects(
      db.query("select public.publish_live($1,$2,$3,$4)", [
        0,
        snapshot,
        {},
        request,
      ]),
      /not_authorized/,
    );
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      editor,
    ]);
    const publish = (revision: number, id: string, media: unknown = null) =>
      db.query<{ revision: number }>(
        "select public.publish_live($1,$2,$3,$4) as revision",
        [revision, snapshot, media, id],
      );
    assert.equal(
      Number((await publish(0, request, { photos: {} })).rows[0].revision),
      1,
    );
    assert.equal(
      Number((await publish(0, request, { photos: {} })).rows[0].revision),
      1,
    );
    await assert.rejects(
      publish(0, "00000000-0000-4000-8000-000000000012"),
      /revision_conflict/,
    );
    assert.equal(
      Number(
        (await publish(1, "00000000-0000-4000-8000-000000000013")).rows[0]
          .revision,
      ),
      2,
    );
    await assert.rejects(
      db.query("update public.live_public set revision=99"),
      /permission denied/,
    );
    await db.exec("reset role; set role anon");
    const rows = await db.query<{
      revision: number;
      media_revision: number;
      snapshot: typeof snapshot;
    }>("select * from public.live_public");
    assert.equal(Number(rows.rows[0].revision), 2);
    assert.equal(Number(rows.rows[0].media_revision), 1);
    assert.deepEqual(rows.rows[0].snapshot.score, [1, 0]);
    assert.equal(
      (await db.query("select * from public.live_media")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.public_matches")).rows.length,
      0,
      "unfinished games are private in the archive",
    );
    await assert.rejects(
      db.query("delete from public.public_matches"),
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated");
    const publishGame = (
      revision: number,
      matchId: string,
      finished: boolean,
      score: number[],
      media: unknown = null,
    ) =>
      db.query("select public.publish_live($1,$2,$3,$4)", [
        revision,
        { version: 1, matchId, finished, score },
        media,
        `00000000-0000-4000-8000-${String(revision + 20).padStart(12, "0")}`,
      ]);
    await publishGame(2, "test-game", true, [25, 20]);
    await publishGame(3, "new-game", false, [0, 0], {
      photos: { newPlayer: "photo" },
    });
    await db.exec("reset role; set role anon");
    let archive = (
      await db.query<{
        match_id: string;
        snapshot: { score: number[] };
        media: unknown;
      }>("select * from public.public_matches")
    ).rows;
    assert.equal(
      archive.length,
      1,
      "starting a new match retains the completed game",
    );
    assert.equal(archive[0].match_id, "test-game");
    assert.deepEqual(archive[0].snapshot.score, [25, 20]);
    assert.deepEqual(
      archive[0].media,
      { photos: {} },
      "old photos are not replaced by the next game's media",
    );
    await db.exec("reset role; set role authenticated");
    await publishGame(4, "test-game", true, [25, 21]);
    await db.exec("reset role; set role anon");
    archive = (
      await db.query<{
        match_id: string;
        snapshot: { score: number[] };
        media: unknown;
      }>("select * from public.public_matches")
    ).rows;
    assert.equal(
      archive.length,
      1,
      "correcting the same identity does not duplicate a game",
    );
    assert.deepEqual(archive[0].snapshot.score, [25, 21]);
    await db.exec("reset role; set role authenticated");
    await publishGame(5, "test-game", false, [0, 0]);
    await db.exec("reset role; set role anon");
    assert.equal(
      (await db.query("select * from public.public_matches")).rows.length,
      0,
      "reopened sets remove stale final statistics from public history",
    );
    await db.exec("reset role");
    await db.exec(migration);
    assert.equal(
      (await db.query("select * from public.public_matches")).rows.length,
      2,
      "rerunning SQL neither deletes nor duplicates stored games",
    );
  } finally {
    await db.close();
  }
});
