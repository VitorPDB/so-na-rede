import { SkillIcon } from "./SkillIcon";
import { Jersey } from "./Jersey";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Flame,
  Flag,
  Hourglass,
  Target,
  Trophy,
  Volleyball,
} from "lucide-react";
import {
  type Match,
  type Side,
  type Zone,
  type RallySummary,
  roleLabels,
  skills,
  resultOf,
} from "./model";
import { project } from "./engine";
import { matchAnalysis, wonWindow } from "./analysis";
import { Photo } from "./PlayerProfile";
import { ExecutionSummary } from "./ExecutionSummary";

export function TimeoutControls({
  match,
  onTimeout,
  disabled = false,
}: {
  match: Match;
  onTimeout: (side: Side) => void;
  disabled?: boolean;
}) {
  const s = project(match);
  const open = s.events.some((e) => e.set === s.set && e.rally === s.rally);
  return (
    <section className="an-timeouts" aria-label="Pedidos de tempo">
      <div>
        <strong>Pedidos de tempo · set {s.set}</strong>
        <small>
          {open
            ? "Encerre o rally para registrar um tempo."
            : "Até dois pedidos por time no set."}
        </small>
      </div>
      {(["ours", "theirs"] as Side[]).map((side) => {
        const used = s.markers.filter(
          (m) =>
            m.set === s.set &&
            m.command.type === "timeout" &&
            m.command.side === side,
        ).length;
        return (
          <button
            type="button"
            className="sb-timeout"
            key={side}
            aria-label={
              side === "ours"
                ? "Registrar tempo nosso"
                : "Registrar tempo deles"
            }
            disabled={
              disabled || open || s.finished || s.setFinished || used >= 2
            }
            onClick={() => onTimeout(side)}
          >
            <Hourglass size={16} aria-hidden="true" />
            {side === "ours" ? "Nosso" : "Deles"}
            <span className="sb-timeout-count" aria-hidden="true">
              {[0, 1].map((i) => (
                <i key={i} className={i < used ? "used" : ""} />
              ))}
            </span>
            <span className="sr-only">{used} de 2 usados</span>
          </button>
        );
      })}
    </section>
  );
}

function ScoreChart({
  rallies,
  markers,
}: {
  rallies: RallySummary[];
  markers: ReturnType<typeof matchAnalysis>["markers"];
}) {
  const count = rallies.length;
  const max = Math.max(5, ...rallies.flatMap((r) => r.score));
  const x = (i: number) => 40 + (i / Math.max(1, count)) * 820;
  const y = (n: number) => 210 - (n / max) * 175;
  const points = (side: 0 | 1) =>
    [[x(0), y(0)], ...rallies.map((r, i) => [x(i + 1), y(r.score[side])])]
      .map((p) => p.join(","))
      .join(" ");
  return (
    <svg
      className="score-chart"
      viewBox="0 0 900 250"
      role="img"
      aria-label={`Evolução do placar no set ${rallies[0]?.set ?? ""}. Linha clara: nosso time. Linha cinza: adversário.`}
    >
      {[0, Math.round(max / 2), max].map((n) => (
        <g key={n}>
          <line
            x1="40"
            x2="860"
            y1={y(n)}
            y2={y(n)}
            stroke="currentColor"
            opacity=".15"
          />
          <text className="an-axis" x="12" y={y(n) + 4}>
            {n}
          </text>
        </g>
      ))}
      <polyline
        points={points(0)}
        fill="none"
        stroke="var(--analysis-ours)"
        strokeWidth="3"
        strokeLinejoin="round"
        className="an-line"
      />
      <polyline
        points={points(1)}
        fill="none"
        stroke="var(--analysis-theirs)"
        strokeWidth="3"
        strokeLinejoin="round"
        className="an-line"
      />
      {markers.map((m) => {
        const position = rallies.filter((r) => r.rally < m.rally).length;
        return (
          <g key={m.id}>
            <line
              x1={x(position)}
              x2={x(position)}
              y1="20"
              y2="215"
              stroke="var(--analysis-marker)"
              strokeDasharray="4 5"
              opacity=".7"
            />
            <text
              className="an-axis"
              x={x(position)}
              y="16"
              textAnchor="middle"
            >
              {m.command.type === "timeout" ? "T" : "↔"}
            </text>
          </g>
        );
      })}
      {rallies.map((r, i) => (
        <circle
          key={r.id}
          cx={x(i + 1)}
          cy={y(r.score[r.winner === "ours" ? 0 : 1])}
          r="5"
          className={"an-dot " + r.winner}
          style={{ animationDelay: `${Math.min(i, 40) * 12}ms` }}
          fill={
            r.winner === "ours"
              ? "var(--analysis-ours)"
              : "var(--analysis-theirs)"
          }
        >
          <title>
            Rally {r.rally}: {r.score.join("–")} ·{" "}
            {r.winner === "ours" ? "ponto nosso" : "ponto deles"}
          </title>
        </circle>
      ))}
      <text className="an-axis" x="40" y="240">
        Início
      </text>
      <text className="an-axis" x="860" y="240" textAnchor="end">
        {count} rallies encerrados
      </text>
    </svg>
  );
}

