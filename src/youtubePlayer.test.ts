import test from "node:test";
import assert from "node:assert/strict";
import { captureYoutubeMoment, type YoutubePlayer } from "./youtubePlayer";
const fake = (patch: Partial<YoutubePlayer> = {}): YoutubePlayer => ({
  getCurrentTime: () => 754.125,
  getVideoData: () => ({ video_id: "abcdefghijk" }),
  getPlayerState: () => 1,
  pauseVideo() {},
  playVideo() {},
  seekTo() {},
  destroy() {},
  ...patch,
});
test("captura o relógio antes de pausar e não usa o horário de confirmação", () => {
  let time = 754.125;
  let paused = false;
  const p = fake({
    getCurrentTime: () => time,
    pauseVideo() {
      paused = true;
      time = 800;
    },
  });
  const stamp = captureYoutubeMoment(p, "abcdefghijk");
  assert.equal(paused, true);
  assert.deepEqual(stamp, {
    videoTimestampMs: 754125,
    videoSource: "youtube:abcdefghijk",
  });
  time = 900;
  assert.equal(stamp.videoTimestampMs, 754125);
});
test("não marca vídeo errado, player sem reprodução, carregando ou horário inválido", () => {
  for (const state of [-1, 0, 3, 5])
    assert.throws(() =>
      captureYoutubeMoment(
        fake({ getPlayerState: () => state }),
        "abcdefghijk",
      ),
    );
  assert.throws(() => captureYoutubeMoment(fake(), "other_video"));
  assert.throws(() =>
    captureYoutubeMoment(fake({ getCurrentTime: () => NaN }), "abcdefghijk"),
  );
  assert.throws(() =>
    captureYoutubeMoment(fake({ getCurrentTime: () => -1 }), "abcdefghijk"),
  );
  assert.equal(
    captureYoutubeMoment(
      fake({ getPlayerState: () => 2, getCurrentTime: () => 0 }),
      "abcdefghijk",
    ).videoTimestampMs,
    0,
  );
});
