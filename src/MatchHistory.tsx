import { useState } from "react";
import { Clock3 } from "lucide-react";
import { Photo } from "./PlayerPhoto";
import type { Match, PlayerGame } from "./model";

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
export function MatchHistory({ match }: { match: Match }) {
  const games = [...(match.history ?? [])]
    .filter((g) => g.id !== match.id)
    .reverse();
  const [selected, setSelected] = useState("");
  const [period, setPeriod] = useState(0);
  const game = games.find((g) => g.id === selected);
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
        <select
          className="ui-select"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setPeriod(0);
          }}
        >
          <option value="">Selecione uma partida</option>
          {games.map((g) => (
            <option value={g.id} key={g.id}>
              {new Date(g.date).toLocaleDateString("pt-BR")} · {g.opponent} ·{" "}
              {g.sets[0]}–{g.sets[1]}
              {g.finished ? "" : " · incompleta"}
            </option>
          ))}
        </select>
      </label>
      {!games.length && (
        <p className="ui-note">
          Ao iniciar o próximo jogo, o relatório deste será preservado aqui.
        </p>
      )}
      {game && (
        <>
          <div className="pub-toolbar">
            <h3>
              {match.team} × {game.opponent} · {game.sets[0]}–{game.sets[1]}
            </h3>
            {snapshot && (
              <label>
                <span className="ui-eyebrow">Período do histórico</span>
                <select
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
                </select>
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
                        <b>{m.label}</b>
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
