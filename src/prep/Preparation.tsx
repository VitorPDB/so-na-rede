import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  ShieldCheck,
  Volleyball,
} from "lucide-react";
import { type Match, type Projection, type Zone, roleLabels } from "../model";
import { OpponentLogos, opponentTeam } from "../OpponentLogos";
import { Jersey } from "../Jersey";
import { MatchVideoEditor, MatchVideoPlayer } from "../MatchVideos";

const STEPS = [
  { title: "Partida", hint: "Times e formato" },
  { title: "Formação e saque", hint: "Seis titulares e P inicial" },
  { title: "Conferir", hint: "Revisão final" },
];

function Matchup({
  match,
  compact = false,
}: {
  match: Match;
  compact?: boolean;
}) {
  const logo = opponentTeam(match)?.logo;
  return (
    <div className={"prep-matchup" + (compact ? " is-compact" : "")}>
      <div className="prep-side">
        <span className="prep-crest">
          <img src="/team-logo-transparent.png" alt="" />
        </span>
        <strong>{match.team || "Nosso time"}</strong>
        <small>Nosso time</small>
      </div>
      <span className="prep-versus" aria-hidden="true">
        ×
      </span>
      <div className="prep-side">
        <span className={"prep-crest" + (logo ? "" : " is-empty")}>
          {logo ? (
            <img src={logo} alt={"Logo de " + match.opponent} />
          ) : (
            <ShieldCheck size={26} aria-hidden="true" />
          )}
        </span>
        <strong>{match.opponent || "Adversário"}</strong>
        <small>Adversário</small>
      </div>
    </div>
  );
}

