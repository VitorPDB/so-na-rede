import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { publicSnapshot, publicMedia } from "./publicSnapshot";
import { newMatch } from "./model";
import { append } from "./engine";
import { csv } from "./storage";
import { parseCloudConfig } from "./cloudConfig";
import {
  validPublicSnapshot,
  validPublicMedia,
  validMatchId,
} from "./publicValidation";
import { tooCloseToUs } from "./opponentColor";
import { publicDemo, publicDemoHistory } from "./publicDemo";

test("cores consideram o tema ativo; dourado do adversário não confunde o tema do time", () => {
  assert.equal(tooCloseToUs([224, 169, 59], [224, 169, 59]), true);
  assert.equal(tooCloseToUs([224, 169, 59], [90, 42, 102]), false);
  assert.equal(tooCloseToUs([100, 40, 160], [90, 42, 102]), true);
  assert.equal(tooCloseToUs([100, 100, 100], [105, 105, 105]), true);
  assert.equal(tooCloseToUs([100, 100, 100], [90, 42, 102]), false);
});
test("CSV neutraliza fórmulas precedidas de espaços, tabulações e controles", () => {
  for (const value of ["=1+1", " \t=1+1", "\r@SUM(1)", "\u0000+1", " -1"])
    assert.ok(csv([[value]]).includes("\"'"));
  assert.equal(csv([["Vidro", 11]]), '\uFEFF"Vidro";"11"');
});
test("configuração rejeita hosts externos, segredos extras e IDs de URL fora do formato", () => {
  const c = {
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "sb_publishable_example",
  };
  for (const url of [
    "https://evil.example",
    "https://example.supabase.co.evil.example",
    "https://example.supabase.co:444",
  ])
    assert.throws(() => parseCloudConfig({ ...c, supabaseUrl: url }));
  assert.throws(() => parseCloudConfig({ ...c, secret: "sb_secret_no" }));
  for (const id of [null, "", "../secret", "x".repeat(81), "a' or true"])
    assert.equal(validMatchId(id), false);
  assert.equal(validMatchId("game-2026_10"), true);
});
test("DTO aceita fundamentos reais e rejeita campos privados, mídias ativas e valores fora da escala", () => {
  for (const row of [publicDemo(), ...publicDemoHistory()]) assert.equal(validPublicSnapshot(row.snapshot), true);
  let m = newMatch();
  m = append(m, {
    type: "event",
    event: {
      skill: "attack",
      playerId: m.players[0].id,
      result: "simple_good",
    },
  });
  const snapshot = publicSnapshot(m);
  assert.equal(validPublicSnapshot(snapshot), true);
  assert.equal(validPublicMedia(publicMedia(m)), true);
  assert.equal(validPublicSnapshot({ ...snapshot, audit: [] }), false);
  const bad = structuredClone(snapshot);
  (bad.players[0].stats as unknown as Record<string, unknown>).email =
    "private@example.com";
  assert.equal(validPublicSnapshot(bad), false);
  assert.equal(
    validPublicSnapshot({ ...snapshot, score: [Infinity, -1] }),
    false,
  );
  assert.equal(
    validPublicMedia({
      photos: {},
      opponentLogo: "data:image/svg+xml;base64,abc",
    }),
    false,
  );
});
test("Supabase endurecido: roles, validação recursiva, limites, retry e vídeos", async () => {
  const db = new PGlite();
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
      "security.sql",
    ])
      await db.exec(
        readFileSync(new URL(`../supabase/${file}`, import.meta.url), "utf8"),
      );
    const editor = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values($1),($2)", [editor, other]);
    await db.query("insert into public.scout_editors values($1)", [editor]);
    const m = newMatch();
    const s = publicSnapshot(m);
    const request = crypto.randomUUID();
    const publish = (
      snapshot: unknown = s,
      media: unknown = publicMedia(m),
      revision = 0,
      id = crypto.randomUUID(),
    ) =>
      db.query<{ revision: string }>(
        "select public.publish_live($1,$2,$3,$4) revision",
        [revision, snapshot, media, id],
      );
    await db.exec("set role anon");
    await assert.rejects(publish(), /permission denied/);
    await assert.rejects(
      db.query("select public.can_publish()"),
      /permission denied/,
    );
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      other,
    ]);
    assert.equal(
      (await db.query<{ can_publish: boolean }>("select public.can_publish()"))
        .rows[0].can_publish,
      false,
    );
    await assert.rejects(publish(), /not_authorized/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      editor,
    ]);
    assert.equal(
      (await db.query<{ can_publish: boolean }>("select public.can_publish()"))
        .rows[0].can_publish,
      true,
    );
    await assert.rejects(
      publish({ ...s, privateSettings: {} }),
      /invalid_snapshot/,
    );
    const bad = structuredClone(s);
    (bad.players[0].stats as unknown as Record<string, unknown>).password =
      "private";
    await assert.rejects(publish(bad), /invalid_snapshot/);
    await assert.rejects(publish({ ...s, score: [-1, 0] }), /invalid_snapshot/);
    await assert.rejects(
      publish({ ...s, team: "x".repeat(181) }),
      /invalid_snapshot/,
    );
    await assert.rejects(
      publish(s, { photos: {}, opponentLogo: "javascript:alert(1)" }),
      /invalid_media/,
    );
    assert.equal(
      Number((await publish(s, publicMedia(m), 0, request)).rows[0].revision),
      1,
    );
    assert.equal(
      Number((await publish(s, publicMedia(m), 0, request)).rows[0].revision),
      1,
    );
    await assert.rejects(publish(), /revision_conflict/);
    await assert.rejects(
      db.query("update public.live_public set snapshot='{}'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from public.scout_write_limits"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.scout_json_valid('{}','{}',0)"),
      /permission denied/,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ writes: number }>(
          "select writes from public.scout_write_limits",
        )
      ).rows[0].writes,
      1,
    );
    await db.query(
      "update public.scout_write_limits set writes=120 where user_id=$1",
      [editor],
    );
    await db.exec("set role authenticated");
    await assert.rejects(publish(s, null, 1), /rate_limited/);
    assert.equal(
      Number(
        (
          await db.query<{ revision: string }>(
            "select revision from public.live_public",
          )
        ).rows[0].revision,
      ),
      1,
    );
    await db.exec("reset role");
    await db.query(
      "update public.scout_write_limits set window_start=now()-interval '2 minutes' where user_id=$1",
      [editor],
    );
    await db.exec("set role authenticated");
    await publish({ ...s, finished: true }, null, 1);
    await db.query("select public.update_match_videos($1,$2)", [
      s.matchId,
      [
        {
          id: "video-1",
          title: "Partida",
          youtubeId: "abcdefghijk",
          startSeconds: 0,
          kind: "replay",
        },
      ],
    ]);
    await db.exec("reset role; set role anon");
    assert.equal(
      (await db.query("select * from public.public_matches")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
