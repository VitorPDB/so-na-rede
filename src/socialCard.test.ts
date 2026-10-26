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

test("card ofensivo deriva pontos/aces/precisão e respeita desfazer", () => {
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
  assert.equal(card.metrics[3].value, "50%");
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

test("precisão inclui bolas mantidas e destaque é exclusivamente manual", () => {
  let m = newMatch();
  const p = m.players[0];
  for (const result of ["simple_ours", "simple_good", "simple_theirs"] as const)
    m = append(m, {
      type: "event",
      event: { skill: "attack", result, playerId: p.id },
    });
  assert.equal(socialCardData(m, p).metrics[3].value, "67%");
  assert.equal(socialCardData(m, p).highlight, false);
  m.socialHighlightPlayerId = p.id;
  assert.equal(socialCardData(m, p).highlight, true);
  assert.equal(socialCardData(m, m.players[1]).highlight, false);
});
test("salvadas difíceis não contam erros nem duplicam tags, ace tem prioridade", () => {
  let m = newMatch();
  const p = m.players[0];
  const a = initialAssessment("defense", "simple_good");
  a.difficulty = "hard";
  a.tags = ["save_extreme"];
  m = append(m, {
    type: "event",
    event: {
      skill: "defense",
      result: "simple_good",
      playerId: p.id,
      assessment: a,
    },
  });
  m = append(m, {
    type: "event",
    event: { skill: "defense", result: "simple_good", playerId: p.id },
  });
  const error = initialAssessment("defense", "simple_theirs");
  error.difficulty = "emergency";
  m = append(m, {
    type: "event",
    event: {
      skill: "defense",
      result: "simple_theirs",
      playerId: p.id,
      assessment: error,
    },
  });
  const card = socialCardData(m, p);
  assert.equal(card.metrics[1].label, "SALVADAS DIFÍCEIS");
  assert.equal(card.metrics[1].value, "1");
  assert.equal(socialCardData(undo(undo(undo(m))), p).metrics[1].value, "0");
});

test("histórico remove e restaura sem mudar a partida atual nem duplicar jogos", async () => {
  const { removeArchivedMatch, restoreArchivedMatch } =
    await import("./historyActions");
  const { archiveGame } = await import("./career");
  const old = append(newMatch(), {
    type: "event",
    event: { skill: "attack", result: "simple_good", playerId: "p1" },
  });
  const m = { ...newMatch(), history: archiveGame(old) };
  const game = m.history[0];
  const removed = removeArchivedMatch(m, game.id);
  assert.equal(removed.history?.length, 0);
  assert.equal(removed.id, m.id);
  assert.equal(removed.audit, m.audit);
  assert.equal(removeArchivedMatch(m, m.id), m);
  const restored = restoreArchivedMatch(removed, game);
  assert.deepEqual(restored.history, m.history);
  assert.equal(restoreArchivedMatch(restored, game).history?.length, 1);
});

test("portal agrega qualidade por volume sem NaN e não inventa dados ausentes", async () => {
  const { playerRecap, parseOpenGames } = await import("./openPlayerData");
  const { publicSnapshot } = await import("./publicSnapshot");
  const m = append(newMatch(), {
    type: "event",
    event: { skill: "attack", result: "simple_good", playerId: "p1" },
  });
  const g = {
    snapshot: publicSnapshot(m),
    media: { photos: {}, opponentLogo: null },
    moments: [],
    cards: [],
  };
  const recap = playerRecap(parseOpenGames([g, g]), "p1");
  assert.equal(recap.count, 2);
  assert.equal(recap.metrics.length, 1);
  assert.ok(Number.isFinite(recap.metrics[0].quality));
  assert.equal(playerRecap([g], "missing").rating, null);
  assert.throws(() => parseOpenGames([{ snapshot: {}, moments: [] }]));
});

test("histórico completo preserva eventos sem aninhar partidas e rejeita jogo incompleto", async () => {
  const { archiveGame } = await import("./career");
  const { parseMatch } = await import("./storage");
  const { project } = await import("./engine");
  let finished = newMatch();
  finished.bestOf = 3;
  for (let set = 0; set < 2; set++) {
    for (let point = 0; point < 25; point++)
      finished = append(finished, { type: "point", winner: "ours" });
    if (set === 0)
      finished = append(finished, {
        type: "nextSet",
        lineup: finished.initialLineup,
        server: "ours",
      });
  }
  assert.equal(project(finished).finished, true);
  finished.history = [{ ...archiveGame(finished)[0], id: "older" }];
  const saved = archiveGame(finished).find((g) => g.id === finished.id)!;
  assert.equal(saved.fullMatch?.history, undefined);
  assert.deepEqual(saved.fullMatch?.audit, finished.audit);
  const next = { ...newMatch(), history: [saved] };
  const restored = parseMatch(JSON.stringify(next));
  assert.deepEqual(restored.history?.[0].fullMatch?.audit, finished.audit);
  assert.throws(() =>
    parseMatch(
      JSON.stringify({
        ...next,
        history: [
          {
            ...saved,
            fullMatch: { ...finished, audit: [], history: undefined },
          },
        ],
      }),
    ),
  );
});
