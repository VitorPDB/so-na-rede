import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { newMatch } from "./model";
import { append, project } from "./engine";
import { publicSnapshot } from "./publicSnapshot";
import { publicationCards } from "./socialCardData";
import { videoMoments, validVideoMoments } from "./videoMoments";
test("reels só públicos, cards só do jogador e publicação atômica", async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create publication supabase_realtime;`,
    );
    for (const name of [
      "live.sql",
      "videos.sql",
      "security-schema.sql",
      "security.sql",
      "players.sql",
      "video-point-marks.sql",
      "social-reels.sql",
      "social-reels.sql",
    ])
      await db.exec(
        readFileSync(new URL("../supabase/" + name, import.meta.url), "utf8"),
      );
    const editor = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into auth.users values($1)", [editor]);
    await db.query("insert into public.scout_editors values($1)", [editor]);
    await db.exec(
      `insert into public.player_access(player_id,name,number,pin_hash) values ('p1','Vidro',11,extensions.crypt('1234',extensions.gen_salt('bf',4))),('p2','Akira',2,extensions.crypt('5678',extensions.gen_salt('bf',4)));`,
    );
    let m = newMatch();
    m.videos = [
      {
        id: "v1",
        youtubeId: "M7lc1UVf-VE",
        title: "Set 1",
        startSeconds: 0,
        kind: "replay",
      },
    ];
    m = append(m, {
      type: "event",
      event: {
        skill: "attack",
        result: "simple_ours",
        playerId: "p1",
        videoTimestampMs: 363000,
        videoSource: "youtube:M7lc1UVf-VE",
      },
    });
    const snap = publicSnapshot(m),
      cards = publicationCards(m),
      moments = videoMoments(project(m).events);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      editor,
    ]);
    await db.exec("set role authenticated");
    const request = crypto.randomUUID();
    const args = [snap, request, moments, cards];
    await db.query(
      "select public.publish_player_bundle(0,$1,null,$2,$3,$4)",
      args,
    );
    await db.query(
      "select public.publish_player_bundle(0,$1,null,$2,$3,$4)",
      args,
    );
    await assert.rejects(
      db.query("select public.publish_player_bundle(1,$1,null,$2,$3,$4)", [
        snap,
        crypto.randomUUID(),
        moments,
        [{ ...cards[0], player: { ...cards[0].player, id: "outsider" } }],
      ]),
      /invalid_cards/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.player_social_cards"),
      /permission denied/,
    );
    const reels = (
      await db.query<{ v: unknown }>("select public.public_reels($1) v", [m.id])
    ).rows[0].v;
    assert.equal(validVideoMoments(reels), true);
    assert.equal((reels as any[]).length, 1);
    assert.equal((reels as any[])[0].videoTimestampMs, 363000);
    assert.equal(JSON.stringify(reels).includes("metrics"), false);
    assert.deepEqual(
      (
        await db.query<{ v: unknown }>("select public.public_reels($1) v", [
          "private-only",
        ])
      ).rows[0].v,
      [],
    );
    const token = (
      await db.query<{ v: { token: string } }>(
        "select public.player_login('p2','5678') v",
      )
    ).rows[0].v.token;
    const card = (
      await db.query<{ v: any }>("select public.player_social_card($1,$2) v", [
        token,
        m.id,
      ])
    ).rows[0].v;
    assert.equal(card.player.id, "p2");
    assert.equal(card.metrics[0].value, "0");
    await assert.rejects(
      db.query("select public.player_social_card($1,$2) v", ["invalid", m.id]),
      /session_expired/,
    );
    // A legacy client may republish without new cards: never return stale metrics.
    await db.exec("reset role;set role authenticated");
    await db.query("select public.publish_player_live(1,$1,null,$2,$3)", [
      snap,
      crypto.randomUUID(),
      moments,
    ]);
    await db.exec("reset role;set role anon");
    assert.equal(
      (
        await db.query<{ v: unknown }>(
          "select public.player_social_card($1,$2) v",
          [token, m.id],
        )
      ).rows[0].v,
      null,
    );
    await db.query("select public.player_logout($1)", [token]);
    await assert.rejects(
      db.query("select public.player_social_card($1,$2)", [token, m.id]),
      /session_expired/,
    );
  } finally {
    await db.close();
  }
});
