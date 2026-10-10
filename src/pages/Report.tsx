import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { type Match, ratingProfiles, roleLabels } from "../model";
import { metrics, project, stats } from "../engine";
import { playerEvents } from "../assessment";
import { ExecutionSummary } from "../ExecutionSummary";
import { Photo } from "../PlayerProfile";
import { RatingBadge } from "../live/Insights";

export function Report({
  match,
  set,
  onSet,
  onExportSummary,
  onExportEvents,
  onProfile,
}: {
  match: Match;
  set: number;
  onSet: (set: number) => void;
  onExportSummary: () => void;
  onExportEvents: () => void;
  onProfile: (id: string) => void;
}) {
  const [sort, setSort] = useState<"rating" | "count" | "points" | "errors">(
    "rating",
  );
  const s = project(match);
  const events = s.events.filter((e) => !set || e.set === set);
  const collective = stats(events, match.weights);
  const rows = match.players
    .map((player) => ({
      player,
      ...stats(
        playerEvents(events, player.id),
        match.weights,
        match.ratingProfiles ?? ratingProfiles,
      ),
    }))
    .sort((a, b) =>
      sort === "rating"
        ? (b.rating ?? -1) - (a.rating ?? -1)
        : (b[sort] as number) - (a[sort] as number),
    );
  const ranked = [...rows].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  const highlight =
    ranked.find((p) => p.count >= 3) ?? ranked.find((p) => p.count);
  const list = metrics(events);
  const columns = [
    ["rating", "Nota"],
    ["count", "Ações"],
    ["points", "Pontos"],
    ["errors", "Erros"],
  ] as const;

  return (
    <div className="rp">
      <div className="an-toolbar">
        <div className="ui-chips" role="radiogroup" aria-label="Recorte">
          {[0, ...Array.from({ length: s.set }, (_, i) => i + 1)].map((n) => (
            <button
              type="button"
              key={n}
              role="radio"
              aria-checked={set === n}
              onClick={() => onSet(n)}
            >
              {n ? `Set ${n}` : "Jogo completo"}
            </button>
          ))}
        </div>
        <div className="rp-exports">
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            onClick={onExportSummary}
          >
            <FileSpreadsheet size={16} aria-hidden="true" />
            Resumo CSV
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            onClick={onExportEvents}
          >
            <Download size={16} aria-hidden="true" />
            Eventos CSV
          </button>
        </div>
      </div>

      <div className="rp-kpis">
        <section className="ui-card rp-kpi gold">
          <span className="ui-eyebrow">
            <Trophy size={13} aria-hidden="true" /> Destaque
            {highlight && highlight.count < 3 ? " provisório" : " do time"}
          </span>
          {highlight ? (
            <button
              type="button"
              className="an-player-link"
              onClick={() => onProfile(highlight.player.id)}
            >
              <Photo player={highlight.player} className="an-photo" />
              <span>
                <strong>{highlight.player.name}</strong>
                <small>
                  {highlight.best?.label} · {highlight.reason(highlight.best)}
                </small>
              </span>
              <span className="an-grade">{highlight.rating?.toFixed(1)}</span>
            </button>
          ) : (
            <p className="ui-empty">Registre ações para gerar a análise.</p>
          )}
        </section>
        <section className="ui-card rp-kpi good">
          <span className="ui-eyebrow">
            <TrendingUp size={13} aria-hidden="true" /> Melhor estatística
          </span>
          <strong>{collective.best?.label ?? "Sem dados"}</strong>
          <small>{collective.reason(collective.best)}</small>
        </section>
        <section className="ui-card rp-kpi bad">
          <span className="ui-eyebrow">
            <TrendingDown size={13} aria-hidden="true" /> Pior estatística
          </span>
          <strong>
            {collective.worst?.label ?? "Sem variedade suficiente"}
          </strong>
          <small>{collective.reason(collective.worst)}</small>
        </section>
      </div>

      <section className="ui-card">
        <header className="ui-card-head">
          <div>
            <h2>Desempenho individual</h2>
            <p>
              {set ? `Set ${set}` : "Jogo completo"} · {events.length} ações ·
              nota experimental, com amostra indicada
            </p>
          </div>
        </header>
        <div className="ui-table-wrap">
          <table className="ui-table rp-table">
            <thead>
              <tr>
                <th scope="col">Jogador</th>
                {columns.map(([key, label]) => (
                  <th
                    scope="col"
                    key={key}
                    className="num"
                    aria-sort={sort === key ? "descending" : "none"}
                  >
                    <button
                      type="button"
                      className={"ui-sort" + (sort === key ? " is-active" : "")}
                      onClick={() => setSort(key)}
                    >
                      {label}
                    </button>
                  </th>
                ))}
                <th scope="col">Melhor</th>
                <th scope="col">Pior</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.player.id}>
                  <td>
                    <button
                      type="button"
                      className="rp-player"
                      onClick={() => onProfile(row.player.id)}
                    >
                      <Photo player={row.player} className="rp-photo" />
                      <span>
                        <strong>{row.player.name}</strong>
                        <small>
                          {[
                            ...new Set(
                              playerEvents(events, row.player.id)
                                .map((e) => e.role)
                                .filter(Boolean),
                            ),
                          ]
                            .map((role) => roleLabels[role!])
                            .join(" · ") || "Sem ações"}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td className="num">
                    <RatingBadge value={row.rating} />
                  </td>
                  <td className="num">
                    {row.count}
                    {row.count > 0 && row.count < 3 && (
                      <small className="rp-low">amostra baixa</small>
                    )}
                  </td>
                  <td className="num">{row.points}</td>
                  <td className="num">{row.errors}</td>
                  <td>
                    <strong>{row.best?.label ?? "—"}</strong>
                    <small>{row.reason(row.best)}</small>
                  </td>
                  <td>
                    <strong>{row.worst?.label ?? "—"}</strong>
                    <small>{row.reason(row.worst)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ExecutionSummary events={events} />

      <div className="rp-bottom">
        <section className="ui-card">
          <header className="ui-card-head">
            <div>
              <h2>Fundamentos do time</h2>
              <p>Qualidade normalizada, sem suavização</p>
            </div>
          </header>
          <div className="rp-quality">
            {list.map((m) => (
              <div className="rp-quality-row" key={m.skill}>
                <span>{m.label}</span>
                <span className="ui-meter" aria-hidden="true">
                  <i style={{ width: `${m.quality * 100}%` }} />
                </span>
                <strong>
                  {m.count ? `${Math.round(m.quality * 100)}%` : "—"}
                </strong>
                <small>{m.count} ações</small>
              </div>
            ))}
          </div>
        </section>
        <section className="ui-card">
          <header className="ui-card-head">
            <div>
              <h2>Resumo por set</h2>
              <p>
                {s.sets.join(" – ")} em sets ·{" "}
                {s.finished ? "partida encerrada" : "partida em andamento"}
              </p>
            </div>
          </header>
          <div className="rp-sets">
            {Array.from({ length: s.set }, (_, i) => i + 1).map((n) => {
              const summary = s.completed.find((x) => x.set === n);
              const evs = s.events.filter((x) => x.set === n);
              const state = summary
                ? summary.winner === "ours"
                  ? "won"
                  : "lost"
                : "live";
              return (
                <div className={"rp-set is-" + state} key={n}>
                  <span>Set {n}</span>
                  <strong>{(summary?.score ?? s.score).join(" – ")}</strong>
                  <small>{evs.length} ações</small>
                  <b>
                    {state === "won"
                      ? "Vitória"
                      : state === "lost"
                        ? "Derrota"
                        : "Em andamento"}
                  </b>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
