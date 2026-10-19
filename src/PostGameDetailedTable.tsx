import { Upload } from "lucide-react";
import { CardSelect } from "./CardSelect";
import { postResults } from "./postgame";
import { useMemo, useRef, useState } from "react";
import { append, assignToZone, project } from "./engine";
import { archiveGame } from "./career";
import {
  type Command,
  type Match,
  type Role,
  type Skill,
  roleLabels,
  skills,
} from "./model";
import { formationAt } from "./formation";
import {
  newDetailedDraft,
  replayDetailed,
  validDetailedDraft,
} from "./postgameDetailed";
import { download } from "./storage";
import { postDate } from "./postgame";
import { AssessmentFields } from "./AssessmentFields";
import { normalAssessment } from "./assessment";
import { VideoReview } from "./VideoReview";

export function PostGameDetailed({
  match,
  onChange,
  onApplied,
}: {
  match: Match;
  onChange: (m: Match) => boolean;
  onApplied: () => void;
}) {
  const [initial] = useState(() => newDetailedDraft(match));
  const draft = match.detailedDraft ?? initial;
  const [message, setMessage] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const previous = useRef<
    { draft: typeof draft; source: Match; match: Match } | undefined
  >(undefined);
  const replay = useMemo(() => {
    const value = replayDetailed(draft, match, previous.current);
    previous.current = { draft, source: match, match: value.match };
    return value;
  }, [
    draft,
    match.players,
    match.history,
    match.videos,
    match.weights,
    match.ratingProfiles,
    match.middleCoverage,
    match.middleBackrowWeights,
    match.initialAutoLibero,
  ]);
  const state = project(replay.match);
  const save = (next: typeof draft) => {
    setConfirmSave(false);
    return onChange({ ...match, detailedDraft: next });
  };
  const update = (index: number, command: Command) =>
    save({
      ...draft,
      rows: draft.rows.map((r, i) => (i === index ? { ...r, command } : r)),
    });
  const defaultCommand = (type: Command["type"]): Command => {
    if (type === "event")
      return {
        type,
        event: {
          playerId: state.lineup[0],
          skill: "attack",
          result: "simple_good",
          assessment: normalAssessment(),
        },
      };
    if (type === "point") return { type, winner: "ours" };
    if (type === "timeout") return { type, side: "ours" };
    if (type === "sub")
      return {
        type,
        outgoing: state.lineup[0],
        incoming:
          match.players.find((p) => !p.libero && !state.lineup.includes(p.id))
            ?.id ?? state.lineup[1],
      };
    if (type === "libero")
      return state.libero
        ? { type }
        : {
            type,
            playerId: match.players.find((p) => p.libero)?.id,
            replaced: state.lineup[4],
          };
    if (type === "autoLibero") return { type, enabled: !state.autoLibero };
    if (type === "restartSet") return { type };
    return {
      type,
      lineup: [...draft.lineup],
      roles: [...draft.roles],
      server: "ours",
    };
  };
  const playerOptions = match.players.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name} · #{p.number}
    </option>
  ));
  return (
    <div className="postgame-layout">
      <section className="card postgame-card">
        <h2>Ficha completa · rally a rally</h2>
        <p className="muted">
          Preencha as linhas na ordem do jogo, agora ou a partir de uma
          gravação. Rotação, placar, notas, substituições e tempos serão
          reconstruídos automaticamente. O vídeo é opcional; horário do rally
          não é estimado.
        </p>
        <div className="postgame-fields">
          <label>
            Adversário
            <input
              value={draft.opponent}
              onChange={(e) => save({ ...draft, opponent: e.target.value })}
            />
          </label>
          <label>
            Data
            <input
              type="date"
              value={postDate(draft.date)}
              onChange={(e) => {
                if (e.target.value)
                  save({
                    ...draft,
                    date: new Date(e.target.value + "T12:00:00").toISOString(),
                  });
              }}
            />
          </label>
          <label>
            Formato
            <CardSelect
              value={draft.bestOf}
              onChange={(e) =>
                save({ ...draft, bestOf: Number(e.target.value) as 3 | 5 })
              }
            >
              <option value={5}>Melhor de 5</option>
              <option value={3}>Melhor de 3</option>
            </CardSelect>
          </label>
          <label>
            Primeiro saque
            <CardSelect
              value={draft.server}
              onChange={(e) =>
                save({ ...draft, server: e.target.value as "ours" | "theirs" })
              }
            >
              <option value="ours">Nosso</option>
              <option value="theirs">Deles</option>
            </CardSelect>
          </label>
        </div>
        <details className="postgame-formation postgame-disclosure">
          <summary>Formação inicial · ajustar jogadores e funções</summary>
          <div className="postgame-court">
            <span className="postgame-net">REDE</span>
            {[4, 3, 2, 5, 6, 1].map((zone) => (
              <label key={zone}>
                Zona {zone}
                <CardSelect
                  aria-label={`Pós-jogo jogador zona ${zone}`}
                  value={draft.lineup[zone - 1]}
                  onChange={(e) =>
                    save({
                      ...draft,
                      lineup: assignToZone(draft.lineup, zone, e.target.value),
                    })
                  }
                >
                  {match.players
                    .filter((p) => !p.libero)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </CardSelect>
                <CardSelect
                  aria-label={`Pós-jogo função zona ${zone}`}
                  value={draft.roles[zone - 1]}
                  onChange={(e) =>
                    save({
                      ...draft,
                      roles: draft.roles.map((r, i) =>
                        i === zone - 1 ? (e.target.value as Role) : r,
                      ),
                    })
                  }
                >
                  {Object.entries(roleLabels)
                    .filter(([r]) => r !== "libero")
                    .map(([r, label]) => (
                      <option key={r} value={r}>
                        {label}
                      </option>
                    ))}
                </CardSelect>
              </label>
            ))}
          </div>
          <button
            className="button secondary"
            onClick={() => {
              const f = formationAt(draft.lineup, 6);
              save({
                ...draft,
                lineup: f.lineup,
                roles: [...draft.roles.slice(1), draft.roles[0]],
              });
            }}
          >
            Rodar formação
          </button>
        </details>
        <div className="postgame-toolbar">
          <label className="button secondary file-button">
            <Upload size={16} aria-hidden="true" />
            Importar ficha JSON
            <input
              className="sr-only"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 5 * 1024 * 1024)
                    throw new Error("Ficha muito grande.");
                  const data = JSON.parse(await file.text());
                  if (!validDetailedDraft(data, match))
                    throw new Error("Ficha inválida.");
                  if (
                    window.confirm(
                      "Carregar esta ficha no editor? A partida atual não será alterada até salvar.",
                    )
                  )
                    save(data);
                } catch {
                  setMessage("Arquivo inválido. A ficha atual foi preservada.");
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            className="button secondary"
            onClick={() =>
              download(
                "pos-jogo-completo.json",
                JSON.stringify(draft, null, 2),
                "application/json",
              )
            }
          >
            Exportar ficha JSON
          </button>
        </div>
        <VideoReview
          videos={replay.match.videos}
          marks={draft.rows.flatMap((r, i) =>
            r.command.type === "event"
              ? [{ id: r.id, label: `Ação ${i + 1}`, event: r.command.event }]
              : [],
          )}
          onMark={(stamp) => {
            const command = defaultCommand("event");
            if (command.type === "event")
              save({
                ...draft,
                rows: [
                  ...draft.rows,
                  {
                    id: crypto.randomUUID(),
                    command: {
                      ...command,
                      event: { ...command.event, ...stamp },
                    },
                  },
                ],
              });
          }}
        />
        <div className="postgame-table-wrap">
          <table className="postgame-table detailed-table">
            <thead>
              <tr>
                <th>Linha / set / rally</th>
                <th>Ação</th>
                <th>Jogador / troca</th>
                <th>Fundamento / resultado</th>
                <th>Zona / toque / vídeo</th>
                <th>Organizar</th>
              </tr>
            </thead>
            <tbody>
              {draft.rows.map((row, index) => {
                const c = row.command,
                  context = replay.match.audit[index]?.context;
                return (
                  <tr
                    key={row.id}
                    className={
                      replay.failedRow === index ? "postgame-row-error" : ""
                    }
                  >
                    <td>
                      <b>{index + 1}</b>
                      <small>
                        {context
                          ? `Set ${context.set} · Rally ${context.rally}`
                          : "Aguardando correção anterior"}
                      </small>
                    </td>
                    <td>
                      <CardSelect
                        aria-label={`Ação linha ${index + 1}`}
                        value={c.type}
                        onChange={(e) =>
                          update(
                            index,
                            defaultCommand(e.target.value as Command["type"]),
                          )
                        }
                      >
                        {[
                          ["event", "Toque / fundamento"],
                          ["point", "Ponto sem fundamento"],
                          ["timeout", "Pedido de tempo"],
                          ["sub", "Substituição"],
                          ["libero", "Líbero entra/sai"],
                          ["autoLibero", "Líbero automático"],
                          ["nextSet", "Início do próximo set"],
                          ["restartSet", "Reiniciar este set"],
                        ].map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </CardSelect>
                    </td>
                    <td>
                      {c.type === "event" && (
                        <CardSelect
                          aria-label={`Jogador linha ${index + 1}`}
                          value={c.event.playerId ?? ""}
                          disabled={c.event.skill === "opponent"}
                          onChange={(e) =>
                            update(index, {
                              ...c,
                              event: { ...c.event, playerId: e.target.value },
                            })
                          }
                        >
                          {c.event.skill === "opponent" ? (
                            <option value="">Adversário</option>
                          ) : (
                            playerOptions
                          )}
                        </CardSelect>
                      )}
                      {c.type === "sub" && (
                        <>
                          <label>
                            Sai
                            <CardSelect
                              value={c.outgoing}
                              onChange={(e) =>
                                update(index, {
                                  ...c,
                                  outgoing: e.target.value,
                                })
                              }
                            >
                              {playerOptions}
                            </CardSelect>
                          </label>
                          <label>
                            Entra
                            <CardSelect
                              value={c.incoming}
                              onChange={(e) =>
                                update(index, {
                                  ...c,
                                  incoming: e.target.value,
                                })
                              }
                            >
                              {playerOptions}
                            </CardSelect>
                          </label>
                        </>
                      )}
                      {c.type === "libero" && (
                        <>
                          <label>
                            Movimento
                            <CardSelect
                              value={c.playerId ? "enter" : "exit"}
                              onChange={(e) =>
                                update(
                                  index,
                                  e.target.value === "exit"
                                    ? { type: "libero" }
                                    : {
                                        type: "libero",
                                        playerId: match.players.find(
                                          (p) => p.libero,
                                        )?.id,
                                        replaced: draft.lineup[4],
                                      },
                                )
                              }
                            >
                              <option value="enter">Entrada</option>
                              <option value="exit">Saída</option>
                            </CardSelect>
                          </label>
                          {c.playerId && (
                            <label>
                              Substitui
                              <CardSelect
                                value={c.replaced}
                                onChange={(e) =>
                                  update(index, {
                                    ...c,
                                    replaced: e.target.value,
                                  })
                                }
                              >
                                {playerOptions}
                              </CardSelect>
                            </label>
                          )}
                        </>
                      )}
                      {(c.type === "nextSet" || c.type === "setup") && (
                        <div className="postgame-set-lineup">
                          {[1, 2, 3, 4, 5, 6].map((zone) => (
                            <label key={zone}>
                              Z{zone}
                              <CardSelect
                                value={c.lineup[zone - 1]}
                                onChange={(e) =>
                                  update(index, {
                                    ...c,
                                    lineup: assignToZone(
                                      c.lineup,
                                      zone,
                                      e.target.value,
                                    ),
                                  })
                                }
                              >
                                {match.players
                                  .filter((p) => !p.libero)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                              </CardSelect>
                              <CardSelect
                                aria-label={`Função set linha ${index + 1} zona ${zone}`}
                                value={
                                  c.roles?.[zone - 1] ?? draft.roles[zone - 1]
                                }
                                onChange={(e) =>
                                  update(index, {
                                    ...c,
                                    roles: (c.roles ?? draft.roles).map(
                                      (r, i) =>
                                        i === zone - 1
                                          ? (e.target.value as Role)
                                          : r,
                                    ),
                                  })
                                }
                              >
                                {Object.entries(roleLabels)
                                  .filter(([r]) => r !== "libero")
                                  .map(([r, label]) => (
                                    <option key={r} value={r}>
                                      {label}
                                    </option>
                                  ))}
                              </CardSelect>
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {c.type === "event" && (
                        <>
                          <CardSelect
                            aria-label={`Fundamento linha ${index + 1}`}
                            value={c.event.skill}
                            onChange={(e) => {
                              const skill = e.target.value as Skill;
                              update(index, {
                                ...c,
                                event: {
                                  ...c.event,
                                  skill,
                                  result:
                                    skill === "opponent"
                                      ? "error"
                                      : ["reception", "defense"].includes(skill)
                                        ? "simple_B"
                                        : "simple_good",
                                  playerId:
                                    skill === "opponent"
                                      ? undefined
                                      : (c.event.playerId ?? draft.lineup[0]),
                                  winner: undefined,
                                  assessment:
                                    skill === "opponent"
                                      ? undefined
                                      : normalAssessment(),
                                  participants: undefined,
                                },
                              });
                            }}
                          >
                            {Object.entries(skills).map(([id, s]) => (
                              <option key={id} value={id}>
                                {s.label}
                              </option>
                            ))}
                          </CardSelect>
                          <CardSelect
                            aria-label={`Resultado linha ${index + 1}`}
                            value={c.event.result}
                            onChange={(e) =>
                              update(index, {
                                ...c,
                                event: {
                                  ...c.event,
                                  result: e.target.value,
                                  winner: undefined,
                                  assessment: c.event.assessment
                                    ? {
                                        ...c.event.assessment,
                                        execution: undefined,
                                        criteria: c.event.assessment.criteria
                                          ? Object.fromEntries(
                                              Object.entries(
                                                c.event.assessment.criteria,
                                              ).filter(
                                                ([key]) =>
                                                  key !== "passQuality" &&
                                                  key !== "blockQuality",
                                              ),
                                            )
                                          : undefined,
                                      }
                                    : undefined,
                                },
                              })
                            }
                          >
                            {postResults(
                              c.event.skill,
                              "simple",
                              c.event.assessment?.version,
                            ).map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </CardSelect>
                          <label>
                            Encerrar rally
                            <CardSelect
                              value={c.event.winner ?? ""}
                              onChange={(e) =>
                                update(index, {
                                  ...c,
                                  event: {
                                    ...c.event,
                                    winner: e.target.value
                                      ? (e.target.value as "ours" | "theirs")
                                      : undefined,
                                  },
                                })
                              }
                            >
                              <option value="">Conforme resultado</option>
                              <option value="ours">Ponto nosso</option>
                              <option value="theirs">Ponto deles</option>
                            </CardSelect>
                          </label>
                          <AssessmentFields
                            event={c.event}
                            onChange={(event) => update(index, { ...c, event })}
                            match={match}
                          />
                        </>
                      )}
                      {(c.type === "point" ||
                        c.type === "timeout" ||
                        c.type === "nextSet" ||
                        c.type === "setup") && (
                        <label>
                          {c.type === "timeout"
                            ? "Quem pediu"
                            : c.type === "point"
                              ? "Quem pontuou"
                              : "Primeiro saque"}
                          <CardSelect
                            value={
                              c.type === "point"
                                ? c.winner
                                : c.type === "timeout"
                                  ? c.side
                                  : c.server
                            }
                            onChange={(e) => {
                              const side = e.target.value as "ours" | "theirs";
                              update(
                                index,
                                c.type === "point"
                                  ? { ...c, winner: side }
                                  : c.type === "timeout"
                                    ? { ...c, side }
                                    : { ...c, server: side },
                              );
                            }}
                          >
                            <option value="ours">Nosso time</option>
                            <option value="theirs">Adversário</option>
                          </CardSelect>
                        </label>
                      )}
                      {c.type === "autoLibero" && (
                        <label>
                          Troca automática
                          <CardSelect
                            value={String(c.enabled)}
                            onChange={(e) =>
                              update(index, {
                                ...c,
                                enabled: e.target.value === "true",
                              })
                            }
                          >
                            <option value="true">Ativar</option>
                            <option value="false">Desativar</option>
                          </CardSelect>
                        </label>
                      )}
                      {c.type === "restartSet" && (
                        <p>
                          Retira deste set pontos, ações e notas anteriores,
                          preservando a auditoria.
                        </p>
                      )}
                    </td>
                    <td>
                      {c.type === "event" && (
                        <>
                          <label>
                            Zona
                            <CardSelect
                              value={c.event.zone ?? ""}
                              onChange={(e) =>
                                update(index, {
                                  ...c,
                                  event: {
                                    ...c.event,
                                    zone: e.target.value
                                      ? (Number(e.target.value) as
                                          1 | 2 | 3 | 4 | 5 | 6)
                                      : undefined,
                                  },
                                })
                              }
                            >
                              <option value="">Não informada</option>
                              {[1, 2, 3, 4, 5, 6].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </CardSelect>
                          </label>
                          <label>
                            Toque
                            <CardSelect
                              value={c.event.touch ?? ""}
                              onChange={(e) =>
                                update(index, {
                                  ...c,
                                  event: {
                                    ...c.event,
                                    touch: e.target.value
                                      ? (Number(e.target.value) as 1 | 2 | 3)
                                      : undefined,
                                  },
                                })
                              }
                            >
                              <option value="">Não informado</option>
                              {[1, 2, 3].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </CardSelect>
                          </label>
                          <label>
                            Vídeo · segundos
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={
                                c.event.videoTimestampMs === undefined
                                  ? ""
                                  : c.event.videoTimestampMs / 1000
                              }
                              onChange={(e) =>
                                update(index, {
                                  ...c,
                                  event: {
                                    ...c.event,
                                    videoTimestampMs:
                                      e.target.value === ""
                                        ? undefined
                                        : Number(e.target.value) * 1000,
                                  },
                                })
                              }
                            />
                          </label>
                        </>
                      )}
                    </td>
                    <td>
                      <button
                        className="button secondary"
                        aria-label={`Subir linha ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => {
                          const rows = [...draft.rows];
                          [rows[index - 1], rows[index]] = [
                            rows[index],
                            rows[index - 1],
                          ];
                          save({ ...draft, rows });
                        }}
                      >
                        ↑
                      </button>
                      <button
                        className="button secondary"
                        aria-label={`Descer linha ${index + 1}`}
                        disabled={index === draft.rows.length - 1}
                        onClick={() => {
                          const rows = [...draft.rows];
                          [rows[index + 1], rows[index]] = [
                            rows[index],
                            rows[index + 1],
                          ];
                          save({ ...draft, rows });
                        }}
                      >
                        ↓
                      </button>
                      <button
                        className="button secondary"
                        aria-label={`Duplicar linha ${index + 1}`}
                        disabled={draft.rows.length >= 5000}
                        onClick={() =>
                          save({
                            ...draft,
                            rows: [
                              ...draft.rows.slice(0, index + 1),
                              {
                                id: crypto.randomUUID(),
                                command: structuredClone(c),
                              },
                              ...draft.rows.slice(index + 1),
                            ],
                          })
                        }
                      >
                        Duplicar
                      </button>
                      <button
                        className="button secondary"
                        aria-label={`Remover linha ${index + 1}`}
                        onClick={() =>
                          save({
                            ...draft,
                            rows: draft.rows.filter((_, i) => i !== index),
                          })
                        }
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="postgame-toolbar">
          <button
            className="button primary"
            disabled={draft.rows.length >= 5000}
            onClick={() =>
              save({
                ...draft,
                rows: [
                  ...draft.rows,
                  {
                    id: crypto.randomUUID(),
                    command: defaultCommand(
                      state.setFinished && !state.finished
                        ? "nextSet"
                        : "event",
                    ),
                  },
                ],
              })
            }
          >
            Adicionar linha
          </button>
          <button
            className="button ghost push-end"
            onClick={() => {
              if (
                window.confirm(
                  "Criar outra ficha? Exporte a ficha atual se quiser guardá-la. A partida ao vivo será mantida.",
                )
              )
                save(newDetailedDraft(match));
            }}
          >
            Nova ficha
          </button>
        </div>
        {replay.error && (
          <p role="alert" className="storage-error">
            {replay.error}
          </p>
        )}
        <section className="postgame-preview">
          <h3>Prévia reconstruída</h3>
          <p>
            Sets {state.sets[0]}–{state.sets[1]} · Set {state.set}:{" "}
            {state.score[0]}–{state.score[1]} · {state.events.length} ações ·{" "}
            {state.rallies.length} rallies
          </p>
          <p className="muted">
            {state.finished
              ? "Partida completa. Pronta para salvar e analisar."
              : "Preencha até encerrar a partida. O rascunho fica salvo a cada alteração."}
          </p>
        </section>
        <button
          className="button primary"
          disabled={
            Boolean(replay.error) || !state.finished || !draft.opponent.trim()
          }
          onClick={() => {
            if (!confirmSave) {
              setConfirmSave(true);
              return;
            }
            const next = {
              ...replay.match,
              history: archiveGame(match).filter((g) => g.id !== draft.id),
              detailedDraft: draft,
              postGameDraft: match.postGameDraft,
              postGameVersions:
                match.id === draft.id
                  ? [
                      ...(match.postGameVersions ?? []),
                      {
                        savedAt: new Date().toISOString(),
                        initialLineup: match.initialLineup,
                        initialRoles: match.initialRoles,
                        initialServer: match.initialServer,
                        initialAutoLibero: match.initialAutoLibero,
                        bestOf: match.bestOf,
                        opponent: match.opponent,
                        audit: match.audit,
                        weights: match.weights,
                        ratingProfiles: match.ratingProfiles,
                      },
                    ]
                  : undefined,
            };
            if (onChange(next)) {
              setMessage("Partida salva. Todas as análises estão disponíveis.");
              onApplied();
            }
          }}
        >
          {confirmSave
            ? "Confirmar e abrir análise"
            : "Salvar partida completa e abrir análise"}
        </button>
        {!replay.error && (!state.finished || !draft.opponent.trim()) && (
          <p className="disabled-reason">
            {!draft.opponent.trim()
              ? "Informe o adversário para salvar."
              : "Preencha as linhas até o fim da partida para salvar."}
          </p>
        )}
        {confirmSave && (
          <div role="status" className="postgame-preview">
            <p>
              A ficha será a partida atual. O resumo anterior fica no histórico.
              Exporte o JSON atual para guardar também sua auditoria completa.
            </p>
            <button
              className="button secondary"
              onClick={() => setConfirmSave(false)}
            >
              Cancelar
            </button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </section>
    </div>
  );
}
