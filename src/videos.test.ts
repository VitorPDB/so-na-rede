import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  youtubeLink,
  watchUrl,
  embedUrl,
  validVideos,
  attachArchiveVideos,
} from "./videos";
import { newMatch, type MatchVideo } from "./model";
import { append, project } from "./engine";
import { archiveGame } from "./career";
import { publicSnapshot } from "./publicSnapshot";
import { parseMatch } from "./storage";
const video: MatchVideo = {
  id: "v1",
  title: "Jogo completo",
  youtubeId: "M7lc1UVf-VE",
  startSeconds: 90,
  kind: "replay",
};
test("vídeos: links suportados e horário, rejeição de canais e domínios falsos", () => {
  for (const url of [
    "https://youtube.com/watch?v=M7lc1UVf-VE&t=1m30s",
    "https://youtu.be/M7lc1UVf-VE?t=90",
    "https://www.youtube.com/live/M7lc1UVf-VE?start=90",
    "https://www.youtube.com/embed/M7lc1UVf-VE#t=90",
    "https://m.youtube.com/shorts/M7lc1UVf-VE?t=90",
  ])
    assert.deepEqual(youtubeLink(url), {
      youtubeId: video.youtubeId,
      startSeconds: 90,
    });
  for (const url of [
    "javascript:alert(1)",
    "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE",
    "https://youtube.com/@SoNaRede",
    "https://evil.test/watch?v=M7lc1UVf-VE",
    "https://x@youtube.com/watch?v=M7lc1UVf-VE",
    "https://youtu.be/M7lc1UVf-VE?t=-2",
  ])
    assert.throws(() => youtubeLink(url));
  assert.equal(
    watchUrl(video),
    "https://www.youtube.com/watch?v=M7lc1UVf-VE&t=90s",
  );
  assert(
    embedUrl(video).startsWith(
      "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?start=90",
    ),
  );
  assert.equal(validVideos([video, { ...video, id: "v2", set: 2 }]), true);
  assert.equal(validVideos([video, video]), false);
  assert.equal(validVideos([{ ...video, privateData: "secret" }]), false);
});
test("vídeos: anexar e remover no histórico preserva notas/placar e sobrevive ao backup", () => {
  let m = append(
    { ...newMatch(), videos: [video] },
    { type: "point", winner: "ours" },
  );
  const archived = archiveGame(m)[0];
  assert.deepEqual(archived.videos, [video]);
  assert.deepEqual(publicSnapshot(m).videos, [video]);
  m = { ...m, history: [archived] };
  const before = JSON.stringify(archived.players);
  const attached = attachArchiveVideos(m, archived.id, [
    video,
    { ...video, id: "v2", title: "Set 2", set: 2 },
  ]);
  assert.equal(JSON.stringify(attached.history![0].players), before);
  assert.deepEqual(project(attached).score, [1, 0]);
  assert.deepEqual(
    parseMatch(JSON.stringify(attached)).history![0].videos,
    attached.history![0].videos,
  );
  const removed = attachArchiveVideos(attached, archived.id, []);
  assert.deepEqual(removed.history![0].publicData?.videos, []);
  assert.equal(JSON.stringify(removed.history![0].players), before);
  assert.throws(() =>
    parseMatch(
      JSON.stringify({ ...m, videos: [{ ...video, youtubeId: "<script>" }] }),
    ),
  );
});
test("banco vídeos: só comissão autorizada edita anexos, preservando estatísticas e partida atual", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create publication supabase_realtime;`,
    );
    await db.exec(
      readFileSync(new URL("../supabase/live.sql", import.meta.url), "utf8"),
    );
    const migration = readFileSync(
      new URL("../supabase/videos.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    const editor = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into auth.users values ($1)", [editor]);
    await db.query("insert into public.scout_editors values ($1)", [editor]);
    const snapshot = {
      version: 1,
      matchId: "old",
      finished: true,
      score: [25, 20],
      players: [{ rating: 8 }],
      videos: [],
    };
    await db.query(
      "insert into public.public_matches(match_id,revision,snapshot,media) values ('old',1,$1,$2)",
      [snapshot, { photos: {} }],
    );
    await db.query(
      "insert into public.live_public(slug,revision,snapshot) values ('so-na-rede',4,$1)",
      [{ version: 1, matchId: "now", score: [3, 2] }],
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select public.update_match_videos($1,$2)", ["old", [video]]),
      /permission denied/,
    );
    await db.exec("reset role;set role authenticated");
    await assert.rejects(
      db.query("select public.update_match_videos($1,$2)", ["old", [video]]),
      /not_authorized/,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      editor,
    ]);
    await db.query("select public.update_match_videos($1,$2)", [
      "old",
      [video],
    ]);
    const rows = await db.query<{ snapshot: typeof snapshot }>(
      "select snapshot from public.public_matches where match_id='old'",
    );
    assert.deepEqual(rows.rows[0].snapshot, { ...snapshot, videos: [video] });
    const live = await db.query<{
      revision: number;
      snapshot: { matchId: string; score: number[] };
    }>("select revision,snapshot from public.live_public");
    assert.equal(Number(live.rows[0].revision), 4);
    assert.deepEqual(live.rows[0].snapshot.score, [3, 2]);
    await assert.rejects(
      db.query("select public.update_match_videos($1,$2)", [
        "old",
        [{ ...video, youtubeId: "evil" }],
      ]),
      /invalid_videos/,
    );
    await assert.rejects(
      db.query("select public.update_match_videos($1,$2)", [
        "old",
        [{ ...video, startSeconds: -1 }],
      ]),
      /invalid_videos/,
    );
    await assert.rejects(
      db.query("select public.update_match_videos($1,$2)", [
        "missing",
        [video],
      ]),
      /match_not_found/,
    );
    await db.query("select public.update_match_videos($1,$2)", ["old", []]);
    assert.deepEqual(
      (
        await db.query<{ snapshot: typeof snapshot }>(
          "select snapshot from public.public_matches where match_id='old'",
        )
      ).rows[0].snapshot.videos,
      [],
    );
  } finally {
    await db.close();
  }
});
