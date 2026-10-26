import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Play, ChevronRight } from "lucide-react";
import { cloud } from "./cloud";
import { parseOpenGames, playerRecap, type OpenGame } from "./openPlayerData";
import { SkillIcon } from "./SkillIcon";
import { Photo } from "./PlayerPhoto";
import { CriteriaReport } from "./CriteriaReport";
import { MomentBrowser } from "./MomentBrowser";
import { MatchVideoPlayer } from "./MatchVideos";
import { SocialCardExport } from "./SocialCardExport";
import { distributionFromCube } from "./criteriaStats";
import "./styles/open-players.css";
const grade = (n: number | null) =>
  n === null ? "—" : n.toFixed(1).replace(".", ",");
const date = (g: OpenGame) =>
  g.snapshot.playedAt
    ? new Date(g.snapshot.playedAt).toLocaleDateString("pt-BR")
    : "Data não informada";
export default function PlayerPortal() {
  const [games, GG] = useState<OpenGame[]>([]),
    [busy, B] = useState(false),
    [error, E] = useState(""),
    [offset, O] = useState(0),
    [more, M] = useState(true),
    [id, I] = useState(""),
    [tab, T] = useState("Resumo"),
    [scope, S] = useState("recent"),
    [matchId, G] = useState(""),
    [clip, C] = useState(""),
    [retry, R] = useState(0);
  useEffect(() => {
    let live = true;
    B(true);
    E("");
    if (!cloud) {
      B(false);
      E(
        "A comissão precisa configurar a publicação para disponibilizar os jogadores.",
      );
      return;
    }
    void Promise.resolve(
      cloud.rpc("open_player_games", { page_offset: offset }),
    )
      .then(({ data, error }) => {
        if (!live) return;
        try {
          if (error)
            throw Error(
              "Não foi possível carregar o portal. A comissão deve ativar abrir-jogadores.sql no Supabase.",
            );
          const rows = parseOpenGames(data);
          GG((prev) =>
            offset === 0
              ? rows
              : [
                  ...prev,
                  ...rows.filter(
                    (g) =>
                      !prev.some(
                        (p) => p.snapshot.matchId === g.snapshot.matchId,
                      ),
                  ),
                ],
          );
          M(rows.length === 20);
        } catch (e) {
          E(String((e as Error).message));
        } finally {
          B(false);
        }
      })
      .catch(() => {
        if (live) {
          E("Sem conexão. Tente novamente.");
          B(false);
        }
      });
    return () => {
      live = false;
    };
  }, [offset, retry]);
  const roster = [
    ...new Map(
      [...games]
        .reverse()
        .flatMap((g) => g.snapshot.players.map((p) => [p.id, p] as const)),
    ).values(),
  ];
  const p = roster.find((p) => p.id === id);
  const all = games
    .filter((g) =>
      g.snapshot.players.some((p) => p.id === id && (p.stats.count ?? 0) > 0),
    )
    .sort((a, b) =>
      (a.snapshot.playedAt ?? "").localeCompare(b.snapshot.playedAt ?? ""),
    );
  const list =
    scope === "match"
      ? all.filter(
          (g) =>
            g.snapshot.matchId === (matchId || all.at(-1)?.snapshot.matchId),
        )
      : scope === "recent"
        ? all.slice(-3)
        : all;
  const recap = playerRecap(list, id);
  const latest = list.at(-1);
  const card = latest?.cards.find((c) => c.player.id === id);
  const photo = games.find((g) => g.media.photos[id])?.media.photos[id];
  const direction = distributionFromCube(
    list.flatMap(
      (g) => g.snapshot.technical?.players.find((p) => p.id === id)?.data ?? [],
    ),
    "attackDirection",
    "attack",
  );
  const reliable = recap.metrics.filter((m) => m.count >= 10),
    best = reliable[0],
    focus = reliable.at(-1);
  const passes = distributionFromCube(
    list.flatMap(
      (g) => g.snapshot.technical?.players.find((p) => p.id === id)?.data ?? [],
    ),
    "passQuality",
    "reception",
  );
  const libero = !!card?.player.libero;
  const positivePass = passes.known
    ? Math.round(
        (100 *
          passes.rows
            .filter((r) => ["A", "B"].includes(r.id))
            .reduce((s, r) => s + r.count, 0)) /
          passes.known,
      ) + "%"
    : "—";
  const attack = recap.metrics.find((m) => m.skill === "attack");
  return (
    <main className="open-portal portal">
      <header className="brand">
        <a href="/?view=public">
          <img src="/team-logo-transparent.png" alt="Só na Rede" />
        </a>
        <b>Só na Rede</b>
        <span>
          <Globe size={16} />
          Estatísticas abertas
        </span>
      </header>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button disabled={busy} onClick={() => R(retry + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {!p ? (
        <section className="entry">
          <h1>Acompanhe os jogadores</h1>
          <p>
            Escolha um atleta. Acompanhe os números, a evolução e as jogadas.
            Sem senha.
          </p>
          {busy && <p role="status">Carregando jogadores…</p>}
          {!busy && !roster.length && !error && (
            <p>Nenhuma partida publicada ainda.</p>
          )}
          <div className="athletes">
            {roster.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  I(p.id);
                  S("recent");
                  G("");
                  T("Resumo");
                  C("");
                }}
              >
                <span className="portal-player-number">
                  {String(p.number).padStart(2, "0")}
                </span>
                <strong>{p.name}</strong>
                <small>Ver desempenho completo</small>
              </button>
            ))}
          </div>
          <p className="notice">
            Estatísticas e detalhes técnicos disponíveis para qualquer pessoa.
          </p>
        </section>
      ) : (
        <>
          <button className="back" onClick={() => I("")}>
            <ArrowLeft size={16} />
            Todos os jogadores
          </button>
          <section className="athlete">
            <div className="portrait">
              <Photo player={{ ...p, photo, positions: [], libero: false }} />
            </div>
            <div className="identity">
              <h1>{p.name}</h1>
              <p>
                #{String(p.number).padStart(2, "0")} ·{" "}
                {card?.player.libero
                  ? "Líbero"
                  : card?.player.positions.join(" / ") || "Só na Rede"}
              </p>
              <span>{latest?.snapshot.team ?? "Só na Rede"}</span>
            </div>
            <div className="rating">
              <b>
                {grade(recap.rating)}
                <small>/10</small>
              </b>
              <span>Média das notas por partida</span>
              <small>
                {recap.rows.length} partidas · {recap.count} ações
              </small>
            </div>
          </section>
          <section className="scope">
            <label>
              Ver desempenho
              <select
                value={scope}
                onChange={(e) => {
                  S(e.target.value);
                  C("");
                }}
              >
                <option value="recent">Recentes · últimas 3</option>
                <option value="all">Geral · partidas carregadas</option>
                <option value="match">Partida específica</option>
              </select>
            </label>
            {scope === "match" && (
              <label>
                Partida
                <select
                  value={matchId || all.at(-1)?.snapshot.matchId || ""}
                  onChange={(e) => {
                    G(e.target.value);
                    C("");
                  }}
                >
                  {[...all].reverse().map((g) => (
                    <option key={g.snapshot.matchId} value={g.snapshot.matchId}>
                      {date(g)} · {g.snapshot.opponent}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p>
              Notas de partidas com ações registradas.
              <br />
              {more
                ? "Há partidas anteriores para carregar."
                : "Todas as publicações disponíveis carregadas."}
            </p>
          </section>
          <nav aria-label="Seções do perfil">
            {["Resumo", "Fundamentos", "Partidas"].map((t) => (
              <button key={t} aria-pressed={tab === t} onClick={() => T(t)}>
                {t}
              </button>
            ))}
          </nav>
          {!list.length ? (
            <p>
              Este jogador ainda não tem ações registradas no recorte
              selecionado.
            </p>
          ) : (
            <>
              {tab === "Resumo" && (
                <div className="summary">
                  <section>
                    <h2>O jogo em números</h2>
                    <div className="numbers">
                      <div>
                        <b>
                          {libero
                            ? (recap.metrics.find((m) => m.skill === "defense")
                                ?.count ?? 0)
                            : recap.points}
                        </b>
                        <span>{libero ? "Defesas registradas" : "Pontos"}</span>
                      </div>
                      <div>
                        <b>
                          {libero
                            ? positivePass
                            : attack?.count
                              ? Math.round(
                                  (100 * (attack.count - attack.errors)) /
                                    attack.count,
                                ) + "%"
                              : "—"}
                        </b>
                        <span>
                          {libero ? "Recepção positiva" : "Precisão de ataque"}
                        </span>
                        <small>
                          {libero
                            ? "A + B / recepções classificadas"
                            : "Ataques sem erro / total"}
                        </small>
                      </div>
                      <div>
                        <b>{recap.count}</b>
                        <span>Ações registradas</span>
                      </div>
                    </div>
                    <section className="evolution">
                      <h2>Evolução por partida</h2>
                      {recap.rows.length < 2 ? (
                        <p>
                          São necessárias duas partidas avaliadas para comparar
                          a evolução.
                        </p>
                      ) : (
                        <>
                          <svg
                            viewBox="0 0 580 230"
                            role="img"
                            aria-label="Evolução das notas; valores completos na tabela abaixo"
                          >
                            {[0, 5, 10].map((v) => (
                              <g key={v}>
                                <line
                                  x1="38"
                                  x2="556"
                                  y1={190 - v * 16}
                                  y2={190 - v * 16}
                                />
                                <text x="12" y={195 - v * 16}>
                                  {v}
                                </text>
                              </g>
                            ))}
                            {recap.rows.map((r, i) => {
                              const prev = recap.rows[i - 1];
                              return prev?.stats.rating != null &&
                                r.stats.rating != null ? (
                                <line
                                  className="trend"
                                  key={r.game.snapshot.matchId}
                                  x1={
                                    50 +
                                    ((i - 1) * 490) / (recap.rows.length - 1)
                                  }
                                  y1={190 - prev.stats.rating * 16}
                                  x2={50 + (i * 490) / (recap.rows.length - 1)}
                                  y2={190 - r.stats.rating * 16}
                                />
                              ) : null;
                            })}
                            <text x="38" y="220">
                              {date(recap.rows[0].game)}
                            </text>
                            <text x="556" textAnchor="end" y="220">
                              {date(recap.rows.at(-1)!.game)}
                            </text>
                            <polyline
                              className="average"
                              points={recap.rows
                                .flatMap((r, i) => {
                                  const rated = recap.rows
                                    .slice(Math.max(0, i - 2), i + 1)
                                    .filter((x) => x.stats.rating !== null);
                                  return rated.length
                                    ? [
                                        `${50 + (i * 490) / (recap.rows.length - 1)},${190 - (rated.reduce((s, x) => s + x.stats.rating!, 0) / rated.length) * 16}`,
                                      ]
                                    : [];
                                })
                                .join(" ")}
                            />
                            {recap.rows.map(
                              (r, i) =>
                                r.stats.rating !== null && (
                                  <circle
                                    key={r.game.snapshot.matchId}
                                    className={
                                      (r.stats.count ?? 0) < 15 ? "low" : ""
                                    }
                                    cx={
                                      50 + (i * 490) / (recap.rows.length - 1)
                                    }
                                    cy={190 - r.stats.rating * 16}
                                    r="6"
                                  />
                                ),
                            )}
                          </svg>
                          <p className="muted">
                            Pontos: notas dos jogos. Tracejado: média móvel de
                            até 3 partidas. Círculo vazado: menos de 15 ações.
                          </p>
                        </>
                      )}
                      <details>
                        <summary>Ver notas e amostras</summary>
                        {recap.rows.map((r) => (
                          <div
                            className="table-row"
                            key={r.game.snapshot.matchId}
                          >
                            <span>
                              {date(r.game)} · {r.game.snapshot.opponent}
                            </span>
                            <b>{grade(r.stats.rating)}</b>
                            <span>
                              {r.stats.count} ações
                              {(r.stats.count ?? 0) < 15
                                ? " · baixa amostra"
                                : ""}
                            </span>
                          </div>
                        ))}
                      </details>
                    </section>
                    <div className="insights">
                      <section>
                        <h3>Ponto forte</h3>
                        <p>
                          {best
                            ? `${best.label}: maior qualidade média entre fundamentos com ao menos 10 ações (${best.count} registros).`
                            : "Ainda faltam ações para apontar um fundamento consistente."}
                        </p>
                      </section>
                      <section>
                        <h3>Foco para o próximo jogo</h3>
                        <p>
                          {focus && focus !== best
                            ? `Revise ${focus.label.toLowerCase()}: menor qualidade média entre os fundamentos com pelo menos 10 ações. Os lances ajudam a entender o contexto.`
                            : "Registre mais fundamentos para comparar oportunidades de melhoria."}
                        </p>
                      </section>
                    </div>
                  </section>
                  <aside>
                    <h2>Fundamentos em destaque</h2>
                    <p className="muted">
                      Qualidade média, acompanhada do volume.
                    </p>
                    {recap.metrics.slice(0, 4).map((m) => (
                      <button
                        className="foundation"
                        key={m.skill}
                        onClick={() => T("Fundamentos")}
                      >
                        <SkillIcon skill={m.skill} size={28} />
                        <div>
                          <span>
                            {m.label}
                            <b>{Math.round(m.quality * 100)}%</b>
                          </span>
                          <div className="track">
                            <i style={{ width: `${m.quality * 100}%` }} />
                          </div>
                          <small>{m.count} ações</small>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                    {latest && (
                      <section className="latest">
                        <h3>Última partida do recorte</h3>
                        <strong>
                          {latest.snapshot.team}{" "}
                          {latest.snapshot.sets.join(" × ")}{" "}
                          {latest.snapshot.opponent}
                        </strong>
                        <p>{date(latest)}</p>
                        <button
                          onClick={() => {
                            T("Partidas");
                            C(latest.snapshot.matchId);
                          }}
                        >
                          <Play size={17} />
                          Ver partida e lances
                        </button>
                      </section>
                    )}
                  </aside>
                </div>
              )}
              {tab === "Fundamentos" && (
                <section>
                  <h2>Entenda cada fundamento</h2>
                  {recap.metrics.map((m) => (
                    <section className="foundation-detail" key={m.skill}>
                      <h3>
                        <SkillIcon skill={m.skill} size={26} /> {m.label}
                      </h3>
                      <p>
                        {m.count} ações · {Math.round(m.quality * 100)}% de
                        qualidade média
                      </p>
                      <div
                        className="stack"
                        aria-label={`${m.successes} positivas, ${Math.max(0, m.count - m.successes - m.errors)} outras, ${m.errors} erros`}
                      >
                        <i style={{ flex: m.successes }} />
                        <i
                          style={{
                            flex: Math.max(0, m.count - m.successes - m.errors),
                          }}
                        />
                        <i style={{ flex: m.errors }} />
                      </div>
                      <div className="legend">
                        <span>
                          <i />
                          {m.successes} positivas
                        </span>
                        <span>
                          <i />
                          {Math.max(0, m.count - m.successes - m.errors)} outras
                          / neutras
                        </span>
                        <span>
                          <i />
                          {m.errors} erros
                        </span>
                      </div>
                    </section>
                  ))}
                  <section className="latest">
                    <h3>Direção mais usada no ataque</h3>
                    <p>
                      {direction.known
                        ? direction.leaders
                            .map((r) => `${r.label} (${r.count})`)
                            .join(" · ")
                        : "Sem direção registrada. A comissão pode marcar a direção nas próximas ações."}
                    </p>
                    <small>
                      {direction.known} de {attack?.count ?? 0} ataques com
                      direção marcada. Empates são exibidos juntos.
                    </small>
                  </section>
                  <CriteriaReport
                    title="Detalhes técnicos"
                    players={roster}
                    events={undefined}
                    aggregateData={{
                      version: 1,
                      team: [],
                      players: [
                        {
                          id,
                          data: list.flatMap(
                            (g) =>
                              g.snapshot.technical?.players.find(
                                (p) => p.id === id,
                              )?.data ?? [],
                          ),
                        },
                      ],
                    }}
                    fixedPlayer={id}
                  />
                </section>
              )}
              {tab === "Partidas" && (
                <section>
                  <h2>Partidas e jogadas</h2>
                  {[...list].reverse().map((g) => {
                    const s = g.snapshot,
                      stats = s.players.find((p) => p.id === id)!.stats,
                      c = g.cards.find((c) => c.player.id === id);
                    return (
                      <article className="match" key={s.matchId}>
                        <div>
                          <span>
                            {date(g)}
                            {!s.finished ? " · Parcial" : ""}
                          </span>
                          <h3>
                            {s.team} <b>{s.sets.join(" × ")}</b> {s.opponent}
                          </h3>
                          <small>{stats.count ?? 0} ações</small>
                        </div>
                        <div className="match-grade">
                          <b>{grade(stats.rating)}</b>
                          <span>Nota</span>
                        </div>
                        <button
                          aria-expanded={clip === s.matchId}
                          onClick={() => C(clip === s.matchId ? "" : s.matchId)}
                        >
                          <Play size={17} />
                          {clip === s.matchId ? "Fechar" : "Ver lances"}
                        </button>
                        {clip === s.matchId && (
                          <section className="clips">
                            <MomentBrowser
                              moments={g.moments}
                              fixedPlayer={id}
                              players={s.players.map((p) => ({
                                ...p,
                                positions: [],
                                libero: false,
                              }))}
                            />
                            {!!s.videos?.length && (
                              <MatchVideoPlayer videos={s.videos} />
                            )}
                            <button
                              onClick={() => {
                                G(s.matchId);
                                S("match");
                                T("Resumo");
                              }}
                            >
                              Analisar só esta partida
                            </button>
                            {c ? (
                              <SocialCardExport
                                data={{
                                  ...c,
                                  player: {
                                    ...c.player,
                                    photo: g.media.photos[id],
                                  },
                                }}
                              />
                            ) : (
                              <p className="muted">
                                A comissão precisa republicar esta partida para
                                disponibilizar o card.
                              </p>
                            )}
                          </section>
                        )}
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </>
      )}
      {more && (
        <button disabled={busy || !!error} onClick={() => O(offset + 20)}>
          {busy ? "Carregando…" : "Carregar partidas anteriores"}
        </button>
      )}
      <footer>
        Estatísticas públicas · apenas partidas publicadas pela comissão.{" "}
        <a href="/?view=public#reels">Ver Reels</a>
      </footer>
    </main>
  );
}
