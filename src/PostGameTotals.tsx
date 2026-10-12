import { useMemo, useState } from "react";
import {
  type Match,
  type Role,
  type Skill,
  type AssessmentCriteria,
  roleLabels,
} from "./model";
import { CriteriaFields } from "./CriteriaFields";
import { Photo } from "./PlayerProfile";
import {
  archivePostGame,
  countKey,
  emptyPostSet,
  newPostGame,
  postCoverage,
  postGameErrors,
  postResults,
  postSkills,
  postSummary,
  postDate,
  type PostGame,
  cellAssessment,
} from "./postgame";
import { download } from "./storage";
import { ExecutionSummary } from "./ExecutionSummary";
import { difficultyLabels, tagsFor, type Difficulty } from "./assessment";
import { visibleTags } from "./assessment";
import { criteriaText } from "./criteria";

export function PostGameTotals({
  match,
  onChange,
}: {
  match: Match;
  onChange: (m: Match) => boolean;
}) {
  const [initial] = useState(() => newPostGame(match));
  const game = match.postGameDraft ?? initial;
  const [difficulty, setDifficulty] = useState<Difficulty | "legacy">(
    match.postGameDraft?.sets.some((s) =>
      s.rows.some((r) =>
        Object.entries(r.counts).some(
          ([k, n]) => n > 0 && k.split(":").length === 2,
        ),
      ),
    )
      ? "legacy"
      : "normal",
  );
  const [situation, setSituation] = useState("");
  const [criteria, setCriteria] = useState<AssessmentCriteria>({});
  const [difficultySource, setDifficultySource] = useState<
    "manual" | "context"
  >("context");
  const keyFor = (s: Skill, result: string) =>
    countKey(
      s,
      result,
      difficulty === "legacy" ? undefined : difficulty,
      situation,
      (game.ratingVersion ?? 0) >= 3 && difficulty !== "legacy"
        ? criteria
        : undefined,
      difficultySource,
    );
  const [setIndex, setSetIndex] = useState(0),
    [skill, setSkill] = useState<Skill>("attack"),
    [reportSet, setReportSet] = useState(0);
  const [message, setMessage] = useState(""),
    [extraPlayer, setExtraPlayer] = useState(match.players[0].id);
  const index = Math.min(setIndex, game.sets.length - 1),
    set = game.sets[index];
  const results = postResults(skill, game.mode, game.ratingVersion);
  const report = useMemo(
    () => postSummary(game, match, reportSet),
    [
      game,
      match.weights,
      match.ratingProfiles,
      match.middleBackrowWeights,
      match.players,
      reportSet,
    ],
  );
  const save = (next: PostGame) => {
    const errors = postGameErrors(next, match);
    if (errors.length) {
      setMessage(errors[0]);
      return false;
    }
    return onChange({ ...match, postGameDraft: next });
  };
  const changeSet = (next: typeof set) =>
    save({ ...game, sets: game.sets.map((s, i) => (i === index ? next : s)) });
  const hasCounts = game.sets.some((s) =>
    s.rows.some((r) => Object.values(r.counts).some((n) => n > 0)),
  );
  const errors = postGameErrors(game, match, true);
  const coverage = postCoverage(game, index + 1);
  const grade = (n: number | null) => (n === null ? "—" : n.toFixed(1));
  return (
    <div className="postgame-layout">
      <section className="card postgame-card">
        <h2>Totais por set · preenchimento rápido</h2>
        <p className="muted">
          Digite quantidades, sem registrar cada rally. Notas, destaques e
          histórico individual são calculados; sequência dos pontos, rotação,
          tempos e trocas não podem ser reconstruídos a partir dos totais. Use a
          ficha completa para essas análises.
        </p>
        <div className="postgame-fields">
          <label>
            Adversário
            <input
              value={game.opponent}
              onChange={(e) => save({ ...game, opponent: e.target.value })}
            />
          </label>
          <label>
            Data
            <input
              type="date"
              value={postDate(game.date)}
              onChange={(e) => {
                if (e.target.value)
                  save({
                    ...game,
                    date: new Date(e.target.value + "T12:00:00").toISOString(),
                  });
              }}
            />
          </label>
          <label>
            Formato
            <select
              value={game.bestOf}
              onChange={(e) => {
                const bestOf = Number(e.target.value) as 3 | 5;
                if (game.sets.length > bestOf) {
                  setMessage(
                    "Remova os sets excedentes antes de mudar o formato.",
                  );
                  return;
                }
                save({ ...game, bestOf });
              }}
            >
              <option value={5}>Melhor de 5</option>
              <option value={3}>Melhor de 3</option>
            </select>
          </label>
          {(game.ratingVersion ?? 0) < 4 && (
            <label>
              Detalhamento
              <select
                disabled={hasCounts}
                value={game.mode}
                onChange={(e) =>
                  save({ ...game, mode: e.target.value as PostGame["mode"] })
                }
              >
                <option value="simple">Simples · Bom / Gafe / Ponto</option>
                <option value="advanced">Avançado · todas as qualidades</option>
              </select>
            </label>
          )}
        </div>
        <div className="postgame-toolbar">
          {game.sets.map((_, i) => (
            <button
              className={`button ${index === i ? "" : "secondary"}`}
              key={i}
              onClick={() => setSetIndex(i)}
            >
              Set {i + 1}
            </button>
          ))}
          <button
            className="button secondary"
            disabled={game.sets.length >= game.bestOf}
            onClick={() => {
              if (save({ ...game, sets: [...game.sets, emptyPostSet(match)] }))
                setSetIndex(game.sets.length);
            }}
          >
            + Set
          </button>
          <button
            className="button secondary"
            disabled={game.sets.length <= 1}
            onClick={() => {
              if (
                window.confirm(
                  "Remover o último set desta ficha e suas quantidades?",
                )
              ) {
                save({ ...game, sets: game.sets.slice(0, -1) });
                setSetIndex(Math.max(0, game.sets.length - 2));
                setReportSet(0);
              }
            }}
          >
            Remover último set
          </button>
        </div>
        <div className="postgame-fields">
          <label>
            Placar nosso
            <input
              aria-label="Pós-jogo placar nosso"
              type="number"
              min={0}
              max={200}
              value={set.score[0]}
              onChange={(e) =>
                changeSet({
                  ...set,
                  score: [Number(e.target.value), set.score[1]],
                })
              }
            />
          </label>
          <label>
            Placar deles
            <input
              aria-label="Pós-jogo placar deles"
              type="number"
              min={0}
              max={200}
              value={set.score[1]}
              onChange={(e) =>
                changeSet({
                  ...set,
                  score: [set.score[0], Number(e.target.value)],
                })
              }
            />
          </label>
          <label>
            Pontos por erro adversário
            <input
              type="number"
              min={0}
              value={set.opponentErrors}
              onChange={(e) =>
                changeSet({ ...set, opponentErrors: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <div className="postgame-toolbar">
          {postSkills.map((s) => (
            <button
              key={s}
              className={`button ${skill === s ? "" : "secondary"}`}
              onClick={() => {
                setSkill(s);
                setSituation("");
                setCriteria({});
                setDifficultySource("context");
              }}
            >
              {
                {
                  serve: "Saque",
                  reception: "Recepção",
                  set: "Levantamento",
                  attack: "Ataque",
                  block: "Bloqueio",
                  defense: "Defesa",
                }[s]
              }
            </button>
          ))}
        </div>
        <p className="muted">
          Uma linha por jogador/função no set. Você pode colar um bloco de
          números de uma planilha na primeira célula desejada. Zero ou vazio
          significa nenhuma ação.
        </p>
        <div className="postgame-fields">
          <label>
            Dificuldade das bolas nesta tabela
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value as Difficulty | "legacy");
                setDifficultySource("manual");
              }}
            >
              <option value="legacy">
                Sem contexto · registros anteriores
              </option>
              {Object.entries(difficultyLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {(game.ratingVersion ?? 0) < 4 && (
            <label>
              Situação específica
              <select
                value={situation}
                disabled={difficulty === "legacy"}
                onChange={(e) => setSituation(e.target.value)}
              >
                <option value="">Sem etiqueta</option>
                {visibleTags(skill, game.ratingVersion ?? 1).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {(game.ratingVersion ?? 0) >= 3 && difficulty !== "legacy" && (
          <details className="assessment-details">
            <summary>
              Critérios de{" "}
              {skill === "set"
                ? "levantamento"
                : skill === "attack"
                  ? "ataque"
                  : skill === "reception"
                    ? "recepção"
                    : skill === "defense"
                      ? "defesa"
                      : skill === "serve"
                        ? "saque"
                        : "bloqueio"}{" "}
              · filtro da tabela
            </summary>
            <CriteriaFields
              skill={skill}
              value={criteria}
              hidePass={(game.ratingVersion ?? 0) >= 4}
              onChange={setCriteria}
            />
            <p className="ui-note">
              Cada combinação de critérios tem suas próprias quantidades.
              Alterar o filtro mantém os outros registros.
            </p>
          </details>
        )}
        <p className="muted">
          Os números abaixo pertencem apenas à dificuldade, critérios e situação
          selecionadas. Alterar o filtro mantém os outros dados.{" "}
          {set.rows.reduce(
            (n, r) => n + Object.values(r.counts).reduce((a, b) => a + b, 0),
            0,
          )}{" "}
          ações registradas no set, em todos os filtros. Para combinar várias
          etiquetas ou avaliar participantes de uma jogada, use a ficha
          completa.
        </p>
        <div className="postgame-table-wrap">
          <table className="postgame-table totals-table">
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Função no set</th>
                {results.map((r) => (
                  <th key={r.id}>{r.label}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {set.rows.map((row, rowIndex) => {
                const player = match.players.find(
                  (p) => p.id === row.playerId,
                )!;
                return (
                  <tr key={`${row.playerId}:${rowIndex}`}>
                    <td>
                      <span className="postgame-player">
                        <Photo player={player} />
                        {player.name}
                        <small>#{player.number}</small>
                      </span>
                    </td>
                    <td>
                      {(game.ratingVersion ?? 0) >= 2 &&
                        row.role === "middle" && (
                          <label>
                            Contexto
                            <select
                              aria-label={`Contexto ${player.name} linha ${rowIndex + 1}`}
                              value={row.coverage ?? "standard"}
                              onChange={(e) =>
                                changeSet({
                                  ...set,
                                  rows: set.rows.map((r, i) =>
                                    i === rowIndex
                                      ? {
                                          ...r,
                                          coverage: e.target
                                            .value as typeof r.coverage,
                                        }
                                      : r,
                                  ),
                                })
                              }
                            >
                              <option value="standard">
                                Rede / contexto não informado
                              </option>
                              <option value="middle-backrow">
                                Fundo · recepção e defesa
                              </option>
                              <option value="middle-no-pass">
                                Fundo · apenas defesa
                              </option>
                            </select>
                          </label>
                        )}
                      <select
                        aria-label={`Função ${player.name} linha ${rowIndex + 1}`}
                        value={row.role}
                        onChange={(e) =>
                          changeSet({
                            ...set,
                            rows: set.rows.map((r, i) =>
                              i === rowIndex
                                ? {
                                    ...r,
                                    role: e.target.value as Role,
                                    coverage: undefined,
                                  }
                                : r,
                            ),
                          })
                        }
                      >
                        {Object.entries(roleLabels).map(([r, label]) => (
                          <option key={r} value={r}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {results.map((r, columnIndex) => (
                      <td key={r.id}>
                        <input
                          aria-label={`${player.name} ${skill} ${r.label} linha ${rowIndex + 1}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={1000}
                          value={row.counts[keyFor(skill, r.id)] || ""}
                          placeholder="0"
                          onChange={(e) =>
                            changeSet({
                              ...set,
                              rows: set.rows.map((line, i) =>
                                i === rowIndex
                                  ? {
                                      ...line,
                                      counts: {
                                        ...line.counts,
                                        [keyFor(skill, r.id)]: Number(
                                          e.target.value,
                                        ),
                                      },
                                    }
                                  : line,
                              ),
                            })
                          }
                          onPaste={(e) => {
                            const text = e.clipboardData
                              .getData("text/plain")
                              .trim();
                            if (!/[\t\n]/.test(text)) return;
                            e.preventDefault();
                            const block = text
                              .split(/\r?\n/)
                              .map((line) => line.split("\t"));
                            if (
                              block.some(
                                (line, i) =>
                                  rowIndex + i >= set.rows.length ||
                                  columnIndex + line.length > results.length ||
                                  line.some(
                                    (cell) =>
                                      !/^\d*$/.test(cell.trim()) ||
                                      Number(cell) > 1000,
                                  ),
                              )
                            ) {
                              setMessage(
                                "Bloco inválido: use inteiros de 0 a 1000 dentro das linhas e colunas da tabela.",
                              );
                              return;
                            }
                            const rows = structuredClone(set.rows);
                            block.forEach((line, i) =>
                              line.forEach((cell, j) => {
                                rows[rowIndex + i].counts[
                                  keyFor(skill, results[columnIndex + j].id)
                                ] = Number(cell);
                              }),
                            );
                            changeSet({ ...set, rows });
                          }}
                        />
                      </td>
                    ))}
                    <td>
                      <b>
                        {results.reduce(
                          (n, r) => n + (row.counts[keyFor(skill, r.id)] ?? 0),
                          0,
                        )}
                      </b>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="postgame-toolbar">
          <label>
            Jogador para outra função
            <select
              value={extraPlayer}
              onChange={(e) => setExtraPlayer(e.target.value)}
            >
              {match.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            onClick={() => {
              const role = (Object.keys(roleLabels) as Role[]).find(
                (r) =>
                  !set.rows.some(
                    (row) => row.playerId === extraPlayer && row.role === r,
                  ),
              );
              if (!role) {
                setMessage("Todas as funções desse jogador já têm uma linha.");
                return;
              }
              changeSet({
                ...set,
                rows: [
                  ...set.rows,
                  { playerId: extraPlayer, role, counts: {} },
                ],
              });
            }}
          >
            Adicionar outra função
          </button>
          {(game.ratingVersion ?? 0) >= 2 && (
            <button
              className="button secondary"
              onClick={() => {
                if (
                  set.rows.some(
                    (r) =>
                      r.playerId === extraPlayer &&
                      r.role === "middle" &&
                      r.coverage === "middle-backrow",
                  )
                ) {
                  setMessage(
                    "Este jogador já possui uma linha de central no fundo.",
                  );
                  return;
                }
                changeSet({
                  ...set,
                  rows: [
                    ...set.rows,
                    {
                      playerId: extraPlayer,
                      role: "middle",
                      coverage: "middle-backrow",
                      counts: {},
                    },
                  ],
                });
              }}
            >
              Adicionar central no fundo
            </button>
          )}
        </div>
        <p className="muted">
          Pontos sem atribuição no set: nossos {coverage[0]} · deles{" "}
          {coverage[1]}. Esses pontos entram no placar, sem inventar ação ou
          penalidade individual.
        </p>
        {message && <p role="status">{message}</p>}
        <details>
          <summary>
            Conferência para salvar ({errors.length} pendências)
          </summary>
          {errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </details>
        <div className="postgame-toolbar">
          <button
            className="button"
            disabled={errors.length > 0}
            onClick={() => {
              try {
                const entry = archivePostGame(game, match);
                const old = match.history?.find((g) => g.id === game.id);
                if (old?.postGame)
                  entry.postGameRevisions = [
                    ...(old.postGameRevisions ?? []),
                    old.postGame,
                  ];
                if (
                  onChange({
                    ...match,
                    history: [
                      ...(match.history ?? []).filter((g) => g.id !== game.id),
                      entry,
                    ],
                  })
                )
                  setMessage(
                    "Pós-jogo salvo no histórico dos jogadores. A partida ao vivo foi mantida.",
                  );
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Salvar pós-jogo no histórico
          </button>
          <button
            className="button secondary"
            onClick={() =>
              download(
                "pos-jogo-totais.json",
                JSON.stringify(game, null, 2),
                "application/json",
              )
            }
          >
            Exportar ficha JSON
          </button>
          <button
            className="button secondary"
            onClick={() => {
              const quote = (value: unknown) =>
                '"' + String(value).replaceAll('"', '""') + '"';
              const lines = [
                [
                  "Set",
                  "Nosso placar",
                  "Placar deles",
                  "Jogador",
                  "Função",
                  "Fundamento",
                  "Resultado",
                  "Quantidade",
                  "Dificuldade",
                  "Situação",
                  "Critérios",
                ],
              ];
              game.sets.forEach((s, i) => {
                s.rows.forEach((r) =>
                  Object.entries(r.counts).forEach(([key, n]) => {
                    const [skill, result, difficulty, situation] =
                      key.split(":");
                    lines.push([
                      String(i + 1),
                      String(s.score[0]),
                      String(s.score[1]),
                      match.players.find((p) => p.id === r.playerId)!.name,
                      roleLabels[r.role],
                      skill,
                      result,
                      String(n),
                      difficulty ?? "Sem contexto",
                      situation ?? "",
                      criteriaText(cellAssessment(game, key)?.criteria),
                    ]);
                  }),
                );
                lines.push([
                  String(i + 1),
                  String(s.score[0]),
                  String(s.score[1]),
                  "Adversário",
                  "—",
                  "opponent",
                  "error",
                  String(s.opponentErrors),
                  "",
                  "",
                  "",
                ]);
              });
              download(
                "pos-jogo-totais.csv",
                "\uFEFF" +
                  lines.map((line) => line.map(quote).join(";")).join("\r\n"),
                "text/csv;charset=utf-8",
              );
            }}
          >
            Exportar tabela CSV
          </button>
        </div>
        <div className="postgame-toolbar">
          <label>
            Carregar ficha JSON
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const next = JSON.parse(await file.text());
                  if (postGameErrors(next, match).length) throw new Error();
                  if (
                    window.confirm(
                      "Carregar esta ficha? A partida ao vivo será mantida.",
                    )
                  ) {
                    save(next);
                    setSetIndex(0);
                    setReportSet(0);
                  }
                } catch {
                  setMessage(
                    "Ficha inválida. Os dados atuais foram preservados.",
                  );
                }
                e.target.value = "";
              }}
            />
          </label>
          <label>
            Reabrir pós-jogo salvo
            <select
              value=""
              onChange={(e) => {
                const existing = match.history?.find(
                  (g) => g.id === e.target.value,
                )?.postGame;
                if (
                  existing &&
                  window.confirm("Reabrir esta ficha para editar?")
                ) {
                  save(structuredClone(existing));
                  setSetIndex(0);
                  setReportSet(0);
                }
              }}
            >
              <option value="">Escolher partida</option>
              {match.history
                ?.filter((g) => g.postGame)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {new Date(g.date).toLocaleDateString("pt-BR")} ·{" "}
                    {g.opponent}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="button secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Criar outra ficha de totais? Salve ou exporte a atual antes.",
                )
              ) {
                save(newPostGame(match));
                setSetIndex(0);
                setReportSet(0);
              }
            }}
          >
            Nova ficha
          </button>
        </div>
      </section>
      <section className="card postgame-card">
        <h2>Relatório automático</h2>
        <ExecutionSummary events={report.events} />
        <label>
          Resumo
          <select
            value={reportSet}
            onChange={(e) => setReportSet(Number(e.target.value))}
          >
            <option value={0}>Jogo completo</option>
            {game.sets.map((_, i) => (
              <option key={i} value={i + 1}>
                Set {i + 1}
              </option>
            ))}
          </select>
        </label>
        <div className="public-overview">
          <article>
            <h3>Destaque</h3>
            <p>
              {report.highlight
                ? `${report.highlight.player.name} · ${grade(report.highlight.rating)}`
                : "—"}
            </p>
            {report.provisional && <small>Amostra baixa</small>}
          </article>
          <article>
            <h3>Nota do time</h3>
            <p>{grade(report.team.rating)}</p>
          </article>
          <article>
            <h3>Melhor fundamento</h3>
            <p>{report.team.best?.label ?? "—"}</p>
            <small>{report.team.reason(report.team.best)}</small>
          </article>
          <article>
            <h3>A melhorar</h3>
            <p>{report.team.worst?.label ?? "—"}</p>
            <small>{report.team.reason(report.team.worst)}</small>
          </article>
        </div>
        <div className="postgame-table-wrap">
          <table className="postgame-table">
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Nota</th>
                <th>Ações</th>
                <th>Pontos / erros</th>
                <th>Melhor</th>
                <th>A melhorar</th>
              </tr>
            </thead>
            <tbody>
              {report.players.map((p) => (
                <tr key={p.player.id}>
                  <td>
                    <span className="postgame-player">
                      <Photo player={p.player} />
                      {p.player.name}
                    </span>
                  </td>
                  <td>
                    <b>{grade(p.rating)}</b>
                  </td>
                  <td>{p.count}</td>
                  <td>
                    {p.points} / {p.errors}
                  </td>
                  <td>
                    {p.best?.label ?? "—"}
                    <small>{p.reason(p.best)}</small>
                  </td>
                  <td>
                    {p.worst?.label ?? "—"}
                    <small>{p.reason(p.worst)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
