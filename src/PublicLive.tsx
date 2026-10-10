import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock3,
  RefreshCw,
  Shield,
  Trophy,
  Users,
  Volleyball,
  WifiOff,
} from "lucide-react";
import { Photo } from "./PlayerPhoto";
import { cloud } from "./cloud";
import { usePublicLive, type PublicRow } from "./usePublicLive";
import { usePublicHistory } from "./usePublicHistory";

const grade = (n: number | null) => (n === null ? "—" : n.toFixed(1));
export function PublicLive() {
  const live = usePublicLive();
  const [demo, setDemo] = useState<PublicRow | null>(null);
  const [setFilter, setSetFilter] = useState(0);
  const [demoMode] = useState(
    () => new URLSearchParams(location.search).get("demo") === "1",
  );
  const [matchId, setMatchId] = useState<string | null>(() =>
    new URLSearchParams(location.search).get("match"),
  );
  const [archiveOpen, setArchiveOpen] = useState(
    () =>
      Boolean(new URLSearchParams(location.search).get("match")) ||
      new URLSearchParams(location.search).get("history") === "1",
  );
  const history = usePublicHistory(archiveOpen, matchId, demoMode);
  const navigate = (archive: boolean, id: string | null = null) => {
    setArchiveOpen(archive);
    setMatchId(id);
    const url = new URL(location.href);
    url.searchParams.set("view", "public");
    url.searchParams.delete("match");
    url.searchParams.delete("history");
    if (id) url.searchParams.set("match", id);
    else if (archive) url.searchParams.set("history", "1");
    window.history.pushState(null, "", url);
  };
  useEffect(() => {
    const onBack = () => {
      const params = new URLSearchParams(location.search);
      setMatchId(params.get("match"));
      setArchiveOpen(params.has("match") || params.get("history") === "1");
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("demo") === "1")
      void import("./publicDemo").then((module) =>
        setDemo(module.publicDemo()),
      );
  }, []);
  const row = matchId ? history.game : (demo ?? live.row);
  const s = row?.snapshot;
  const media = matchId ? history.game?.media : demo ? null : live.media;
  const period = setFilter
    ? s?.periods?.find((p) => p.set === setFilter)
    : undefined;
  const periodAvailable = !setFilter || Boolean(period);
  const players =
    s?.players.map((p) => ({
      ...p,
      stats: period?.players.find((q) => q.id === p.id)?.stats ?? p.stats,
    })) ?? [];
  const teamStats = period?.teamStats ?? s?.teamStats;
  const featured = players.find(
    (p) => p.id === (period ? period.highlight : s?.highlight),
  );
  const attention = players.find(
    (p) => p.id === (period ? period.attention : s?.attention),
  );
  const provisional = period?.provisional ?? s?.provisional;
  const rallies =
    s?.rallies.filter((r) => !setFilter || r.set === setFilter) ?? [];
  const rotations = period?.rotations ?? s?.rotations ?? [];
  const timeouts =
    s?.timeouts.filter((t) => !setFilter || t.set === setFilter) ?? [];
  const stale = Boolean(
    row && live.now - Date.parse(row.updated_at) > 90000 && !s?.finished,
  );
  const pending =
    !matchId &&
    !demo &&
    ["cached", "error", "offline", "setup"].includes(live.status);
  const scope =
    setFilter && periodAvailable ? `Set ${setFilter}` : "Partida completa";
  const won = rallies.filter((r) => r.winner === "ours").length;
  const status = matchId
    ? s
      ? "Partida arquivada"
      : "Consultando partida"
    : archiveOpen
      ? "Histórico de partidas"
      : demo
        ? "Demonstração"
        : s?.finished
          ? "Encerrado"
          : pending
            ? "Última publicação"
            : stale
              ? "Sem atualização recente"
              : live.status === "live"
                ? "Ao vivo"
                : live.status === "setup"
                  ? "Não configurado"
                  : live.status === "loading"
                    ? "Conectando"
                    : "Aguardando partida";
  useEffect(() => {
    setSetFilter(0);
  }, [s?.matchId]);
  return (
    <main className="pub">
      <header className="pub-header">
        <a className="pub-brand" href="/?view=public">
          <img src="/team-logo-transparent.png" alt="Escudo Só na Rede" />
          <div>
            <strong>SÓ NA REDE</strong>
            <span>DENTRO DO JOGO</span>
          </div>
        </a>
        <a className="ui-btn ui-btn--ghost" href="/?view=commission">
          <Shield size={17} aria-hidden="true" />
          Comissão técnica
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </header>
      <nav
        className="ui-segmented pub-navigation"
        aria-label="Navegação pública"
      >
        <button aria-pressed={!archiveOpen} onClick={() => navigate(false)}>
          <Activity size={18} aria-hidden="true" /> Ao vivo
        </button>
        <button aria-pressed={archiveOpen} onClick={() => navigate(true)}>
          <Clock3 size={18} aria-hidden="true" /> Partidas anteriores
        </button>
      </nav>
      {demo && (
        <div className="pub-demo" role="status">
          <BarChart3 size={18} aria-hidden="true" />
          <span>
            <b>Dados fictícios para testar a página.</b> Esta demonstração não
            transmite nem altera sua partida.
          </span>
          <a className="ui-btn ui-btn--secondary" href="/?view=public">
            Sair da demonstração
          </a>
        </div>
      )}
      <div className="pub-intro">
        <div>
          <span className="ui-eyebrow">Acompanhe o time</span>
          <h1>{archiveOpen ? "Memória do time" : "Dentro da partida"}</h1>
          <p>
            {archiveOpen
              ? "Reviva os jogos e consulte os números de cada set."
              : "Placar, destaques e estatísticas em um só lugar."}
          </p>
        </div>
        <span
          className={`pub-status ${pending || stale ? "is-pending" : ""}`}
          role="status"
        >
          <Activity size={16} aria-hidden="true" />
          {status}
        </span>
      </div>
      {archiveOpen && !matchId && (
        <section
          className="ui-card pub-section"
          aria-label="Histórico de partidas"
        >
          <header>
            <h2>Partidas encerradas</h2>
            <button
              className="ui-btn ui-btn--ghost"
              onClick={history.refresh}
              disabled={history.busy}
            >
              <RefreshCw size={18} aria-hidden="true" />
              Atualizar histórico
            </button>
          </header>
          {history.message && (
            <p className="ui-note" role="status">
              {history.message}
            </p>
          )}
          <div className="pub-history-list">
            {history.items.map((game) => (
              <button
                className="pub-history-game"
                key={game.match_id}
                onClick={() => navigate(true, game.match_id)}
              >
                <span>
                  <small>
                    {new Date(
                      game.played_at ?? game.updated_at,
                    ).toLocaleDateString("pt-BR")}
                  </small>
                  <strong>
                    {game.team} × {game.opponent}
                  </strong>
                  <small>Ver notas, fundamentos e análise por set</small>
                </span>
                <b>
                  {game.sets[0]}–{game.sets[1]}
                  <small>sets</small>
                </b>
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            ))}
          </div>
          {!history.items.length && (
            <p className="ui-note">
              {history.busy
                ? "Buscando partidas…"
                : "Nenhuma partida encerrada publicada ainda."}
            </p>
          )}
          {history.more && (
            <button
              className="ui-btn ui-btn--secondary"
              onClick={history.loadMore}
              disabled={history.busy}
            >
              {history.busy ? "Carregando…" : "Carregar mais partidas"}
            </button>
          )}
          {!cloud && !demoMode && (
            <a
              className="ui-btn ui-btn--secondary"
              href="/?view=public&demo=1&history=1"
            >
              Testar histórico de demonstração
            </a>
          )}
        </section>
      )}
      {matchId && (
        <div className="pub-toolbar">
          <button
            className="ui-btn ui-btn--secondary"
            onClick={() => navigate(true)}
          >
            ← Todas as partidas
          </button>
          {s && history.gameMessage && (
            <p className="ui-note" role="status">
              {history.gameMessage}
            </p>
          )}
        </div>
      )}
      {archiveOpen && !matchId ? null : !s ? (
        <section className="ui-card pub-empty">
          <Volleyball size={42} aria-hidden="true" />
          <h2>
            {matchId
              ? "Estatísticas da partida"
              : live.status === "loading"
                ? "Buscando a partida"
                : "O próximo jogo começa aqui"}
          </h2>
          <p>{matchId ? history.gameMessage : live.message}</p>
          {!matchId && (
            <p>
              Quando a comissão publicar, o placar e os números aparecerão
              automaticamente.
            </p>
          )}
          <div className="pub-empty-actions">
            {cloud && (
              <button
                className="ui-btn ui-btn--secondary"
                onClick={matchId ? history.refresh : live.refresh}
              >
                <RefreshCw size={17} aria-hidden="true" />
                Tentar novamente
              </button>
            )}
            {!matchId && (
              <a
                className="ui-btn ui-btn--secondary"
                href="/?view=public&demo=1"
              >
                Ver demonstração
              </a>
            )}
          </div>
        </section>
      ) : (
        <>
          <section className="ui-card pub-score" aria-label="Placar da partida">
            <div className="pub-team">
              <img src="/team-logo-transparent.png" alt="" />
              <strong>{s.team}</strong>
              <span>
                {s.server === "ours" && !s.finished ? (
                  <>
                    <Volleyball size={14} aria-hidden="true" /> Sacando
                  </>
                ) : s.finished ? (
                  "Mandante"
                ) : (
                  "Recebendo"
                )}
              </span>
            </div>
            <div className="pub-score-center">
              <span className="ui-eyebrow">
                {s.finished
                  ? "Resultado final"
                  : `Set ${s.set}${s.setFinished ? " · intervalo" : ""}`}
              </span>
              <div className="pub-digits">
                <b>{String(s.score[0]).padStart(2, "0")}</b>
                <span>:</span>
                <b>{String(s.score[1]).padStart(2, "0")}</b>
              </div>
              <span>
                Sets{" "}
                <b>
                  {s.sets[0]}–{s.sets[1]}
                </b>
                <i>·</i>Rotação <b>P{s.p || "—"}</b>
              </span>
            </div>
            <div className="pub-team">
              {media?.opponentLogo ? (
                <img src={media.opponentLogo} alt="" />
              ) : (
                <span className="pub-opponent">
                  <Shield size={28} aria-hidden="true" />
                </span>
              )}
              <strong>{s.opponent}</strong>
              <span>
                {s.server === "theirs" && !s.finished ? (
                  <>
                    <Volleyball size={14} aria-hidden="true" /> Sacando
                  </>
                ) : s.finished ? (
                  "Visitante"
                ) : (
                  "Recebendo"
                )}
              </span>
            </div>
            <footer className="pub-score-footer">
              <span>
                {pending ? (
                  <WifiOff size={15} aria-hidden="true" />
                ) : (
                  <Clock3 size={15} aria-hidden="true" />
                )}
                {matchId
                  ? `Publicação de ${new Date(row!.updated_at).toLocaleString("pt-BR")}`
                  : demo
                    ? "Exemplo de visualização"
                    : `Publicado às ${new Date(row!.updated_at).toLocaleTimeString("pt-BR")}`}
                {stale && !demo ? " · a partida pode estar em pausa" : ""}
              </span>
              {!demo && cloud && (
                <button
                  className="ui-btn ui-btn--ghost"
                  onClick={matchId ? history.refresh : live.refresh}
                  aria-label="Atualizar estatísticas"
                >
                  <RefreshCw size={17} aria-hidden="true" />
                  Atualizar
                </button>
              )}
            </footer>
          </section>
          {pending && !demo && (
            <p className="ui-note pub-notice" role="status">
              {live.message} Os dados exibidos podem estar desatualizados.
            </p>
          )}
          <div className="pub-toolbar">
            <div>
              <h2>Leitura do jogo</h2>
              <p>
                {scope} · {rallies.length} rallies registrados
              </p>
            </div>
            <label>
              <span className="ui-eyebrow">Período</span>
              <select
                className="ui-select"
                aria-label="Período das estatísticas"
                value={setFilter}
                onChange={(e) => setSetFilter(Number(e.target.value))}
              >
                <option value={0}>Partida completa</option>
                {Array.from({ length: s.set }, (_, i) => (
                  <option key={i} value={i + 1}>
                    Set {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!periodAvailable && (
            <p className="ui-note">
              Esta publicação antiga permite filtrar o histórico de pontos. As
              notas e rotações continuam referentes à partida completa.
            </p>
          )}
          <div className="pub-highlights">
            <section className="ui-card pub-highlight">
              <span className="ui-eyebrow">
                <Trophy size={15} aria-hidden="true" />
                Destaque do time
              </span>
              <h3>{featured?.name ?? "Aguardando ações"}</h3>
              <p>
                {featured ? (
                  <>
                    Nota <b>{grade(featured.stats.rating)}</b> ·{" "}
                    {featured.stats.points} pontos
                    {provisional ? " · amostra baixa" : ""}
                  </>
                ) : (
                  "As notas aparecem após o primeiro registro."
                )}
              </p>
            </section>
            <section className="ui-card pub-highlight">
              <span className="ui-eyebrow">
                <Activity size={15} aria-hidden="true" />
                Para evoluir
              </span>
              <h3>{teamStats?.worst?.label ?? "Aguardando variedade"}</h3>
              <p>
                {teamStats?.worst?.reason ??
                  "Mais fundamentos permitem uma análise melhor."}
              </p>
            </section>
            <section className="ui-card pub-highlight">
              <span className="ui-eyebrow">
                <BarChart3 size={15} aria-hidden="true" />
                Ponto forte
              </span>
              <h3>{teamStats?.best?.label ?? "Aguardando ações"}</h3>
              <p>
                {teamStats?.best?.reason ??
                  "Os fundamentos são atualizados a cada publicação."}
              </p>
            </section>
            <section className="ui-card pub-highlight">
              <span className="ui-eyebrow">Nota do time</span>
              <h3>
                {grade(teamStats?.rating ?? null)}
                <small>/10</small>
              </h3>
              <p>
                {teamStats?.count ?? 0} ações avaliadas ·{" "}
                {rallies.length
                  ? Math.round((won / rallies.length) * 100) +
                    "% dos rallies ganhos"
                  : "sem rallies"}
              </p>
            </section>
          </div>
          <section className="ui-card pub-section">
            <header>
              <div>
                <span className="ui-eyebrow">
                  <Users size={15} aria-hidden="true" />
                  Elenco
                </span>
                <h2>Jogadores · {scope.toLowerCase()}</h2>
              </div>
              <span className="pub-count">
                {players.filter((p) => p.stats.count).length} com ações
              </span>
            </header>
            <div className="pub-players">
              {[...players]
                .sort((a, b) => (b.stats.rating ?? -1) - (a.stats.rating ?? -1))
                .map((p) => (
                  <article key={p.id} className="pub-player">
                    <div className="pub-player-top">
                      <Photo
                        player={{
                          id: p.id,
                          name: p.name,
                          number: p.number,
                          positions: [],
                          libero: false,
                          photo: media?.photos[p.id],
                        }}
                      />
                      <div>
                        <h3>{p.name}</h3>
                        <span>
                          #{String(p.number).padStart(2, "0")} ·{" "}
                          {p.zone ? `Em quadra · Z${p.zone}` : "Banco"}
                        </span>
                      </div>
                      <span
                        className={`ui-rating ${p.stats.rating === null ? "" : p.stats.rating >= 7 ? "good" : p.stats.rating < 5 ? "bad" : "medium"}`}
                        aria-label={`Nota ${grade(p.stats.rating)}`}
                      >
                        {grade(p.stats.rating)}
                      </span>
                    </div>
                    <div className="pub-player-numbers">
                      <span>
                        <b>{p.stats.points}</b> pontos
                      </span>
                      <span>
                        <b>{p.stats.count}</b> ações
                      </span>
                      <span>
                        <b>{p.stats.errors}</b> erros
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>Melhor</dt>
                        <dd>
                          {p.stats.best?.label ?? "—"}
                          <small>
                            {p.stats.best?.reason ?? "Sem dados suficientes"}
                          </small>
                        </dd>
                      </div>
                      <div>
                        <dt>A melhorar</dt>
                        <dd>
                          {p.stats.worst?.label ?? "—"}
                          <small>
                            {p.stats.worst?.reason ?? "Sem dados suficientes"}
                          </small>
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
            </div>
            {attention && attention.id !== featured?.id && (
              <p className="ui-note pub-attention">
                Menor nota entre amostras comparáveis:{" "}
                <b>
                  {attention.name} · {grade(attention.stats.rating)}
                </b>
                {provisional ? " · avaliação provisória" : ""}.
              </p>
            )}
          </section>
          <section className="ui-card pub-section">
            <header>
              <div>
                <span className="ui-eyebrow">
                  <BarChart3 size={15} aria-hidden="true" />
                  Ponto a ponto
                </span>
                <h2>Andamento da partida</h2>
              </div>
              <div className="pub-legend">
                <span className="ours">{s.team}</span>
                <span className="theirs">{s.opponent}</span>
              </div>
            </header>
            <div className="pub-point-history">
              {rallies.map((r) => (
                <span
                  key={`${r.set}-${r.rally}`}
                  className={r.winner === "ours" ? "won" : "lost"}
                  title={`Set ${r.set}, rally ${r.rally}, ponto de ${r.winner === "ours" ? s.team : s.opponent}`}
                >
                  <small>
                    S{r.set} · #{r.rally}
                  </small>
                  <b>
                    {r.score[0]}–{r.score[1]}
                  </b>
                  <small>{r.winner === "ours" ? "Nosso" : "Deles"}</small>
                </span>
              ))}
              {!rallies.length && (
                <p className="ui-note">
                  Aguardando o primeiro ponto deste período.
                </p>
              )}
            </div>
          </section>
          <section className="ui-card pub-section">
            <header>
              <div>
                <span className="ui-eyebrow">Rotação 5–1</span>
                <h2>Desempenho por rotação</h2>
              </div>
              <span className="pub-count">{scope}</span>
            </header>
            <div className="pub-rotations">
              {rotations.map((r) => (
                <article key={r.p}>
                  <h3>P{r.p}</h3>
                  <div className="ui-meter" aria-hidden="true">
                    <i
                      style={{
                        width: `${r.won + r.lost ? (r.won / (r.won + r.lost)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p>
                    <b>{r.won}</b> ganhos · {r.lost} perdidos
                  </p>
                  <small>
                    Side-out:{" "}
                    {r.receiving
                      ? Math.round((r.sideouts / r.receiving) * 100) + "%"
                      : "—"}{" "}
                    ({r.sideouts}/{r.receiving})
                  </small>
                </article>
              ))}
            </div>
          </section>
          <section className="ui-card pub-section">
            <header>
              <div>
                <span className="ui-eyebrow">
                  <Clock3 size={15} aria-hidden="true" />
                  Pausas da partida
                </span>
                <h2>Pedidos de tempo</h2>
              </div>
            </header>
            <div className="pub-timeouts">
              {timeouts.length ? (
                timeouts.map((t, i) => (
                  <article key={i}>
                    <Clock3 size={19} aria-hidden="true" />
                    <div>
                      <strong>{t.side === "ours" ? s.team : s.opponent}</strong>
                      <p>
                        Set {t.set} · rally {t.rally} · placar {t.score[0]}–
                        {t.score[1]}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <p className="ui-note">
                  Nenhum tempo registrado neste período.
                </p>
              )}
            </div>
          </section>
        </>
      )}
      <footer className="pub-footer">
        <span>Só na Rede · estatísticas da comissão técnica</span>
        <span>
          {demo
            ? "Visualização de exemplo"
            : "Atualização automática · somente leitura"}
        </span>
      </footer>
    </main>
  );
}
