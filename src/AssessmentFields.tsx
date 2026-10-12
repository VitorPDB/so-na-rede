import { CardSelect } from "./CardSelect";
import { FoundationAssessment } from "./FoundationAssessment";
import { type Match, type SkillEvent, skills, resultOf } from "./model";
import {
  difficultyLabels,
  responsibilityLabels,
  tagsFor,
  toggleTag,
  normalAssessment,
  type Difficulty,
  type Responsibility,
  assessed,
  executionLabels,
  visibleTags,
} from "./assessment";
import { Photo } from "./PlayerProfile";
import { CriteriaFields } from "./CriteriaFields";
import { effectiveDifficulty, passLabels } from "./criteria";
import {
  Circle,
  Gauge,
  Mountain,
  Siren,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  Volleyball,
  Target,
  Hand,
  Shield,
  Sparkles,
  Brain,
  Timer,
  ArrowUp,
  ArrowDown,
  Move,
  Wind,
  Zap,
  TriangleAlert,
  CheckCheck,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

const categories: Record<string, { label: string; icon: LucideIcon }> = {
  attack_origin: { label: "Origem do ataque", icon: ArrowUp },
  ball: { label: "Bola recebida", icon: Volleyball },
  execution: { label: "Execução", icon: Target },
  opposition: { label: "Bloqueio adversário", icon: Shield },
  technique: { label: "Técnica", icon: Hand },
  special: { label: "Jogada especial", icon: Sparkles },
  decision: { label: "Decisão", icon: Brain },
  pressure: { label: "Pressão", icon: Timer },
};
const detailIcons: Record<string, LucideIcon> = {
  magic: Sparkles,
  save_hard: Shield,
  save_extreme: Siren,
  power: Zap,
  float: Wind,
  short: ArrowDown,
  deep: ArrowUp,
  high_only: ArrowUp,
  forced_up: ArrowUp,
  low: ArrowDown,
  running: Move,
  long_move: Move,
  reaction: Zap,
  fast_middle: Zap,
  perfect_block: CheckCheck,
  touch_simple: Hand,
  touch_effective: Shield,
  late: Timer,
  absent: TriangleAlert,
  gap: TriangleAlert,
  net_fault: TriangleAlert,
  out_fault: TriangleAlert,
  ugly_error: TriangleAlert,
  communication: MessageCircle,
  target: Target,
  space: Target,
};
const difficultyIcons: Record<Difficulty, LucideIcon> = {
  easy: Circle,
  normal: Gauge,
  hard: Mountain,
  emergency: Siren,
};
export function AssessmentFields({
  event,
  onChange,
  match,
  eligible,
  hideChecklist = false,
  hideParticipants = false,
  onlyParticipants = false,
  compact = false,
}: {
  event: SkillEvent;
  onChange: (e: SkillEvent) => void;
  match: Match;
  eligible?: string[];
  hideChecklist?: boolean;
  hideParticipants?: boolean;
  onlyParticipants?: boolean;
  compact?: boolean;
}) {
  if (event.skill === "opponent") return null;
  const a = event.assessment ?? normalAssessment();
  const change = (patch: Partial<typeof a>) =>
    onChange({ ...event, assessment: { ...a, ...patch } });
  const players = match.players.filter(
    (p) => !eligible || eligible.includes(p.id),
  );
  const group = a.group;
  const participants = event.participants ?? [];
  if (onlyParticipants && (!group || hideParticipants)) return null;
  const setGroup = (group: typeof a.group) =>
    onChange({
      ...event,
      assessment: { ...a, group, responsibility: undefined },
      participants: group
        ? event.playerId
          ? [{ playerId: event.playerId, responsibility: "correct" }]
          : []
        : undefined,
    });
  if (a.version === 4 && !onlyParticipants)
    return (
      <FoundationAssessment
        event={{ ...event, assessment: a }}
        onChange={onChange}
      >
        <AssessmentFields
          event={event}
          onChange={onChange}
          match={match}
          eligible={eligible}
          hideChecklist={hideChecklist}
          hideParticipants={hideParticipants}
          onlyParticipants
          compact={compact}
        />
      </FoundationAssessment>
    );
  return (
    <section
      className={
        "assessment-fields" +
        (a.version >= 2 && event.skill === "attack"
          ? " has-attack-origin"
          : "") +
        (a.version >= 3 && ["reception", "defense"].includes(event.skill)
          ? " has-pass-quality"
          : "")
      }
      aria-label="Detalhes da execução"
    >
      {!onlyParticipants && (
        <>
          <div className="assessment-top">
            <div
              className="difficulty-buttons"
              role="group"
              aria-label="Dificuldade da bola"
            >
              {Object.entries(difficultyLabels).map(([id, label]) => {
                const Icon = difficultyIcons[id as Difficulty];
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={
                      (a.version >= 3
                        ? effectiveDifficulty({ ...event, assessment: a })
                        : a.difficulty) === id
                    }
                    onClick={() =>
                      change({
                        difficulty: id as Difficulty,
                        ...(a.version >= 3
                          ? { difficultySource: "manual" as const }
                          : {}),
                      })
                    }
                  >
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
            {!compact && event.skill !== "serve" && (
              <label className="group-select">
                Participação
                <CardSelect
                  value={group ?? ""}
                  onChange={(e) =>
                    setGroup((e.target.value || undefined) as typeof group)
                  }
                >
                  <option value="">Individual</option>
                  <option value="combination">
                    Jogada ensaiada · 2 a 6 jogadores
                  </option>
                  {event.skill === "block" && (
                    <>
                      <option value="double">
                        Bloqueio duplo · 2 jogadores
                      </option>
                      <option value="triple">
                        Bloqueio triplo · 3 jogadores
                      </option>
                    </>
                  )}
                </CardSelect>
              </label>
            )}
          </div>
          {a.version >= 2 && event.skill === "attack" && (
            <div
              className="block-group-buttons attack-origin-buttons"
              role="group"
              aria-label="Origem do ataque"
            >
              {tagsFor("attack")
                .filter((t) => t.category === "attack_origin")
                .map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    aria-pressed={a.tags.includes(t.id)}
                    onClick={() => change({ tags: toggleTag(a.tags, t.id) })}
                  >
                    <ArrowUp size={18} aria-hidden="true" />
                    {t.id === "attack_front"
                      ? "Rede"
                      : t.id === "attack_pipe"
                        ? "Fundo · pipe Z6"
                        : "Fundo · saída Z1"}
                  </button>
                ))}
            </div>
          )}
          {a.version >= 3 && ["reception", "defense"].includes(event.skill) && (
            <div
              className="block-group-buttons pass-quality-buttons"
              role="group"
              aria-label="Qualidade do passe A B C"
            >
              {Object.entries(passLabels).map(([id, label]) => {
                const inferred =
                  event.result === "simple_A"
                    ? "A"
                    : event.result === "simple_B"
                      ? "B"
                      : event.result === "simple_C"
                        ? "C"
                        : undefined;
                return (
                  <button
                    type="button"
                    key={id}
                    aria-label={label}
                    aria-pressed={(a.criteria?.passQuality ?? inferred) === id}
                    onClick={() =>
                      onChange({
                        ...event,
                        ...(id === "error"
                          ? { result: "simple_theirs", winner: undefined }
                          : {}),
                        assessment: {
                          ...a,
                          execution: undefined,
                          criteria: {
                            ...a.criteria,
                            passQuality: id as "A" | "B" | "C" | "error",
                          },
                        },
                      })
                    }
                  >
                    <Target size={18} aria-hidden="true" />
                    {id === "error" ? "Erro direto" : id}
                  </button>
                );
              })}
            </div>
          )}
          {compact && event.skill === "block" && (
            <div
              className="block-group-buttons"
              role="group"
              aria-label="Tipo de bloqueio"
            >
              {([undefined, "double", "triple"] as const).map((g) => {
                const Icon = g ? UsersRound : UserRound;
                return (
                  <button
                    key={g ?? "individual"}
                    type="button"
                    aria-pressed={group === g}
                    onClick={() => setGroup(g)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {g === "double"
                      ? "Duplo"
                      : g === "triple"
                        ? "Triplo"
                        : "Individual"}
                  </button>
                );
              })}
            </div>
          )}
          <details className="assessment-details">
            <summary>
              <SlidersHorizontal size={18} aria-hidden="true" /> Detalhar{" "}
              <small>opcional</small>{" "}
              {a.tags.length
                ? `· ${a.tags.length} ${a.tags.length === 1 ? "selecionado" : "selecionados"}`
                : ""}
              {group === "combination" ? " · Jogada ensaiada" : ""}
            </summary>
            {!event.assessment && (
              <p className="muted">
                Registro anterior. O cálculo original será mantido até você
                ajustar um detalhe.
              </p>
            )}
            {a.version >= 3 && (
              <>
                <CriteriaFields
                  skill={event.skill}
                  value={a.criteria}
                  hidePass
                  onChange={(criteria) =>
                    change({
                      criteria,
                      ...(criteria.blockQuality !== a.criteria?.blockQuality
                        ? { execution: undefined }
                        : {}),
                    })
                  }
                />
                <p className="ui-note">
                  Qualidade é a base da nota. O contexto sugere a dificuldade,
                  sem somar outro bônus pelo mesmo lance. Técnica, tipo e
                  momento ficam registrados para análise.
                </p>
                {a.difficultySource === "manual" && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      change({
                        difficulty: "normal",
                        difficultySource: "context",
                      })
                    }
                  >
                    Usar dificuldade sugerida pelo contexto
                  </button>
                )}
              </>
            )}
            {a.version >= 2 &&
              !(
                a.version >= 3 && ["reception", "defense"].includes(event.skill)
              ) && (
                <label>
                  Execução individual · separada do placar
                  <CardSelect
                    value={a.execution ?? ""}
                    onChange={(e) => {
                      const criteria = { ...a.criteria };
                      delete criteria.passQuality;
                      delete criteria.blockQuality;
                      onChange({
                        ...event,
                        ...(a.version >= 3 && e.target.value === "error"
                          ? { result: "simple_theirs", winner: undefined }
                          : {}),
                        assessment: {
                          ...a,
                          execution: (e.target.value ||
                            undefined) as typeof a.execution,
                          ...(a.version >= 3 ? { criteria } : {}),
                        },
                      });
                    }}
                  >
                    <option value="">Conforme resultado e detalhes</option>
                    {Object.entries(executionLabels).map(([id, label]) => (
                      <option
                        key={id}
                        value={id}
                        disabled={
                          id === "point" &&
                          event.winner !== "ours" &&
                          resultOf(event).winner !== "ours"
                        }
                      >
                        {label}
                      </option>
                    ))}
                  </CardSelect>
                </label>
              )}
            {!compact && (
              <label>
                Qualidade / resultado
                <CardSelect
                  value={event.result}
                  onChange={(e) =>
                    onChange({
                      ...event,
                      result: e.target.value,
                      assessment: a,
                    })
                  }
                >
                  {skills[event.skill].results.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id.startsWith("simple_") ? "Simples · " : ""}
                      {r.label}
                    </option>
                  ))}
                </CardSelect>
              </label>
            )}
            {compact && event.skill !== "serve" && (
              <label className="group-select">
                <span>
                  <UsersRound size={18} aria-hidden="true" /> Participação na
                  jogada
                </span>
                <CardSelect
                  value={group ?? ""}
                  onChange={(e) =>
                    setGroup((e.target.value || undefined) as typeof group)
                  }
                >
                  <option value="">Individual</option>
                  <option value="combination">
                    Jogada ensaiada · 2 a 6 jogadores
                  </option>
                  {event.skill === "block" && (
                    <>
                      <option value="double">Bloqueio duplo</option>
                      <option value="triple">Bloqueio triplo</option>
                    </>
                  )}
                </CardSelect>
              </label>
            )}
            {Object.entries(categories).map(
              ([category, { label, icon: CategoryIcon }]) => {
                const options = tagsFor(event.skill).filter(
                  (t) =>
                    t.category === category &&
                    (visibleTags(event.skill, a.version).some(
                      (v) => v.id === t.id,
                    ) ||
                      a.tags.includes(t.id)),
                );
                if (!options.length) return null;
                return (
                  <details className="situation-category" key={category}>
                    <summary>
                      <CategoryIcon size={18} aria-hidden="true" />
                      {label}
                      <small>
                        {options
                          .filter((t) => a.tags.includes(t.id))
                          .map((t) => t.label)
                          .join(", ") || "Escolher"}
                      </small>
                    </summary>
                    <div className="situation-chips">
                      {options.map((t) => {
                        const Icon = detailIcons[t.id] ?? CategoryIcon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            aria-pressed={a.tags.includes(t.id)}
                            onClick={() => {
                              const tags = toggleTag(a.tags, t.id);
                              if (
                                a.version >= 2 &&
                                t.id === "setter_tip" &&
                                event.skill === "set" &&
                                tags.includes(t.id)
                              ) {
                                const r = resultOf(event);
                                onChange({
                                  ...event,
                                  skill: "attack",
                                  result: event.result.startsWith("simple_")
                                    ? event.result
                                    : r.winner === "theirs"
                                      ? "error"
                                      : "simple_good",
                                  assessment: {
                                    ...a,
                                    tags,
                                    group: undefined,
                                    ...(a.version >= 3
                                      ? {
                                          criteria: {
                                            attackType: "tip" as const,
                                          },
                                          difficulty:
                                            effectiveDifficulty(event),
                                          difficultySource: "manual" as const,
                                        }
                                      : {}),
                                  },
                                  participants: undefined,
                                });
                              } else if (
                                a.version >= 3 &&
                                tags.includes(t.id) &&
                                [
                                  "rule_fault",
                                  "out_fault",
                                  "ugly_error",
                                  "net_fault",
                                ].includes(t.id)
                              )
                                onChange({
                                  ...event,
                                  result: "simple_theirs",
                                  winner: undefined,
                                  assessment: {
                                    ...a,
                                    tags,
                                    execution: "error",
                                  },
                                });
                              else change({ tags });
                            }}
                          >
                            <Icon size={20} aria-hidden="true" />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </details>
                );
              },
            )}
            {!group && (
              <label>
                Responsabilidade individual
                <CardSelect
                  value={a.responsibility ?? ""}
                  disabled={!!group}
                  onChange={(e) =>
                    change({
                      responsibility: (e.target.value || undefined) as
                        Responsibility | undefined,
                    })
                  }
                >
                  <option value="">Conforme resultado e execução</option>
                  {Object.entries(responsibilityLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </CardSelect>
              </label>
            )}
            <p className="assessment-preview">
              Avaliação desta execução:{" "}
              {assessed({ ...event, assessment: a }).rated
                ? `${(assessed({ ...event, assessment: a }).quality * 10).toFixed(1)}/10`
                : "sem nota"}{" "}
              · sem bônus acumulados.
            </p>
          </details>
        </>
      )}
      {group && !hideParticipants && (
        <div className="participant-editor">
          <p>
            <UsersRound size={18} aria-hidden="true" /> Selecione{" "}
            {group === "double" ? "2" : group === "triple" ? "3" : "de 2 a 6"}{" "}
            participantes e indique quem acertou ou errou.
          </p>
          {!hideChecklist && (
            <div className="participant-options">
              {players.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  disabled={
                    !participants.some((x) => x.playerId === p.id) &&
                    participants.length >=
                      (group === "double" ? 2 : group === "triple" ? 3 : 6)
                  }
                  aria-pressed={participants.some((x) => x.playerId === p.id)}
                  onClick={() => {
                    const selected = participants.some(
                      (x) => x.playerId === p.id,
                    );
                    const next = selected
                      ? participants.filter((x) => x.playerId !== p.id)
                      : [
                          ...participants,
                          {
                            playerId: p.id,
                            responsibility: "correct" as const,
                          },
                        ];
                    onChange({
                      ...event,
                      assessment: a,
                      participants: next,
                      playerId: next.some((x) => x.playerId === event.playerId)
                        ? event.playerId
                        : next[0]?.playerId,
                    });
                  }}
                >
                  <Photo player={p} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          )}
          {participants.map((p) => {
            const player = match.players.find((x) => x.id === p.playerId);
            return (
              <div className="participant-verdict" key={p.playerId}>
                <span>{player?.name ?? p.playerId}</span>
                <details
                  className="participant-extra"
                  open={compact ? undefined : true}
                >
                  <summary>
                    <SlidersHorizontal size={16} aria-hidden="true" />
                    Detalhar participação
                  </summary>
                  {group === "combination" && (
                    <label>
                      Fundamento
                      <CardSelect
                        aria-label={`Fundamento ${player?.name ?? p.playerId}`}
                        value={p.skill ?? event.skill}
                        disabled={
                          group !== "combination" ||
                          p.playerId === event.playerId
                        }
                        onChange={(e) =>
                          onChange({
                            ...event,
                            assessment: a,
                            participants: participants.map((x) =>
                              x.playerId === p.playerId
                                ? {
                                    ...x,
                                    skill: e.target.value as Exclude<
                                      SkillEvent["skill"],
                                      "opponent"
                                    >,
                                    criteria: undefined,
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        {Object.entries(skills)
                          .filter(([s]) => s !== "opponent")
                          .map(([id, s]) => (
                            <option key={id} value={id}>
                              {s.label}
                            </option>
                          ))}
                      </CardSelect>
                    </label>
                  )}
                  <label>
                    Dificuldade
                    <CardSelect
                      aria-label={`Dificuldade ${player?.name ?? p.playerId}`}
                      value={p.difficulty ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...event,
                          assessment: a,
                          participants: participants.map((x) =>
                            x.playerId === p.playerId
                              ? {
                                  ...x,
                                  difficulty: (e.target.value || undefined) as
                                    Difficulty | undefined,
                                }
                              : x,
                          ),
                        })
                      }
                    >
                      <option value="">Conforme jogada</option>
                      {Object.entries(difficultyLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </CardSelect>
                  </label>
                  {a.version >= 3 && (
                    <CriteriaFields
                      skill={p.skill ?? event.skill}
                      value={p.criteria}
                      onChange={(criteria) =>
                        onChange({
                          ...event,
                          participants: participants.map((x) =>
                            x.playerId === p.playerId ? { ...x, criteria } : x,
                          ),
                        })
                      }
                    />
                  )}
                </details>
                <label>
                  Execução
                  <CardSelect
                    aria-label={`Execução ${player?.name ?? p.playerId}`}
                    value={p.responsibility}
                    onChange={(e) =>
                      onChange({
                        ...event,
                        assessment: a,
                        participants: participants.map((x) =>
                          x.playerId === p.playerId
                            ? {
                                ...x,
                                responsibility: e.target
                                  .value as Responsibility,
                              }
                            : x,
                        ),
                      })
                    }
                  >
                    {Object.entries(responsibilityLabels).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </CardSelect>
                </label>
              </div>
            );
          })}
          <label>
            Autor principal / finalizador
            <CardSelect
              aria-label="Autor principal da jogada"
              value={event.playerId ?? ""}
              onChange={(e) =>
                onChange({
                  ...event,
                  assessment: a,
                  playerId: e.target.value,
                  participants: participants.map((p) =>
                    p.playerId === e.target.value
                      ? {
                          ...p,
                          skill: event.skill as Exclude<
                            SkillEvent["skill"],
                            "opponent"
                          >,
                        }
                      : p,
                  ),
                })
              }
            >
              <option value="" disabled>
                Selecione
              </option>
              {participants.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {match.players.find((x) => x.id === p.playerId)?.name}
                </option>
              ))}
            </CardSelect>
          </label>
          <p className="muted">
            O ponto conta uma vez para o time. Crédito de ponto individual só
            para o finalizador que acertou. Participações corretas têm crédito
            reduzido. Use este registro no lugar de registrar as mesmas
            execuções individualmente.
          </p>
        </div>
      )}
    </section>
  );
}
