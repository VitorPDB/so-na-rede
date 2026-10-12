import { useEffect, useRef, useState } from "react";
import { Hourglass, ShieldCheck, Volleyball } from "lucide-react";
import type { Match, Projection, Side } from "../model";
import { opponentTeam } from "../OpponentLogos";
import { RallyStrip } from "../RallyStrip";

const pad = (n: number) => String(n).padStart(2, "0");

/** Número do placar que "pulsa" levemente quando muda. */
function ScoreDigit({ value, side }: { value: number; side: Side }) {
  const previous = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (value > previous.current) setBump((b) => b + 1);
    previous.current = value;
  }, [value]);
  return (
    <strong
      key={bump}
      className={"sb-digit " + side + (bump ? " is-bumped" : "")}
      aria-label={`${value} pontos`}
    >
      {pad(value)}
    </strong>
  );
}

function timeoutsUsed(state: Projection, side: Side) {
  return state.markers.filter(
    (m) =>
      m.set === state.set &&
      m.command.type === "timeout" &&
      m.command.side === side,
  ).length;
}

export function Scoreboard({
  match,
  state,
  busy,
  onTimeout,
}: {
  match: Match;
  state: Projection;
  busy: boolean;
  onTimeout: (side: Side) => void;
}) {
  const s = state;
  const rallyOpen = s.events.some(
    (e) => e.set === s.set && e.rally === s.rally,
  );
  const started = s.events.length > 0 || s.rallies.length > 0;
  const status = s.finished
    ? "Encerrado"
    : s.setFinished
      ? "Intervalo"
      : started
        ? "Ao vivo"
        : "Pré-jogo";
  const logo = opponentTeam(match)?.logo;
  const setter = s.roles.indexOf("setter") + 1;

  const timeout = (side: Side) => {
    const used = timeoutsUsed(s, side);
    const blocked =
      busy || rallyOpen || s.finished || s.setFinished || used >= 2;
    return (
      <button
        type="button"
        className="sb-timeout"
        disabled={blocked}
        onClick={() => onTimeout(side)}
        aria-label={
          side === "ours" ? "Registrar tempo nosso" : "Registrar tempo deles"
        }
        title={
          rallyOpen
            ? "Encerre o rally para registrar um tempo"
            : "Até dois pedidos por time no set"
        }
      >
        <Hourglass size={16} aria-hidden="true" />
        <span>Tempo</span>
        <span className="sb-timeout-count" aria-hidden="true">
          {[0, 1].map((i) => (
            <i key={i} className={i < used ? "used" : ""} />
          ))}
        </span>
        <span className="sr-only">{used} de 2 usados</span>
      </button>
    );
  };

  return (
    <section className="sb" aria-label="Placar">
      <div className="sb-meta">
        <span
          className={
            "sb-status " +
            (s.finished || s.setFinished || !started ? "is-paused" : "")
          }
        >
          <i aria-hidden="true" />
          {status}
        </span>
        <span className="sb-format">Indoor 6×6 · Melhor de {match.bestOf}</span>
        <span className="sb-set">{s.set}º set</span>
      </div>

      <div className="sb-main">
        <div
          className={
            "sb-team ours " + (s.server === "ours" ? "is-serving" : "")
          }
        >
          <span className="sb-badge">
            <img src="/team-logo-transparent.png" alt="" />
          </span>
          <div className="sb-team-text">
            <h2>{match.team}</h2>
            <span className="sb-serve">
              {s.server === "ours" ? (
                <>
                  <Volleyball size={14} aria-hidden="true" /> Sacando
                </>
              ) : (
                "Recebendo"
              )}
            </span>
          </div>
        </div>

        <div
          className="sb-score"
          role="group"
          aria-label={`Placar ${s.score[0]} a ${s.score[1]}`}
        >
          <ScoreDigit value={s.score[0]} side="ours" />
          <span className="sb-colon" aria-hidden="true">
            :
          </span>
          <ScoreDigit value={s.score[1]} side="theirs" />
        </div>

        <div
          className={
            "sb-team theirs " + (s.server === "theirs" ? "is-serving" : "")
          }
        >
          <div className="sb-team-text">
            <h2>{match.opponent}</h2>
            <span className="sb-serve">
              {s.server === "theirs" ? (
                <>
                  <Volleyball size={14} aria-hidden="true" /> Sacando
                </>
              ) : (
                "Recebendo"
              )}
            </span>
          </div>
          <span className={"sb-badge " + (logo ? "" : "is-empty")}>
            {logo ? (
              <img src={logo} alt={"Logo de " + match.opponent} />
            ) : (
              <ShieldCheck size={22} aria-hidden="true" />
            )}
          </span>
        </div>
      </div>

      <RallyStrip rallies={s.rallies} set={s.set} />

      <div className="sb-foot">
        {timeout("ours")}
        <div className="sb-facts">
          <span className="sb-sets">
            Sets <b>{s.sets[0]}</b>–<b>{s.sets[1]}</b>
          </span>
          {s.completed.map((set) => (
            <span key={set.set} className="sb-chip">
              S{set.set} <b>{set.score.join("–")}</b>
            </span>
          ))}
          <span className="sb-fact">
            P<b>{setter || "—"}</b>
          </span>
          <span className="sb-fact">
            Rally <b>{pad(s.rally)}</b>
          </span>
          <span className="sb-fact">
            Rotação <b>{s.rotation}</b>
          </span>
        </div>
        {timeout("theirs")}
      </div>
    </section>
  );
}

/** Placar compacto que aparece fixo no topo quando o placar principal sai da tela (celular). */
export function MiniScore({
  match,
  state,
  visible,
}: {
  match: Match;
  state: Projection;
  visible: boolean;
}) {
  return (
    <div
      className={"mini-score " + (visible ? "is-visible" : "")}
      aria-hidden={!visible}
    >
      <span
        className={"mini-team " + (state.server === "ours" ? "is-serving" : "")}
      >
        {state.server === "ours" && <Volleyball size={12} aria-hidden="true" />}
        {match.team}
      </span>
      <strong>
        {pad(state.score[0])}
        <span>:</span>
        {pad(state.score[1])}
      </strong>
      <span
        className={
          "mini-team theirs " + (state.server === "theirs" ? "is-serving" : "")
        }
      >
        {match.opponent}
        {state.server === "theirs" && (
          <Volleyball size={12} aria-hidden="true" />
        )}
      </span>
      <span className="mini-set">
        S{state.set} · {state.sets[0]}–{state.sets[1]}
      </span>
    </div>
  );
}
