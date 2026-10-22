import test from "node:test";
import assert from "node:assert/strict";
import {
  specialMarks,
  videoMoments,
  youtubeSourceId,
  formatVideoTime,
  validVideoMoments,
} from "./videoMoments";
import { newMatch, type RecordedEvent } from "./model";
import { normalAssessment } from "./assessment";
import { append, project } from "./engine";
import { gameSnapshot } from "./career";
import { parseMatch } from "./storage";
import { filterVideoMoments } from "./videoMoments";

test("borda de ponto usa o resultado da ação, não apenas o vencedor do rally", () => {
  const moments = videoMoments([
    event({ id: "good", result: "simple_good", videoTimestampMs: 1000 }),
    event({ id: "point", result: "simple_ours", videoTimestampMs: 2000 }),
    event({ id: "lost", result: "simple_theirs", videoTimestampMs: 3000 }),
  ]);
  assert.deepEqual(
    moments.map((m) => m.pointWon),
    [false, true, false],
  );
  assert.deepEqual(
    filterVideoMoments(moments, { special: "point" }).map((m) => m.id),
    ["point"],
  );
  assert.equal(validVideoMoments(moments), true);
  assert.equal(validVideoMoments([{ ...moments[0], pointWon: "true" }]), false);
  const { pointWon: _old, ...legacy } = moments[0];
  assert.equal(validVideoMoments([legacy]), true);
});

test("dupla na mesma ação difere de dupla no mesmo rally; toque sem horário conta como participação", () => {
  const moments = videoMoments([
    event({ id: "set", skill: "set", playerId: "p2", videoTimestampMs: 1000 }),
    event({ id: "attack", playerId: "p4" }),
    event({
      id: "block",
      rally: 2,
      skill: "block",
      playerId: "p2",
      participants: [{ playerId: "p4", responsibility: "correct" }],
      videoTimestampMs: 2000,
    }),
    event({ id: "other", set: 2, playerId: "p2", videoTimestampMs: 3000 }),
  ]);
  assert.deepEqual(
    filterVideoMoments(moments, {
      player: "p2",
      partner: "p4",
      mode: "action",
    }).map((m) => m.id),
    ["block"],
  );
  assert.deepEqual(
    filterVideoMoments(moments, {
      player: "p2",
      partner: "p4",
      mode: "rally",
    }).map((m) => m.id),
    ["set", "block"],
  );
  assert.deepEqual(
    filterVideoMoments(moments, {
      player: "p2",
      partner: "p4",
      mode: "rally",
      set: 2,
    }),
    [],
  );
  assert.deepEqual(
    filterVideoMoments(moments, { player: "p2", skill: "set" }).map(
      (m) => m.id,
    ),
    ["set"],
  );
});
test("filtros especiais não inventam flags em históricos antigos", () => {
  const moments = videoMoments([
    event({
      videoTimestampMs: 1,
      assessment: { ...normalAssessment(), tags: ["magic"] },
    }),
  ]);
  assert.equal(filterVideoMoments(moments, { special: "magic" }).length, 1);
  assert.equal(filterVideoMoments(moments, { special: "emergency" }).length, 1);
  assert.equal(
    filterVideoMoments(
      [{ ...moments[0], magic: undefined, emergency: undefined }],
      { special: "magic" },
    ).length,
    0,
  );
});

const event = (patch: Partial<RecordedEvent> = {}): RecordedEvent => ({
  id: "event1",
  set: 1,
  rally: 1,
  createdAt: new Date().toISOString(),
  rotation: 1,
  serving: "ours",
  scoreBefore: [0, 0],
  skill: "attack",
  result: "simple_good",
  playerId: "p1",
  ...patch,
});
test("cartola e emergência podem coexistir; dificuldade manual prevalece", () => {
  const a = { ...normalAssessment(), tags: ["magic"] };
  assert.deepEqual(specialMarks(event({ assessment: a })), {
    magic: true,
    emergency: true,
  });
  assert.deepEqual(
    specialMarks(
      event({
        assessment: { ...a, difficultySource: "manual", difficulty: "normal" },
      }),
    ),
    { magic: true, emergency: false },
  );
  assert.deepEqual(specialMarks(event()), { magic: false, emergency: false });
  assert.equal(
    specialMarks(
      event({ assessment: { ...normalAssessment(), tags: ["save_extreme"] } }),
    ).emergency,
    true,
  );
});
test("lances preservam fonte e participantes sem duplicar o autor", () => {
  const e = event({
    videoTimestampMs: 754200,
    videoSource: "youtube:abcdefghijk",
    participants: [
      { playerId: "p1", responsibility: "correct" },
      { playerId: "p2", responsibility: "correct" },
    ],
  });
  const moments = videoMoments([e, event({ id: "unmarked" })]);
  assert.equal(moments.length, 1);
  assert.deepEqual(moments[0].playerIds, ["p1", "p2"]);
  assert.equal(formatVideoTime(moments[0].videoTimestampMs), "12:34");
  assert.equal(youtubeSourceId(moments[0].videoSource), "abcdefghijk");
  assert.equal(youtubeSourceId("local.mp4|123|4"), undefined);
  assert.equal(youtubeSourceId("youtube:https://evil.test"), undefined);
  assert.equal(validVideoMoments(moments), true);
  assert.equal(
    validVideoMoments([{ ...moments[0], videoTimestampMs: -1 }]),
    false,
  );
});
test("histórico conserva lances após backup e aceita jogos antigos sem marcações", () => {
  const initial = newMatch();
  const m = append(initial, {
    type: "event",
    event: {
      skill: "attack",
      playerId: initial.initialLineup[1],
      result: "simple_ours",
      videoTimestampMs: 754000,
      videoSource: "youtube:abcdefghijk",
    },
  });
  const archived = gameSnapshot(m);
  assert.equal(archived.videoMoments?.length, 1);
  assert.equal(archived.videoMoments?.[0].rally, project(m).events[0].rally);
  const next = { ...newMatch(), history: [archived] };
  assert.equal(
    parseMatch(JSON.stringify(next)).history?.[0].videoMoments?.[0].videoSource,
    "youtube:abcdefghijk",
  );
  assert.doesNotThrow(() =>
    parseMatch(
      JSON.stringify({
        ...next,
        history: [{ ...archived, videoMoments: undefined }],
      }),
    ),
  );
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...next,
        history: [
          {
            ...archived,
            videoMoments: [{ ...archived.videoMoments![0], playerIds: "bad" }],
          },
        ],
      }),
    ),
  );
});
