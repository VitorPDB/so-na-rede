import { AssessmentSelect } from "./AssessmentSelect";
import { Gauge, Target, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { type Match, type SkillEvent, resultOf } from "./model";
import { assessed, difficultyLabels } from "./assessment";
import { CriteriaFields } from "./CriteriaFields";
import { effectiveDifficulty } from "./criteria";

export function FoundationAssessment({
  event,
  onChange,
  children,
}: {
  event: SkillEvent;
  onChange: (event: SkillEvent) => void;
  match?: Match;
  children?: ReactNode;
}) {
  const a = event.assessment!;
  const pass = ["reception", "defense"].includes(event.skill);
  const r = resultOf(event);
  const execution =
    a.execution ??
    (event.result === "simple_gafe"
      ? "poor"
      : r.error
        ? "error"
        : r.winner === "ours"
          ? "point"
          : "good");
  const change = (patch: Partial<typeof a>) =>
    onChange({ ...event, assessment: { ...a, ...patch } });
  const groupOptions: Record<string, string> =
    event.skill === "block"
      ? {
          "": "Simples · 1 jogador",
          double: "Duplo · 2 jogadores",
          triple: "Triplo · 3 jogadores",
        }
      : { "": "Individual", combination: "Jogada ensaiada · 2 a 6 jogadores" };
  const grade = assessed(event);
  return (
    <section className="foundation-assessment" aria-label="Ficha do fundamento">
      <div className="foundation-core">
        <div className="foundation-quality">
          <span className="ui-eyebrow">
            <Target size={16} /> Qualidade · base da nota
          </span>
          {pass || event.skill === "block" ? (
            <CriteriaFields
              skill={event.skill}
              value={{
                ...(pass
                  ? {
                      passQuality:
                        event.result === "simple_A"
                          ? "A"
                          : event.result === "simple_C"
                            ? "C"
                            : event.result === "simple_B"
                              ? "B"
                              : r.error
                                ? "error"
                                : "B",
                    }
                  : {
                      blockQuality:
                        r.error && event.result !== "simple_gafe"
                          ? "error"
                          : r.winner === "ours"
                            ? "perfect"
                            : event.result === "simple_gafe"
                              ? "late"
                              : "effective",
                    }),
                ...a.criteria,
              }}
              onlyQuality
              onChange={(criteria) => {
                const direct =
                  criteria.passQuality === "error" ||
                  criteria.blockQuality === "error";
                onChange({
                  ...event,
                  ...(direct
                    ? { result: "simple_theirs", winner: undefined }
                    : {}),
                  assessment: { ...a, execution: undefined, criteria },
                });
              }}
            />
          ) : (
            <AssessmentSelect
              label={
                event.skill === "set"
                  ? "Qualidade da bola entregue"
                  : event.skill === "serve"
                    ? "Qualidade do saque"
                    : "Qualidade do ataque"
              }
              value={execution}
              options={{
                good: "Boa",
                excellent: "Excelente",
                neutral: "Normal · continuidade",
                poor: "Gafe · rally continua",
                error: "Erro direto",
                ...(r.winner === "ours"
                  ? { point: "Ponto bem executado" }
                  : {}),
                unrated: "Sem oportunidade real",
              }}
              onChange={(value) =>
                onChange({
                  ...event,
                  ...(value === "error"
                    ? { result: "simple_theirs", winner: undefined }
                    : {}),
                  assessment: { ...a, execution: value as typeof a.execution },
                })
              }
            />
          )}
        </div>
        <div>
          <span className="ui-eyebrow">
            <Gauge size={16} /> Dificuldade · ajusta a cobrança
          </span>
          <AssessmentSelect
            label="Dificuldade do lance"
            value={a.difficultySource === "manual" ? a.difficulty : "context"}
            options={{
              context: `Automática · ${difficultyLabels[effectiveDifficulty(event)]}`,
              ...difficultyLabels,
            }}
            onChange={(value) =>
              change(
                value === "context"
                  ? { difficulty: "normal", difficultySource: "context" }
                  : {
                      difficulty: value as typeof a.difficulty,
                      difficultySource: "manual",
                    },
              )
            }
          />
        </div>
      </div>
      {event.skill === "block" && (
        <AssessmentSelect
          label="Tipo de bloqueio"
          value={a.group ?? ""}
          options={groupOptions}
          onChange={(value) =>
            onChange({
              ...event,
              assessment: {
                ...a,
                criteria: {
                  blockQuality:
                    r.error && event.result !== "simple_gafe"
                      ? "error"
                      : r.winner === "ours"
                        ? "perfect"
                        : event.result === "simple_gafe"
                          ? "late"
                          : "effective",
                  ...a.criteria,
                },
                group: (value || undefined) as typeof a.group,
              },
              participants: value
                ? event.playerId
                  ? [{ playerId: event.playerId, responsibility: "correct" }]
                  : []
                : undefined,
            })
          }
        />
      )}
      <details className="foundation-context">
        <summary>
          <SlidersHorizontal size={18} /> Contexto do lance{" "}
          <small>
            opcional ·{" "}
            {grade.rated
              ? `${(grade.quality * 10).toFixed(1)} / 10`
              : "sem nota"}
          </small>
        </summary>
        <CriteriaFields
          skill={event.skill}
          value={a.criteria}
          hideQuality
          onChange={(criteria) => change({ criteria })}
        />
        {event.skill === "attack" && (
          <AssessmentSelect
            label="Origem do ataque"
            value={
              a.tags.find((t) => t.startsWith("attack_")) ?? "attack_front"
            }
            options={{
              attack_front: "Rede",
              attack_pipe: "Fundo · pipe Z6",
              attack_back_one: "Fundo · saída Z1",
            }}
            onChange={(value) => change({ tags: [value] })}
          />
        )}
        {event.skill !== "serve" && event.skill !== "block" && (
          <AssessmentSelect
            label="Participação na jogada"
            value={a.group ?? ""}
            options={groupOptions}
            onChange={(value) =>
              onChange({
                ...event,
                assessment: {
                  ...a,
                  group: (value || undefined) as typeof a.group,
                },
                participants: value
                  ? event.playerId
                    ? [{ playerId: event.playerId, responsibility: "correct" }]
                    : []
                  : undefined,
              })
            }
          />
        )}
        <p className="ui-note">
          Tipo e técnica contextualizam a análise. A dificuldade ajusta a
          qualidade uma única vez.
        </p>
      </details>
      {children}
    </section>
  );
}
