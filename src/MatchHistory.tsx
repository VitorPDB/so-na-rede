import { HistoricalAnalysis } from "./HistoricalAnalysis";
import { project } from "./engine";
import { CriteriaReport } from "./CriteriaReport";
import { MomentBrowser } from "./MomentBrowser";
import { SkillIcon } from "./SkillIcon";
import { CardSelect } from "./CardSelect";
import { useState } from "react";
import { Clock3 } from "lucide-react";
import { Photo } from "./PlayerPhoto";
import type { Match, PlayerGame } from "./model";
import { MatchVideoEditor, MatchVideoPlayer } from "./MatchVideos";
import { archiveVideos, attachArchiveVideos } from "./videos";
import { cloud } from "./cloud";

const grade = (n: number | null) => (n === null ? "—" : n.toFixed(1));
function extremes(metrics: PlayerGame["metrics"]) {
  const ordered = metrics
    .filter((m) => m.count)
    .sort((a, b) => b.quality - a.quality);
  return {
    best: ordered[0]?.label ?? "—",
    worst: ordered.at(-1)?.label ?? "—",
  };
}
export function MatchHistory({
  match,
  onChange,
  selected,
  onSelect,
}: {
  match: Match;
  selected: string;
  onSelect: (id: string) => void;
  onChange: (match: Match) => boolean;
}) {
  const games = [...(match.history ?? [])]
    .filter((g) => g.id !== match.id)
    .reverse();
  const setSelected = onSelect;
  const [period, setPeriod] = useState(0);
  const [videoStatus, setVideoStatus] = useState("");
  const [publishing, setPublishing] = useState(false);
  const game = games.find((g) => g.id === selected && g.finished);
  const snapshot = game?.publicData;
  const bySet = snapshot?.periods?.find((p) => p.set === period);
  const data = bySet ?? snapshot;
  const rows =
    game?.players.map((p) => {
      const player = match.players.find((q) => q.id === p.playerId);
      const stats = data?.players.find((q) => q.id === p.playerId)?.stats;
      const e = extremes(p.metrics);
      return {
        id: p.playerId,
        name:
          snapshot?.players.find((q) => q.id === p.playerId)?.name ??
          player?.name ??
          p.playerId,
        player,
        rating: stats ? stats.rating : p.rating,
        count: stats?.count ?? p.count,
        points: stats?.points ?? p.points,
        errors: stats?.errors ?? p.errors,
        best: stats ? (stats.best?.label ?? "—") : e.best,
        worst: stats ? (stats.worst?.label ?? "—") : e.worst,
        metrics: stats?.metrics ?? p.metrics,
      };
    }) ?? [];
  const highlight = data
    ? rows.find((p) => p.id === data.highlight)
    : [...rows]
        .filter((p) => p.rating !== null)
        .sort((a, b) => b.rating! - a.rating!)[0];
  if (!project(match).finished)
    return (
      <section className="ui-card">
        <h2>Finalize a partida atual</h2>
        <p>
          As estatísticas das outras partidas serão liberadas depois que o jogo
          atual terminar. Os dados do histórico continuam salvos.
        </p>
      </section>
    );
  return (
    <section
      className="ui-card pub-section"
      aria-label="Partidas salvas no tablet"
    >
      <header>
        <div>
          <span className="ui-eyebrow">
            <Clock3 size={16} aria-hidden="true" /> Memória do time
          </span>
          <h2>Partidas anteriores</h2>
          <p className="ui-note">
            Salvas neste dispositivo ao iniciar uma nova partida.
          </p>
        </div>
      </header>
      <label className="pub-history-select">
        <span className="ui-eyebrow">Escolher partida</span>
        <CardSelect
          className="ui-select"
          value={selected}
          disabled={publishing}
          onChange={(e) => {
            setSelected(e.target.value);
            setPeriod(0);
            setVideoStatus("");
          }}
        >
          <option value="">Selecione uma partida</option>
          {games.map((g) => (
            <option value={g.id} key={g.id} disabled={!g.finished}>
              {new Date(g.date).toLocaleDateString("pt-BR")} · {g.opponent} ·{" "}
              {g.sets[0]}–{g.sets[1]}
              {g.finished ? "" : " · incompleta"}
            </option>
          ))}
        </CardSelect>
      </label>
      {!games.length && (
        <p className="ui-note">
          Ao iniciar o próximo jogo, o relatório deste será preservado aqui.
        </p>
      )}
      {game && (
        <>
          <HistoricalAnalysis
            key={game.id}
            game={game}
            onSave={(full) =>
              onChange({
                ...match,
                history: match.history?.map((g) =>
                  g.id === game.id ? { ...g, fullMatch: full } : g,
                ),
              })
            }
          />
          <MatchVideoEditor
            key={game.id}
            videos={archiveVideos(game)}
            onChange={(videos) => {
              if (publishing) return false;
              const saved = onChange(
                attachArchiveVideos(match, game.id, videos),
              );
              if (saved)
                setVideoStatus(
                  "Alterações locais salvas. Publique os vídeos para atualizar a página dos fãs.",
                );
              return saved;
            }}
          />
          <div className="video-actions">
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              disabled={publishing || !game.finished || !cloud}
              onClick={async () => {
                setPublishing(true);
                setVideoStatus("");
                try {
                  if (!cloud)
                    throw new Error(
                      "Configure o Supabase para publicar os vídeos.",
                    );
                  const { data: auth } = await cloud.auth.getSession();
                  if (!auth.session)
                    throw new Error(
                      "Entre com a comissão em Ajustes → Publicação antes de publicar vídeos.",
                    );
                  const { error } = await cloud.rpc("update_match_videos", {
                    target_match_id: game.id,
                    new_videos: archiveVideos(game),
                  });
                  if (error)
                    throw new Error(
                      error.message.includes("update_match_videos")
                        ? "Execute o SQL de vídeos no Supabase para habilitar esta atualização."
                        : error.message.includes("match_not_found")
                          ? "Esta partida ainda não está no histórico público. Os vídeos continuam salvos localmente."
                          : error.message.includes("not_authorized")
                            ? "Este usuário não está autorizado como comissão no Supabase."
                            : error.message,
                    );
                  setVideoStatus(
                    "Vídeos publicados. As estatísticas da partida foram preservadas.",
                  );
                } catch (e) {
                  setVideoStatus(
                    e instanceof Error
                      ? e.message
                      : "Não foi possível publicar. Os vídeos permanecem salvos localmente.",
                  );
                } finally {
                  setPublishing(false);
                }
              }}
            >
              {publishing
                ? "Publicando vídeos…"
                : "Publicar vídeos no histórico público"}
            </button>
            <a
              className="ui-btn ui-btn--secondary"
              href="/videos-setup.sql"
              download
            >
              Baixar SQL de vídeos
            </a>
          </div>
          {videoStatus && (
            <p role="status" className="ui-note">
              {videoStatus}
            </p>
          )}
          {!cloud && (
            <p className="ui-note">
              Vídeos salvos neste dispositivo. Configure a publicação para
              disponibilizá-los aos fãs.
            </p>
          )}
          <MatchVideoPlayer
            key={"player:" + game.id}
            videos={archiveVideos(game)}
            finished
          />
          <div className="pub-toolbar">
            <h3>
              {match.team} × {game.opponent} · {game.sets[0]}–{game.sets[1]}
            </h3>
            {snapshot && (
              <label>
                <span className="ui-eyebrow">Período do histórico</span>
                <CardSelect
                  aria-label="Período da partida salva"
                  className="ui-select"
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                >
                  <option value={0}>Partida completa</option>
                  {snapshot.periods.map((s) => (
                    <option key={s.set} value={s.set}>
                      Set {s.set}
                    </option>
                  ))}
                </CardSelect>
              </label>
            )}
          </div>
          {!snapshot && (
            <p className="ui-note">
              Resumo antigo: notas e fundamentos da partida completa. Não há
              registro por set neste arquivo.
            </p>
          )}
          <div className="pub-history-summary">
            <p>
              <b>Destaque:</b> {highlight?.name ?? "Sem ações avaliadas"}
              {data?.provisional ? " · amostra baixa" : ""}
            </p>
            {data && (
              <>
                <p>
                  <b>Melhor fundamento:</b> {data.teamStats.best?.label ?? "—"}{" "}
                  · {data.teamStats.best?.reason}
                </p>
                <p>
                  <b>Para melhorar:</b> {data.teamStats.worst?.label ?? "—"} ·{" "}
                  {data.teamStats.worst?.reason}
                </p>
              </>
            )}
          </div>
          {snapshot && data?.technical && (
            <CriteriaReport
              key={game.id + ":" + period}
              title="Detalhes técnicos salvos"
              players={snapshot.players}
              aggregateData={data.technical}
            />
          )}
          {!!game.videoMoments?.length && (
            <MomentBrowser
              moments={game.videoMoments.filter(
                (m) => !period || m.set === period,
              )}
              players={(snapshot?.players ?? match.players).map((p) => ({
                ...p,
                positions: [],
                libero: false,
              }))}
            />
          )}
          <div className="pub-players">
            {rows.map((p) => (
              <article className="ui-card pub-player" key={p.id}>
                <div className="pub-player-head">
                  {p.player && (
                    <Photo player={p.player} className="pub-avatar" />
                  )}
                  <div>
                    <h3>{p.name}</h3>
                    <span>
                      {p.count} ações · {p.points} pontos · {p.errors}{" "}
                      gafes/erros
                    </span>
                  </div>
                  <strong>{grade(p.rating)}</strong>
                </div>
                <p>
                  <b>Melhor:</b> {p.best} · <b>Pior:</b> {p.worst}
                </p>
                <div className="pub-history-metrics">
                  {p.metrics
                    .filter((m) => m.count)
                    .map((m) => (
                      <span key={m.skill}>
                        <b>
                          <SkillIcon skill={m.skill} /> {m.label}
                        </b>
                        {m.count} ações · {(m.quality * 100).toFixed(0)}% de
                        qualidade · {m.errors} erros
                      </span>
                    ))}
                </div>
              </article>
            ))}
          </div>
          {snapshot && (
            <div>
              <h3>Histórico de pontos</h3>
              <div className="pub-point-history">
                {snapshot.rallies
                  .filter((r) => !period || r.set === period)
                  .map((r, i) => (
                    <span
                      className={`pub-point ${r.winner === "ours" ? "won" : "lost"}`}
                      key={i}
                      title={`Set ${r.set}, rally ${r.rally}`}
                    >
                      {r.score[0]}–{r.score[1]}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
