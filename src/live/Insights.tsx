import {
  ArrowRight,
  History,
  PenLine,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  type AuditEntry,
  type Player,
  type Projection,
  resultOf,
  skills,
} from "../model";
import { Photo } from "../PlayerProfile";

type Stat = {
  rating: number | null;
  count: number;
  points: number;
  best?: { label: string };
  worst?: { label: string };
  reason: (row: any) => string;
};

export function RatingBadge({ value }: { value: number | null }) {
  const tone =
    value === null
      ? "empty"
      : value >= 6
        ? "good"
        : value >= 4
          ? "medium"
          : "bad";
  return (
    <span className={"ui-rating " + tone}>{value?.toFixed(1) ?? "—"}</span>
  );
}

export function TeamPulse({
  team,
  highlight,
  onStats,
}: {
  team: Stat;
  highlight?: Stat & { player: Player };
  onStats: () => void;
}) {
  const rating = team.rating;
  return (
    <section className="lv-card pulse" aria-labelledby="pulse-title">
      <header className="lv-card-head">
        <div>
          <h2 id="pulse-title">Pulso do time</h2>
          <p>Atualizado a cada ação</p>
        </div>
      </header>
      <div className="pulse-body">
        <div className="pulse-score">
          <span className="ui-eyebrow">Nota do time</span>
          <div>
            <strong key={rating?.toFixed(1)}>
              {rating?.toFixed(1) ?? "—"}
            </strong>
            <span>/10</span>
          </div>
          <div className="pulse-meter" aria-hidden="true">
            <i style={{ width: `${(rating ?? 0) * 10}%` }} />
          </div>
          <small>{team.count} ações registradas</small>
        </div>
        <div className="pulse-highlight">
          <span className="ui-eyebrow">
            <Trophy size={13} aria-hidden="true" /> Destaque
            {highlight && highlight.count < 3 ? " provisório" : ""}
          </span>
          {highlight ? (
            <div className="pulse-player">
              <Photo player={highlight.player} className="pulse-photo" />
              <div>
                <strong>{highlight.player.name}</strong>
                <small>
                  {highlight.points} pts · {highlight.count} ações
                </small>
              </div>
              <RatingBadge value={highlight.rating} />
            </div>
          ) : (
            <p className="lv-empty">
              Aparece após a primeira ação de um jogador.
            </p>
          )}
        </div>
        <div className="pulse-metric good">
          <span className="ui-eyebrow">
            <TrendingUp size={13} aria-hidden="true" /> Melhor fundamento
          </span>
          <strong>{team.best?.label ?? "Aguardando ações"}</strong>
          <small>{team.reason(team.best)}</small>
        </div>
        <div className="pulse-metric bad">
          <span className="ui-eyebrow">
            <TrendingDown size={13} aria-hidden="true" /> Para evoluir
          </span>
          <strong>{team.worst?.label ?? "Aguardando variedade"}</strong>
          <small>{team.reason(team.worst)}</small>
        </div>
      </div>
      <button type="button" className="lv-link" onClick={onStats}>
        Ver todas as estatísticas <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}

export function RecentActions({
  state,
  recent,
  label,
  playerName,
  onHistory,
  onCorrect,
  onFormation,
}: {
  state: Projection;
  recent: AuditEntry[];
  label: (entry: AuditEntry) => string;
  playerName: (id: string) => string;
  onHistory: () => void;
  onCorrect: (id: string) => void;
  onFormation: () => void;
}) {
  const s = state;
  const rally = s.rallies.at(-1);
  return (
    <section className="lv-card lv-recent" aria-labelledby="recent-title">
      <header className="lv-card-head">
        <div>
          <h2 id="recent-title">Últimas ações</h2>
          <p>Auditoria ativa · correções preservam o original</p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn--ghost ui-btn--sm"
          onClick={onHistory}
        >
          <History size={16} aria-hidden="true" />
          Histórico
        </button>
      </header>

      {rally && (
        <div
          className={"lv-rally " + rally.winner}
          aria-label="Resumo do último rally"
          key={`${rally.set}-${rally.rally}`}
        >
          <div className="lv-rally-head">
            <strong>
              Rally {rally.rally} ·{" "}
              {rally.winner === "ours" ? "Ponto nosso" : "Ponto deles"}
            </strong>
            <span>
              Set {rally.set} · {rally.score.join("–")}
            </span>
          </div>
          <div className="lv-rally-steps">
            {rally.events.length ? (
              rally.events.map((e) => (
                <span key={e.id}>
                  {skills[e.skill].label} · {resultOf(e).label}
                  {e.playerId ? " · " + playerName(e.playerId) : ""}
                </span>
              ))
            ) : (
              <span>Ponto sem fundamento identificado</span>
            )}
          </div>
        </div>
      )}

      <ol className="recent-list">
        {recent.length ? (
          recent.map((e) => {
            const ev = s.events.find((v) => v.id === e.id);
            const win =
              e.command?.type === "point"
                ? e.command.winner
                : ev
                  ? (ev.winner ?? resultOf(ev).winner)
                  : undefined;
            return (
              <li key={e.id} className="recent-item">
                <span
                  className={"recent-dot " + (win ?? "")}
                  aria-hidden="true"
                />
                <span className="recent-rally">
                  R{ev?.rally ?? e.context?.rally}
                </span>
                <span className="recent-label">{label(e)}</span>
                <time>
                  {new Date(e.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {ev?.playerId && (
                  <button
                    type="button"
                    className="ui-icon-btn ui-icon-btn--sm"
                    aria-label={"Trocar jogador de " + label(e)}
                    title="Trocar jogador"
                    onClick={() => onCorrect(e.id)}
                  >
                    <PenLine size={16} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })
        ) : (
          <li className="recent-empty">
            <span>
              Prontos para o primeiro saque. Suas ações aparecerão aqui.
            </span>
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--sm"
              onClick={onFormation}
            >
              Definir formação inicial
            </button>
          </li>
        )}
      </ol>
    </section>
  );
}
