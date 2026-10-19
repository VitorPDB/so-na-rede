import { useState } from "react";
import { completeRally, project, undo } from "./engine";
import { type Match, type SkillEvent, skills } from "./model";
import { normalAssessment } from "./assessment";
import { FoundationAssessment } from "./FoundationAssessment";
import { VideoReview } from "./VideoReview";
import { CardSelect } from "./CardSelect";

export function RallyReview({
  match,
  onChange,
}: {
  match: Match;
  onChange: (m: Match) => boolean;
}) {
  const state = project(match);
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(true);
  const [event, setEvent] = useState<SkillEvent>();
  const [error, setError] = useState("");
  const rallies = state.rallies.filter(
    (r) =>
      !pending ||
      !r.events.length ||
      state.active.find((a) => a.id === r.id)?.command?.type === "point",
  );
  const rally = rallies.find((r) => r.id === target) ?? rallies[0];
  const save = () => {
    if (!event || !rally) return;
    try {
      if (onChange(completeRally(match, rally.id, event))) {
        setEvent(undefined);
        setError("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  };
  return (
    <section className="simple-stats">
      <h2>Completar rallies da partida atual</h2>
      <p>
        O placar e o vencedor são preservados. Adicione os fundamentos em ordem;
        o último pode detalhar o ponto já existente. Cada alteração fica na
        auditoria.
      </p>
      <button
        className="ui-btn"
        aria-pressed={pending}
        onClick={() => {
          setPending(!pending);
          setEvent(undefined);
        }}
      >
        {" "}
        {pending
          ? "Mostrar todos os rallies"
          : "Mostrar apenas pontos sem fundamento"}
      </button>
      <label>
        Rally
        <CardSelect
          value={rally?.id ?? ""}
          onChange={(e) => {
            setTarget(e.target.value);
            setEvent(undefined);
          }}
        >
          {rallies.map((r) => (
            <option key={r.id} value={r.id}>
              Set {r.set} · Rally {r.rally} · {r.score.join("–")} ·{" "}
              {r.events.length} ações
            </option>
          ))}
        </CardSelect>
      </label>
      <VideoReview
        disabled={!!event}
        videos={match.videos}
        marks={(rally?.events ?? []).map((e) => ({
          id: e.id,
          label: skills[e.skill].label,
          event: e,
        }))}
        onMark={(stamp) => {
          if (!rally) {
            setError("Selecione um rally encerrado.");
            return;
          }
          setEvent({
            skill: "set",
            result: "simple_good",
            assessment: { ...normalAssessment(), rallyContext: "auto" },
            ...stamp,
          });
        }}
      />
      {!rally && <p>Nenhum rally disponível neste filtro.</p>}
      {rally && (
        <button
          className="ui-btn"
          onClick={() =>
            setEvent({
              skill: "set",
              result: "simple_good",
              assessment: { ...normalAssessment(), rallyContext: "auto" },
            })
          }
        >
          Adicionar fundamento sem vídeo
        </button>
      )}
      {event && rally && (
        <article className="ui-card">
          <p>
            Instante capturado:{" "}
            {event.videoTimestampMs === undefined
              ? "sem vídeo"
              : `${(event.videoTimestampMs / 1000).toFixed(1)} s`}
          </p>
          <label>
            Fundamento
            <CardSelect
              value={event.skill}
              onChange={(e) =>
                setEvent({
                  ...event,
                  skill: e.target.value as SkillEvent["skill"],
                  result: "simple_good",
                  assessment: { ...normalAssessment(), rallyContext: "auto" },
                })
              }
            >
              {Object.entries(skills)
                .filter(([key]) => key !== "opponent")
                .map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.label}
                  </option>
                ))}
            </CardSelect>
          </label>
          <label>
            Resultado
            <CardSelect
              value={event.result}
              onChange={(e) => setEvent({ ...event, result: e.target.value })}
            >
              <option value="simple_good">Bom · rally continua</option>
              <option value="simple_gafe">Gafe · rally continua</option>
              <option
                value={
                  rally.winner === "ours" ? "simple_ours" : "simple_theirs"
                }
              >
                Detalhar o ponto {rally.winner === "ours" ? "nosso" : "deles"}{" "}
                já registrado
              </option>
            </CardSelect>
          </label>
          <label>
            Jogador
            <CardSelect
              value={event.playerId ?? ""}
              onChange={(e) => setEvent({ ...event, playerId: e.target.value })}
            >
              <option value="">Escolha o jogador</option>
              {rally.lineup.map((id) => (
                <option key={id} value={id}>
                  {match.players.find((p) => p.id === id)?.name ?? id}
                </option>
              ))}
            </CardSelect>
          </label>
          <FoundationAssessment event={event} onChange={setEvent} />
          {event.assessment?.group && (
            <fieldset>
              <legend>Participantes da jogada</legend>
              {rally.lineup.map((id) => (
                <label className="ui-btn" key={id}>
                  <input
                    type="checkbox"
                    checked={
                      event.participants?.some((p) => p.playerId === id) ??
                      false
                    }
                    onChange={(e) =>
                      setEvent({
                        ...event,
                        participants: e.target.checked
                          ? [
                              ...(event.participants ?? []),
                              { playerId: id, responsibility: "correct" },
                            ]
                          : (event.participants ?? []).filter(
                              (p) => p.playerId !== id,
                            ),
                      })
                    }
                  />
                  {match.players.find((p) => p.id === id)?.name ?? id}
                </label>
              ))}
            </fieldset>
          )}
          <button className="ui-btn" disabled={!event.playerId} onClick={save}>
            Salvar neste rally
          </button>
          <button className="ui-btn" onClick={() => setEvent(undefined)}>
            Cancelar
          </button>
        </article>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        className="ui-btn"
        onClick={() => {
          if (onChange(undo(match))) setEvent(undefined);
        }}
      >
        Desfazer última alteração da partida
      </button>
    </section>
  );
}