export function Analysis({
  match,
  onTimeout,
  onProfile,
  readOnly = false,
}: {
  match: Match;
  readOnly?: boolean;
  onTimeout: (side: Side) => void;
  onProfile: (id: string) => void;
}) {
  const [set, setSet] = useState(0);
  const [rotation, setRotation] = useState<Zone>(1);
  const [picked, setPicked] = useState<string>();
  const a = matchAnalysis(match, set);
  const group = a.rotations.find((r) => r.p === rotation)!;
  const formation = group.group.at(-1);
  const selected = a.rallies.find((r) => r.id === picked);
  const name = (id: string) =>
    match.players.find((p) => p.id === id)?.name ?? "Jogador";
  const pct = (won: number, total: number) =>
    total ? `${Math.round((won / total) * 100)}%` : "—";
  const setNumbers = [...new Set(a.rallies.map((r) => r.set))];
  const attention =
    a.attention?.player.id === a.highlight?.player.id ? undefined : a.attention;
  const players = [
    {
      key: "highlight",
      title: "Destaque do time",
      row: a.highlight,
      icon: Trophy,
      tone: "gold",
      lead: "Melhor fundamento",
      empty: "Registre ações para identificar o destaque.",
    },
    {
      key: "attention",
      title: "Atenção da comissão",
      row: attention,
      icon: AlertTriangle,
      tone: "warn",
      lead: "Prioridade de revisão",
      empty: "Precisamos de mais jogadores com ações para comparar.",
    },
  ] as const;
  return (
    <div className="an">
      <div className="an-toolbar">
        <div
          className="ui-chips"
          role="radiogroup"
          aria-label="Recorte da análise"
        >
          {[0, ...Array.from({ length: a.state.set }, (_, i) => i + 1)].map(
            (n) => (
              <button
                type="button"
                key={n}
                role="radio"
                aria-checked={set === n}
                onClick={() => {
                  setSet(n);
                  setPicked(undefined);
                }}
              >
                {n ? `Set ${n}` : "Jogo completo"}
              </button>
            ),
          )}
        </div>
        <span className="an-meta">
          <i className={a.state.finished ? "" : "is-live"} aria-hidden="true" />
          {a.rallies.length} rallies · {a.events.length} ações ·{" "}
          {a.state.finished ? "Partida encerrada" : "Atualizado ao vivo"}
        </span>
      </div>

      <nav className="an-jump" aria-label="Ir para">
        <a href="#analysis-moment">
          <Activity size={16} aria-hidden="true" />
          Como estamos?
        </a>
        <a href="#analysis-score">
          <Flag size={16} aria-hidden="true" />
          Placar
        </a>
        <a href="#analysis-rotations">
          <Volleyball size={16} aria-hidden="true" />
          Onde ganhamos?
        </a>
        <a href="#analysis-execution">
          <Target size={16} aria-hidden="true" />
          Como executamos?
        </a>
      </nav>

      <div className="an-overview" id="analysis-moment">
        {players.map(({ key, title, row, icon: Icon, tone, lead, empty }) => {
          const metric =
            key === "highlight" ? row?.best : (row?.worst ?? row?.best);
          return (
            <section className={"ui-card an-player " + tone} key={key}>
              <header className="an-card-title">
                <Icon size={16} aria-hidden="true" />
                <h2>{title}</h2>
              </header>
              {row ? (
                <>
                  <button
                    type="button"
                    className="an-player-link"
                    onClick={() => onProfile(row.player.id)}
                    aria-label={`Abrir perfil de ${row.player.name}`}
                  >
                    <Photo player={row.player} className="an-photo" />
                    <span>
                      <strong>{row.player.name}</strong>
                      <small>
                        {row.count} ações · {row.points} pontos
                      </small>
                    </span>
                    <span className="an-grade">{row.rating!.toFixed(1)}</span>
                  </button>
                  <p className="an-lead">
                    {lead}: <b>{metric?.label ?? "Ainda sem variedade"}</b>
                  </p>
                  <p className="an-sub">{row.reason(metric)}</p>
                  <small className="an-foot">
                    {a.provisional
                      ? "Provisório: menos de 3 ações por jogador."
                      : "Entre jogadores com pelo menos 3 ações."}
                    {key === "attention"
                      ? " Menor nota do grupo; não indica substituição."
                      : ""}
                  </small>
                </>
              ) : (
                <p className="ui-empty">{empty}</p>
              )}
            </section>
          );
        })}
        <section className="ui-card an-momentum">
          <header className="an-card-title">
            <Flame size={16} aria-hidden="true" />
            <h2>Momento do time</h2>
          </header>
          {a.streak ? (
            <div className={"an-streak " + a.streakSide}>
              <strong>{a.streak}</strong>
              <span>
                ponto{a.streak > 1 ? "s" : ""} seguido
                {a.streak > 1 ? "s" : ""}
                <b>{a.streakSide === "ours" ? "a favor" : "contra"}</b>
              </span>
            </div>
          ) : (
            <p className="ui-empty">Aguardando o primeiro rally.</p>
          )}
          {a.recent.length > 0 && (
            <div className="an-window" aria-label="Últimos rallies">
              {a.recent.map((r) => (
                <i key={r.id} className={r.winner} title={`R${r.rally}`} />
              ))}
            </div>
          )}
          <p className="an-sub">
            {a.recent.length
              ? `${wonWindow(a.recent)} de ${a.recent.length} pontos ganhos nos últimos rallies do set ${set || a.state.set}.`
              : "O resumo aparece após o primeiro ponto."}
          </p>
          <small className="an-foot">
            {a.recentErrors} falhas nessa janela. Ações ruins que continuam o
            rally não equivalem a pontos perdidos.
          </small>
          <TimeoutControls
            match={match}
            onTimeout={onTimeout}
            disabled={readOnly}
          />
        </section>
      </div>

      <section className="ui-card" id="analysis-score">
        <header className="ui-card-head">
          <div>
            <h2>Evolução do placar</h2>
            <p>Cada set começa em 0–0. Toque num ponto para ver o rally.</p>
          </div>
          <div className="an-legend">
            <span className="ours">Nosso time</span>
            <span className="theirs">Adversário</span>
            <span className="marker">
              <Flag size={12} aria-hidden="true" /> Tempo ·{" "}
              <ArrowLeftRight size={12} aria-hidden="true" /> Troca
            </span>
          </div>
        </header>
        {!a.rallies.length && (
          <p className="ui-empty">
            A linha do placar aparece após o primeiro rally encerrado.
          </p>
        )}
        {setNumbers.map((n) => {
          const rallies = a.rallies.filter((r) => r.set === n);
          const markers = a.markers.filter((m) => m.set === n);
          return (
            <div className="an-set" key={n}>
              <h3>
                Set {n} <b>{rallies.at(-1)!.score.join(" – ")}</b>
              </h3>
              <div className="an-chart">
                <ScoreChart rallies={rallies} markers={markers} />
              </div>
              <div
                className="an-points"
                aria-label={`Histórico de pontos do set ${n}`}
              >
                {rallies.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    aria-pressed={picked === r.id}
                    className={r.winner}
                    aria-label={`Set ${n}, rally ${r.rally}, ${r.score.join(" a ")}, ponto ${r.winner === "ours" ? "nosso" : "deles"}`}
                    onClick={() =>
                      setPicked(picked === r.id ? undefined : r.id)
                    }
                  >
                    <small>
                      R{r.rally} · {r.p ? `P${r.p}` : "P?"}
                    </small>
                    <strong>{r.score.join("–")}</strong>
                  </button>
                ))}
              </div>
              {markers.length > 0 && (
                <div className="an-markers">
                  {markers.map((m) => (
                    <span key={m.id}>
                      {m.command.type === "timeout" ? (
                        <Flag size={13} aria-hidden="true" />
                      ) : (
                        <ArrowLeftRight size={13} aria-hidden="true" />
                      )}
                      {m.command.type === "timeout"
                        ? `Tempo ${m.command.side === "ours" ? "nosso" : "deles"}`
                        : `${name(m.command.outgoing)} → ${name(m.command.incoming)}`}{" "}
                      · {m.score.join("–")} · antes de R{m.rally}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {selected && (
          <div className={"an-detail " + selected.winner} role="status">
            <strong>
              Set {selected.set} · Rally {selected.rally} ·{" "}
              {selected.serving === "ours" ? "Nosso saque" : "Saque adversário"}{" "}
              ·{" "}
              {selected.p
                ? `P${selected.p}`
                : "Rotação sem levantador definido"}
            </strong>
            <div className="lv-rally-steps">
              {selected.events.length ? (
                selected.events.map((e) => (
                  <span key={e.id}>
                    {e.playerId ? name(e.playerId) + " · " : ""}
                    <SkillIcon skill={e.skill} /> {skills[e.skill].label} ·{" "}
                    {resultOf(e).label}
                  </span>
                ))
              ) : (
                <span>Ponto registrado sem fundamento identificado.</span>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="ui-card" id="analysis-rotations">
        <header className="ui-card-head">
          <div>
            <h2>Análise por rotação</h2>
            <p>
              P é a zona do levantador antes do ponto. Toque numa rotação para
              ver a última formação observada.
            </p>
          </div>
        </header>
        <div className="an-rotations">
          {a.rotations.map((r) => {
            const share = r.group.length ? r.won / r.group.length : 0;
            return (
              <button
                type="button"
                key={r.p}
                className="an-rot"
                aria-pressed={rotation === r.p}
                onClick={() => setRotation(r.p)}
              >
                <span className="an-rot-head">
                  <strong>P{r.p}</strong>
                  <b>{pct(r.won, r.group.length)}</b>
                </span>
                <span className="ui-meter" aria-hidden="true">
                  <i style={{ width: `${share * 100}%` }} />
                </span>
                <small>
                  {r.won} ganhos · {r.lost} perdidos
                </small>
                <span className="an-rot-split">
                  <span>
                    Recebendo <b>{pct(r.sideouts, r.receiving)}</b>
                    <small>
                      {r.sideouts}/{r.receiving}
                    </small>
                  </span>
                  <span>
                    Sacando <b>{pct(r.serveWins, r.serving)}</b>
                    <small>
                      {r.serveWins}/{r.serving}
                    </small>
                  </span>
                </span>
                {/* Dourado só quando há amostra pequena; sem rallies fica neutro. */}
                <small
                  className={
                    r.group.length === 0
                      ? ""
                      : r.group.length < 5
                        ? "an-low"
                        : "an-ok"
                  }
                >
                  {r.group.length === 0
                    ? "Sem rallies"
                    : `${r.group.length < 5 ? "Amostra baixa" : "Rallies observados"} · ${r.group.length}`}
                </small>
              </button>
            );
          })}
        </div>
        <div className="an-formation">
          <div>
            <h3>P{rotation} · formação observada</h3>
            <p>
              {formation
                ? `Set ${formation.set}, antes do ponto do rally ${formation.rally}. ${formation.serving === "ours" ? "Nosso saque." : "Saque adversário."}`
                : "Ainda sem rally encerrado nessa rotação."}
            </p>
            <p className="an-foot">
              Recebendo = pontos ganhos quando o adversário sacou. Sacando =
              pontos ganhos com nosso saque. Pontos sem fundamento também
              entram.
              {a.rallies.some((r) => r.p === null)
                ? " Rallies sem levantador definido ficam fora de P1–P6."
                : ""}
            </p>
          </div>
          {formation && (
            <div
              className="prep-mini-court"
              aria-label={`Formação observada na P${rotation}`}
            >
              {([4, 3, 2, 5, 6, 1] as Zone[]).map((z) => {
                const p = match.players.find(
                  (p) => p.id === formation.lineup[z - 1],
                )!;
                return (
                  <div key={z}>
                    <span className="court-zone">Z{z}</span>
                    <Jersey number={p.number} libero={p.libero} />
                    <strong>{p.name}</strong>
                    <small>
                      {roleLabels[p.libero ? "libero" : formation.roles[z - 1]]}
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div id="analysis-execution">
        <ExecutionSummary events={a.events} />
      </div>

      <section className="ui-card">
        <header className="ui-card-head">
          <div>
            <h2>Pedidos de tempo</h2>
            <p>
              Pontos ganhos antes e depois, em janelas de até 5 rallies do mesmo
              set. A comparação não atribui o resultado ao pedido.
            </p>
          </div>
        </header>
        {a.timeouts.length ? (
          <div className="an-timeout-list">
            {a.timeouts.map(({ marker, before, after }) => (
              <article key={marker.id}>
                <header>
                  <strong>
                    Set {marker.set} · Tempo{" "}
                    {marker.command.type === "timeout" &&
                    marker.command.side === "ours"
                      ? "nosso"
                      : "deles"}
                  </strong>
                  <span>
                    {marker.score.join("–")} · antes de R{marker.rally}
                  </span>
                </header>
                <div className="an-compare">
                  <span>
                    <small>Antes</small>
                    <b>{wonWindow(before)}</b>
                  </span>
                  <span aria-hidden="true">→</span>
                  <span>
                    <small>
                      Depois{after.length < 5 ? " · incompleto" : ""}
                    </small>
                    <b>{wonWindow(after)}</b>
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ui-empty">
            Nenhum pedido de tempo registrado neste recorte.
          </p>
        )}
      </section>
    </div>
  );
}
