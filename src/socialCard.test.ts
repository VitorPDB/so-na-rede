import test from "node:test";
import assert from "node:assert/strict";
import { newMatch } from "./model";
import { append, undo } from "./engine";
import {
  socialCardData,
  publicationCards,
  validSocialCardData,
} from "./socialCardData";
import {
  videoPositionKey,
  readVideoPosition,
  saveVideoPosition,
} from "./videoPosition";
import { initialAssessment } from "./actionQuality";

test("card ofensivo deriva pontos/aces/eficiência e respeita desfazer", () => {
  let m = newMatch();
  const p = m.players[0];
  m = append(m, {
    type: "event",
    event: { skill: "attack", result: "simple_ours", playerId: p.id },
  });
  m = append(m, {
    type: "event",
    event: { skill: "attack", result: "simple_theirs", playerId: p.id },
  });

  let card = socialCardData(m, p);
  assert.equal(validSocialCardData(card), true);
  assert.equal(card.metrics[1].value, "0");
  assert.equal(card.metrics[3].value, "0%");
  card = socialCardData(undo(m), p);
  assert.equal(card.metrics[3].value, "100%");
  const ace = newMatch();
  const server = ace.players.find((p) => p.id === ace.initialLineup[0])!;
  assert.equal(
    socialCardData(
      append(ace, {
        type: "event",
        event: { skill: "serve", result: "simple_ours", playerId: server.id },
      }),
      server,
    ).metrics[1].value,
    "1",
  );
  assert.equal(socialCardData(newMatch(), p).metrics[3].value, "—");
});
test("líbero usa somente ABC registrado e nunca inventa precisão ausente", () => {
  let m = newMatch();
  const p = { ...m.players[0], libero: true };
  const a = initialAssessment("reception", "simple_good");
  a.criteria = { passQuality: "A" };
  m = append(m, {
    type: "event",
    event: {
      skill: "reception",
      result: "simple_good",
      playerId: p.id,
      assessment: a,
    },
  });
  m = append(m, {
    type: "event",
    event: { skill: "reception", result: "simple_good", playerId: p.id },
  });
  const card = socialCardData(m, p);
  assert.equal(card.metrics[0].value, "100%");
  assert.equal(card.metrics[1].value, "100%");
  assert.match(card.note, /1\/2 recepções/);
  assert.equal(
    card.metrics.some((m) => m.label === "ACES"),
    false,
  );
});
test("cards publicados não duplicam fotos e payload recebido é validado", () => {
  const m = newMatch();
  m.players[0].photo = {
    dataUrl: "data:image/png;base64,AA==",
    x: 50,
    y: 50,
    zoom: 1,
  };
  const cards = publicationCards(m);
  assert.equal("photo" in cards[0].player, false);
  assert.equal(validSocialCardData({ ...cards[0], metrics: [] }), false);
  assert.equal(validSocialCardData({ ...cards[0], rating: NaN }), false);
});
test("posição do vídeo isolada por partida, set, fonte e início; zero é válido", () => {
  const key = videoPositionKey("m1", 1, "abc", 0);
  saveVideoPosition(key, 363.25);
  assert.equal(readVideoPosition(key), 363.25);
  for (const k of [
    videoPositionKey("m2", 1, "abc", 0),
    videoPositionKey("m1", 2, "abc", 0),
    videoPositionKey("m1", 1, "def", 0),
    videoPositionKey("m1", 1, "abc", 10),
  ])
    assert.equal(readVideoPosition(k), undefined);
  saveVideoPosition(key, NaN);
  assert.equal(readVideoPosition(key), 363.25);
  saveVideoPosition(key, 0);
  assert.equal(readVideoPosition(key), 0);
});
