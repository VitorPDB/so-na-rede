import { AssessmentSelect } from "./AssessmentSelect";
import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { type Match, type SkillEvent } from "./model";
import { assessed, difficultyLabels } from "./assessment";
import { CriteriaFields } from "./CriteriaFields";
import { effectiveDifficulty, criteriaFields } from "./criteria";
import {
  blockFor,
  executionFor,
  passFor,
  compatibleQuality,
} from "./actionQuality";

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
  const setGroup = (value: string) =>
    onChange({
      ...event,
      assessment: {
        ...a,
        ...(event.skill === "block"
          ? { criteria: { ...a.criteria, blockQuality: blockFor(event) } }
          : {}),
        group: (value || undefined) as typeof a.group,
      },
      participants: value
        ? event.playerId
          ? [{ playerId: event.playerId, responsibility: "correct" }]
          : []
        : undefined,
    });
  const grade = assessed(event);
  return (
    <section className="foundation-assessment" aria-label="Ficha do fundamento">
      <div
        className={
          "foundation-core" + (event.skill === "block" ? " is-block" : "")
        }
      >
        <div className="foundation-quality">
          {pass || event.skill === "block" ? (
            <CriteriaFields
              skill={event.skill}
              event={event}
              value={{
                ...(pass
                  ? { passQuality: passFor(event) }
                  : { blockQuality: blockFor(event) }),
                ...a.criteria,
              }}
              onlyQuality
              inlineQuality={pass}
              onChange={(criteria) =>
                change({ criteria, execution: undefined })
              }
            />
          ) : (
            <AssessmentSelect
              inline
              label={
                event.skill === "set"
                  ? a.criteria?.setType === "setter_tip"
                    ? "Qualidade da largadinha"
                    : "Qualidade da bola entregue"
                  : event.skill === "serve"
                    ? "Qualidade do saque"
                    : "Qualidade do ataque"
              }
              value={executionFor(event)}
              options={compatibleQuality(event, "execution", {
                good: "Boa",
                excellent: "Excelente",
                poor: "Gafe · rally continua",
                error: "Erro direto",
                point: "Ponto bem executado",
                unrated: "Sem oportunidade real",
              })}
              onChange={(value) =>
                change({ execution: value as typeof a.execution })
              }
            />
          )}
        </div>
        <AssessmentSelect
          inline
          label="Dificuldade do lance"
          value={effectiveDifficulty(event)}
          options={difficultyLabels}
          onChange={(value) =>
            change({
              difficulty: value as typeof a.difficulty,
              difficultySource: "manual",
            })
          }
        />
      </div>
      {event.skill === "block" && (
        <AssessmentSelect
          label="Tipo de bloqueio"
          value={a.group ?? ""}
          options={groupOptions}
          onChange={setGroup}
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
          hideIncomingPass={a.rallyContext === "auto"}
          hideSetType={event.skill === "attack" && a.setTypeSource === "rally"}
          onChange={(criteria) =>
            change({
              criteria,
              ...(criteria.setType !== a.criteria?.setType
                ? { setDifficultyVersion: 1 as const }
                : {}),
            })
          }
        />
        {event.skill === "set" && a.criteria?.setType === "setter_tip" && (
          <p className="rally-pass-context">
            Se a largadinha pontuar, registre o ponto aqui uma vez. Não precisa
            registrar outro ataque.
          </p>
        )}
        {event.skill === "attack" && a.setTypeSource === "rally" && (
          <p className="rally-pass-context" role="status">
            Levantamento recebido:{" "}
            {
              criteriaFields.find((f) => f.key === "setType")?.options[
                a.criteria?.setType ?? ""
              ]
            }
            {" · recuperado automaticamente deste rally"}
          </p>
        )}
        {event.skill === "set" && a.rallyContext === "auto" && (
          <p className="rally-pass-context" role="status">
            {a.criteria?.incomingPass
              ? `Passe ${a.criteria.incomingPass} · recuperado automaticamente deste rally`
              : "Passe não registrado neste rally · sem dificuldade presumida"}
          </p>
        )}
        {event.skill === "attack" && a.criteria?.incomingSet === "error" && (
          <p className="rally-pass-context" role="status">
            Erro direto do levantamento: ataque sem oportunidade real, excluído
            da nota. Registre o erro e o ponto no levantamento, sem repetir o
            ponto aqui.
          </p>
        )}
        <AssessmentSelect
          label="Participação avaliável"
          value={grade.rated ? "rated" : "unrated"}
          options={{
            rated: "Avaliar esta ação",
            unrated: "Sem oportunidade real · excluir da nota",
          }}
          onChange={(value) =>
            change({ execution: value === "unrated" ? "unrated" : undefined })
          }
        />
        {a.difficultySource === "manual" && (
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              change({ difficulty: "normal", difficultySource: "context" })
            }
          >
            Usar dificuldade sugerida pelo contexto
          </button>
        )}
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
            onChange={(value) =>
              change({
                tags: [
                  ...a.tags.filter((t) => !t.startsWith("attack_")),
                  value,
                ],
              })
            }
          />
        )}
        {["set", "attack"].includes(event.skill) && (
          <AssessmentSelect
            label="Recurso especial"
            value={a.tags.includes("magic") ? "magic" : ""}
            options={{ "": "Sem recurso especial", magic: "Tirou da cartola" }}
            hint="Improviso excepcional. A dificuldade manual continua tendo prioridade."
            onChange={(value) =>
              change({
                tags: [
                  ...a.tags.filter((t) => t !== "magic"),
                  ...(value ? [value] : []),
                ],
              })
            }
          />
        )}
        {event.skill !== "serve" && event.skill !== "block" && (
          <AssessmentSelect
            label="Participação na jogada"
            value={a.group ?? ""}
            options={groupOptions}
            onChange={setGroup}
          />
        )}
        <p className="ui-note">
          A qualidade se refere à sua ação. O passe ou levantamento recebido
          pode ser ruim mesmo quando a execução foi boa.
        </p>
      </details>
      {children}
    </section>
  );
}
