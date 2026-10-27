import { useState } from "react";
import type { Match, ArchivedGame } from "./model";
import { project, stats } from "./engine";
import { parseMatch, download, csv } from "./storage";
import { matchCopies, readShelfCopy } from "./matchShelf";
import { cloud } from "./cloud";
import { Report } from "./pages/Report";
import { Analysis } from "./AnalysisView";
import { CriteriaReport } from "./CriteriaReport";
import { PlayerVideos } from "./PlayerVideos";
import { playerEvents } from "./assessment";
import { SocialCardExport } from "./SocialCardExport";
import { socialCardData } from "./socialCardData";
import { readMatchDocument } from "./matchDatabase";
export function HistoricalAnalysis({
  game,
  onSave,
}: {
  game: ArchivedGame;
  onSave: (full: Match) => boolean;
}) {
  const [source, M] = useState<Match | undefined>(game.fullMatch),
    [busy, B] = useState(false),
    [message, E] = useState(""),
    [view, V] = useState("report"),
    [period, S] = useState(0),
    [player, P] = useState("");
  const match = source
    ? { ...source, videos: game.videos ?? source.videos }
    : undefined;
  function accept(next: Match) {
    if (next.id !== game.id) throw Error("O arquivo pertence a outra partida.");
    if (!project(next).finished)
      throw Error(
        "A cópia ainda não está finalizada. Importe uma versão concluída.",
      );
    const full = {
      ...next,
      history: undefined,
      ...(game.videos ? { videos: game.videos } : {}),
    };
    if (!onSave(full))
      throw Error(
        "Não foi possível guardar a cópia completa no histórico. Verifique o armazenamento ou o bloqueio de edição.",
      );
    M(full);
    E("");
  }
  async function load() {
    B(true);
    E("");
    try {
      if (game.localSource) {
        accept(
          parseMatch(JSON.stringify(await readMatchDocument(game.localSource))),
        );
        return;
      }
      let local: Match | undefined;
      try {
        for (const c of await matchCopies()) {
          try {
            const next = readShelfCopy(c);
            if (next.id === game.id && project(next).finished) {
              local = next;
              break;
            }
          } catch {
            /* Skip invalid independent copies. */
          }
        }
      } catch {
        /* A synchronized account may still have the complete game. */
      }
      if (cloud) {
        const { data: auth } = await cloud.auth.getSession();
        if (auth.session) {
          const { data, error } = await cloud.rpc("scout_match_sync", {
            action: "read",
            game_id: game.id,
          });
          if (!error && data?.body) {
            try {
              accept(parseMatch(JSON.stringify(data.body)));
              return;
            } catch {
              /* Prefer the completed local copy over an unfinished remote revision. */
            }
          }
        }
      }
      if (local) {
        accept(local);
        return;
      }
      E(
        "Não encontramos a partida completa. Importe o JSON finalizado deste jogo; o resumo original continua abaixo.",
      );
    } catch (e) {
      E((e as Error).message);
    } finally {
      B(false);
    }
  }
  const events = match ? project(match).events : [];
  const picked = match?.players.find((p) => p.id === player);
  return (
    <section className="ui-card">
      <h2>Análise completa da partida</h2>
      <p className="ui-note">
        Consulta dos dados salvos. A partida atual e os registros originais não
        são alterados.
      </p>
      {!match ? (
        <>
          <button
            className="ui-btn"
            disabled={busy}
            onClick={() => void load()}
          >
            {busy ? "Buscando dados…" : "Abrir análise completa"}
          </button>
          <label className="ui-note">
            Ou importar JSON desta partida
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  accept(parseMatch(await file.text()));
                } catch (err) {
                  E((err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </label>
        </>
      ) : (
        <>
          <div className="report-switches">
            <button
              className="ui-btn"
              aria-pressed={view === "report"}
              onClick={() => V("report")}
            >
              Estatísticas
            </button>
            <button
              className="ui-btn"
              aria-pressed={view === "analysis"}
              onClick={() => V("analysis")}
            >
              Análise tática
            </button>
          </div>
          {view === "analysis" ? (
            <Analysis
              match={match}
              readOnly
              onTimeout={() => {}}
              onProfile={P}
            />
          ) : (
            <Report
              match={match}
              set={period}
              onSet={S}
              onProfile={P}
              onExportSummary={() =>
                download(
                  "relatorio-partida.csv",
                  csv([
                    ["jogador", "nota", "acoes", "pontos", "erros"],
                    ...match.players.map((p) => {
                      const s = stats(
                        playerEvents(
                          events.filter((e) => !period || e.set === period),
                          p.id,
                        ),
                        match.weights,
                        match.ratingProfiles,
                      );
                      return [p.name, s.rating, s.count, s.points, s.errors];
                    }),
                  ]),
                  "text/csv;charset=utf-8",
                )
              }
              onExportEvents={() =>
                download(
                  "acoes-partida.csv",
                  csv([
                    [
                      "set",
                      "rally",
                      "jogador",
                      "fundamento",
                      "resultado",
                      "direcao",
                      "video_ms",
                    ],
                    ...events
                      .filter((e) => !period || e.set === period)
                      .map((e) => [
                        e.set ?? "",
                        e.rally ?? "",
                        match.players.find((p) => p.id === e.playerId)?.name ??
                          "",
                        e.skill,
                        e.result,
                        e.assessment?.criteria?.attackDirection ?? "",
                        e.videoTimestampMs ?? "",
                      ]),
                  ]),
                  "text/csv;charset=utf-8",
                )
              }
            />
          )}
          <label>
            Jogador
            <select
              className="ui-select"
              value={player}
              onChange={(e) => P(e.target.value)}
            >
              <option value="">Selecione para ver detalhes e vídeos</option>
              {match.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {picked && (
            <section>
              <h3>{picked.name}</h3>
              <CriteriaReport
                title="Detalhes do jogador nesta partida"
                players={match.players}
                events={events}
                fixedPlayer={picked.id}
              />
              <PlayerVideos match={match} playerId={picked.id} />
              <SocialCardExport data={socialCardData(match, picked)} />
            </section>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