function MiniCourt({ match, state }: { match: Match; state: Projection }) {
  return (
    <div className="prep-mini-court" aria-label="Formação nas zonas 1 a 6">
      {([4, 3, 2, 5, 6, 1] as Zone[]).map((z) => {
        const p = match.players.find((p) => p.id === state.lineup[z - 1]);
        return (
          <div key={z}>
            <span className="court-zone">Z{z}</span>
            {p && (
              <>
                <Jersey number={p.number} libero={p.libero} />
                <strong>{p.name}</strong>
                <small>
                  {roleLabels[p.libero ? "libero" : state.roles[z - 1]]}
                </small>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Preparation({
  match,
  state,
  offlineReady,
  onChange,
  onPrepareDraft,
  renderFormation,
  onStart,
}: {
  match: Match;
  state: Projection;
  offlineReady: boolean;
  onChange: (match: Match) => boolean;
  onPrepareDraft: () => void;
  renderFormation: (onDone: () => void) => ReactNode;
  onStart: () => void;
}) {
  const started =
    state.events.length > 0 || state.rallies.length > 0 || state.set > 1;
  const [step, setStep] = useState(started ? 2 : 0);
  useEffect(() => {
    if (step === 1) onPrepareDraft();
    window.scrollTo({ top: 0, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const confirmed = state.active.some(
    (e) => e.command?.type === "setup" || e.command?.type === "nextSet",
  );
  const done = [
    !!match.team.trim() && !!match.opponent.trim(),
    confirmed,
    false,
  ];
  const setter = state.roles.indexOf("setter") + 1;
  const formatLocked = match.audit.length > 0;

  const checks = [
    {
      ok: !!match.opponent.trim(),
      label: "Adversário definido",
      detail: match.opponent || "Preencha o nome do adversário",
      step: 0,
    },
    {
      ok: confirmed,
      label: "Formação confirmada",
      detail: confirmed
        ? `P${setter || "—"} · seis titulares em quadra`
        : "Usando a formação padrão — confirme na etapa 2",
      step: 1,
    },
    {
      ok: true,
      label: "Primeiro saque",
      detail: state.server === "ours" ? match.team : match.opponent,
      step: 1,
    },
    {
      ok: true,
      label: "Líbero automático",
      detail: state.autoLibero
        ? "Ligado"
        : "Desligado — ajuste na tela Ao vivo",
    },
    {
      ok: offlineReady,
      label: "Funciona sem internet",
      detail: offlineReady
        ? "Tudo salvo neste dispositivo"
        : "Abra a versão publicada uma vez com internet",
    },
  ];

  return (
    <div className="prep">
      <ol className="prep-stepper" aria-label="Etapas da preparação">
        {STEPS.map((s, i) => {
          const status = step === i ? "current" : done[i] ? "done" : "todo";
          return (
            <li key={s.title} className={"is-" + status}>
              <button
                type="button"
                aria-current={step === i ? "step" : undefined}
                onClick={() => setStep(i)}
              >
                <b aria-hidden="true">
                  {status === "done" ? <Check size={14} /> : i + 1}
                </b>
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.hint}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <details className="ui-card video-preparation">
        <summary>Vídeos · transmissão e gravações da partida</summary>
        <MatchVideoEditor
          videos={match.videos}
          onChange={(videos) => onChange({ ...match, videos })}
        />
        <MatchVideoPlayer videos={match.videos} finished={state.finished} />
        <p className="ui-note">
          Os links acompanham a publicação das estatísticas. Depois do jogo,
          também ficam no histórico.
        </p>
      </details>

      {started && (
        <p className="prep-note" role="note">
          <CircleAlert size={16} aria-hidden="true" />
          Partida em andamento (set {state.set}, {state.score.join("–")}). Os
          dados podem ser conferidos; a escalação segue as regras do set.
        </p>
      )}

      <div className="prep-stage" key={step}>
        {step === 0 && (
          <div className="prep-layout">
            <section className="lv-card prep-card" aria-labelledby="prep-match">
              <header className="lv-card-head">
                <div>
                  <h2 id="prep-match">Quem está do outro lado da rede?</h2>
                  <p>
                    Nomes, escudo e formato. Tudo fica salvo a cada alteração.
                  </p>
                </div>
              </header>
              <div className="prep-fields">
                <label className="fe-field">
                  <span className="ui-eyebrow">Nosso time</span>
                  <input
                    className="ui-input"
                    value={match.team}
                    onChange={(e) =>
                      onChange({ ...match, team: e.target.value })
                    }
                  />
                </label>
                <label className="fe-field">
                  <span className="ui-eyebrow">Adversário</span>
                  <input
                    className="ui-input"
                    value={match.opponent}
                    placeholder="Nome do time adversário"
                    onChange={(e) =>
                      onChange({ ...match, opponent: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="fe-field">
                <span className="ui-eyebrow">Formato</span>
                <div
                  className="ui-segmented prep-format"
                  role="radiogroup"
                  aria-label="Formato da partida"
                >
                  {([5, 3] as const).map((n) => (
                    <button
                      type="button"
                      key={n}
                      role="radio"
                      aria-checked={match.bestOf === n}
                      disabled={formatLocked}
                      onClick={() => onChange({ ...match, bestOf: n })}
                    >
                      Melhor de {n}
                      <small>
                        {n === 5 ? "3 sets vencem" : "2 sets vencem"}
                      </small>
                    </button>
                  ))}
                </div>
                <small className="prep-help">
                  {formatLocked
                    ? "O formato fica travado depois do primeiro registro."
                    : "Sets até 25 e decisivo até 15, sempre com 2 de diferença."}
                </small>
              </div>
              <div className="prep-logos">
                <span className="ui-eyebrow">Escudo do adversário</span>
                <OpponentLogos match={match} onChange={onChange} />
              </div>
            </section>
            <aside
              className="lv-card prep-preview"
              aria-label="Prévia do confronto"
            >
              <span className="ui-eyebrow">Prévia do placar</span>
              <Matchup match={match} />
              <dl className="prep-facts">
                <div>
                  <dt>Formato</dt>
                  <dd>Melhor de {match.bestOf}</dd>
                </div>
                <div>
                  <dt>Modalidade</dt>
                  <dd>Indoor 6×6</dd>
                </div>
                <div>
                  <dt>Elenco</dt>
                  <dd>{match.players.length} atletas</dd>
                </div>
              </dl>
            </aside>
          </div>
        )}

        {step === 1 && (
          <section className="lv-card prep-card" aria-labelledby="prep-lineup">
            <header className="lv-card-head">
              <div>
                <h2 id="prep-lineup">Seis jogadores, funções definidas</h2>
                <p>
                  Escolha a P inicial, ajuste quem começa em cada zona e defina
                  o primeiro saque. O líbero entra depois, na marcação.
                </p>
              </div>
            </header>
            {renderFormation(() => setStep(2))}
          </section>
        )}

        {step === 2 && (
          <div className="prep-layout">
            <section
              className="lv-card prep-card"
              aria-labelledby="prep-review"
            >
              <header className="lv-card-head">
                <div>
                  <h2 id="prep-review">Tudo pronto para o primeiro saque?</h2>
                  <p>
                    Melhor de {match.bestOf} · sets até 25 · decisivo até 15.
                  </p>
                </div>
              </header>
              <Matchup match={match} compact />
              <ul className="prep-checks">
                {checks.map((c) => (
                  <li key={c.label} className={c.ok ? "is-ok" : "is-pending"}>
                    <span className="prep-check-icon" aria-hidden="true">
                      {c.ok ? <Check size={14} /> : <CircleAlert size={14} />}
                    </span>
                    <span>
                      <strong>{c.label}</strong>
                      <small>{c.detail}</small>
                    </span>
                    {c.step !== undefined && (
                      <button
                        type="button"
                        className="ui-btn ui-btn--ghost ui-btn--sm"
                        onClick={() => setStep(c.step!)}
                      >
                        Ajustar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
            <aside
              className="lv-card prep-preview"
              aria-labelledby="prep-court"
            >
              <header className="prep-court-head">
                <h3 id="prep-court" className="ui-eyebrow">
                  Em quadra no set {state.set}
                </h3>
                <span className="prep-badges">
                  <span className="prep-badge">P{setter || "—"}</span>
                  <span className="prep-badge">
                    <Volleyball size={13} aria-hidden="true" />
                    {state.server === "ours" ? "Nosso saque" : "Saque deles"}
                  </span>
                </span>
              </header>
              <MiniCourt match={match} state={state} />
            </aside>
          </div>
        )}
      </div>

      <footer className="prep-footer">
        <button
          type="button"
          className="ui-btn ui-btn--ghost"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar
        </button>
        <span className="prep-progress" aria-hidden="true">
          {STEPS.map((_, i) => (
            <i key={i} className={i <= step ? "on" : ""} />
          ))}
        </span>
        {step < 2 ? (
          <button
            type="button"
            className={
              "ui-btn " +
              (step === 1 && !confirmed
                ? "ui-btn--secondary"
                : "ui-btn--primary")
            }
            onClick={() => setStep(step + 1)}
          >
            {step === 0 ? "Definir formação" : "Conferir"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={onStart}
          >
            <Activity size={18} aria-hidden="true" />
            {started ? "Voltar ao jogo" : "Ir para marcação"}
          </button>
        )}
      </footer>
    </div>
  );
}
