import { useEffect, useState } from "react";
import { cloud } from "./cloud";
import { CardSelect } from "./CardSelect";
import { CriteriaReport } from "./CriteriaReport";
import { MomentBrowser } from "./MomentBrowser";
import type { PublicSnapshot } from "./publicSnapshot";
import type { PublicCriteriaData } from "./criteriaStats";
import { validVideoMoments, type VideoMoment } from "./videoMoments";
import { safePublicSnapshot } from "./playerPrivacy";
import { newMatch } from "./model";
import { MatchVideoPlayer } from "./MatchVideos";

type Roster = { id: string; name: string; number: number };
type Game = {
  public: PublicSnapshot;
  own: PublicSnapshot["teamStats"] | null;
  technical: PublicCriteriaData;
  moments: VideoMoment[];
};
type Dashboard = { playerId: string; games: Game[] };
const grade = (n: number | null | undefined) =>
  n == null ? "—" : n.toFixed(1);

export default function PlayerPortal() {
  const [roster, setRoster] = useState<Roster[]>(newMatch().players);
  const [player, setPlayer] = useState("");
  const [pin, setPin] = useState("");
  const [token, setToken] = useState(""); // Never persist personal details or session in localStorage.
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [gameIndex, setGameIndex] = useState("0");
  const [person, setPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    if (!cloud) {
      setError(
        "Acesso ainda não ativado. A comissão precisa configurar o servidor dos jogadores.",
      );
      return;
    }
    void cloud.rpc("player_roster").then(({ data, error }) => {
      if (!alive) return;
      if (error || !Array.isArray(data) || !data.length)
        setError(
          "Acesso ainda não ativado. Solicite a configuração à comissão.",
        );
      else {
        setRoster(data);
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);
  async function load(session: string) {
    const { data, error } = await cloud!.rpc("player_dashboard", {
      token: session,
    });
    if (error)
      throw new Error("Sessão indisponível ou expirada. Entre novamente.");
    setDashboard(data as Dashboard);
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!cloud || busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await cloud.rpc("player_login", { player, pin });
      setPin("");
      if (error) throw new Error("Não foi possível entrar. Confira a conexão.");
      if (!data?.token)
        throw new Error(
          data?.error === "locked"
            ? "Muitas tentativas. Aguarde 15 minutos."
            : "Jogador ou senha incorretos.",
        );
      await load(data.token);
      setToken(data.token);
      setPerson(data.playerId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    const previous = token;
    setToken("");
    setDashboard(undefined);
    setPin("");
    setError("");
    setPerson("");
    if (cloud && previous)
      await cloud.rpc("player_logout", { token: previous });
  }
  // Clear private data after the server's maximum session lifetime, including background tabs.
  useEffect(() => {
    if (!token) return;
    const expires = Date.now() + 8 * 60 * 60 * 1000;
    const clear = () => {
      if (Date.now() >= expires) void logout();
    };
    const timer = setInterval(clear, 30000);
    window.addEventListener("focus", clear);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", clear);
    };
  }, [token]);
  const game = dashboard?.games[Number(gameIndex)];
  const snapshot = game ? safePublicSnapshot(game.public) : undefined;
  const selected = snapshot?.players.find((p) => p.id === person);
  const self = person === dashboard?.playerId;
  const own = self ? game?.own : null;
  return (
    <main className="pub player-portal">
      <header className="pub-header">
        <a className="pub-brand" href="/?view=public">
          <img src="/team-logo-transparent.png" alt="Só na Rede" />
          <div>
            <strong>SÓ NA REDE</strong>
            <span>ÁREA DOS JOGADORES</span>
          </div>
        </a>
        {dashboard && (
          <button
            className="ui-btn ui-btn--secondary"
            onClick={() => void logout()}
          >
            Sair
          </button>
        )}
      </header>
      <div className="pub-intro">
        <div>
          <span className="ui-eyebrow">Seu jogo, sua evolução</span>
          <h1>
            {dashboard
              ? `Olá, ${roster.find((p) => p.id === dashboard.playerId)?.name ?? "jogador"}`
              : "Quem é você?"}
          </h1>
          <p>
            {dashboard
              ? "Seus detalhes ficam só com você e a comissão. Acompanhe os destaques dos companheiros."
              : "Escolha seu nome para acessar suas estatísticas e os vídeos do time."}
          </p>
        </div>
      </div>
      {error && (
        <p className="ui-note" role="alert">
          {error}
        </p>
      )}
      {!dashboard ? (
        <form onSubmit={login} className="ui-card player-login">
          <div
            className="player-roster"
            role="group"
            aria-label="Escolha seu jogador"
          >
            {roster.map((p) => (
              <button
                className={`ui-btn ${player === p.id ? "ui-btn--primary" : "ui-btn--secondary"}`}
                aria-pressed={player === p.id}
                type="button"
                key={p.id}
                onClick={() => {
                  setPlayer(p.id);
                  setPin("");
                }}
              >
                <span>#{String(p.number).padStart(2, "0")}</span>
                <strong>{p.name}</strong>
              </button>
            ))}
          </div>
          {player && (
            <div className="player-pin">
              <label htmlFor="player-pin">
                Senha de {roster.find((p) => p.id === player)?.name}
              </label>
              <input
                id="player-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                minLength={4}
                maxLength={4}
                autoComplete="current-password"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="4 números"
                required
              />
              <button
                className="ui-btn ui-btn--primary"
                disabled={!ready || busy || pin.length !== 4}
              >
                {busy ? "Entrando…" : "Entrar"}
              </button>
            </div>
          )}
        </form>
      ) : (
        <>
          <section className="ui-card pub-section">
            <h2>Partidas publicadas</h2>
            <p className="ui-note">
              Até 50 partidas recentes. Os vídeos dependem dos lances marcados
              pela comissão.
            </p>
            {!dashboard.games.length ? (
              <p>A comissão ainda não publicou partidas.</p>
            ) : (
              <label>
                Partida
                <CardSelect
                  value={gameIndex}
                  onChange={(e) => setGameIndex(e.target.value)}
                >
                  {dashboard.games.map((g, i) => (
                    <option key={g.public.matchId} value={i}>
                      {g.public.team} × {g.public.opponent} ·{" "}
                      {g.public.playedAt
                        ? new Date(g.public.playedAt).toLocaleDateString(
                            "pt-BR",
                          )
                        : "Partida atual"}
                    </option>
                  ))}
                </CardSelect>
              </label>
            )}
          </section>
          {snapshot && (
            <>
              <section className="ui-card pub-section">
                <label>
                  Perfil
                  <CardSelect
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                  >
                    {snapshot.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.id === dashboard.playerId ? " · Você" : ""}
                      </option>
                    ))}
                  </CardSelect>
                </label>
                <h2>
                  {selected?.name ?? "Selecione um jogador"}{" "}
                  <span className="ui-rating">
                    {grade(selected?.stats.rating)}
                  </span>
                </h2>
                <p>
                  {self
                    ? "Seu perfil completo"
                    : "Perfil público do companheiro"}
                </p>
                <p>
                  Melhor fundamento:{" "}
                  <strong>
                    {selected?.stats.best?.label ?? "Ainda sem avaliação"}
                  </strong>
                </p>
                {own && (
                  <>
                    <p>
                      {own.count ?? 0} ações · {own.points ?? 0} pontos ·{" "}
                      {own.errors ?? 0} erros
                    </p>
                    <div className="player-metrics">
                      {own.metrics.map((m) => (
                        <article className="ui-card" key={m.skill}>
                          <h3>{m.label}</h3>
                          <strong>
                            {(m.quality * 100).toFixed(0)}% de qualidade
                          </strong>
                          <p>
                            {m.count} ações · {m.successes} acertos · {m.errors}{" "}
                            erros
                          </p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
              {self && game?.technical && (
                <CriteriaReport
                  key={`${snapshot.matchId}:${person}`}
                  title="Seus detalhes técnicos"
                  players={snapshot.players}
                  aggregateData={game.technical}
                  fixedPlayer={dashboard.playerId}
                />
              )}
              <section className="ui-card pub-section">
                <h2>Lances de {selected?.name}</h2>
                <MomentBrowser
                  key={`${snapshot.matchId}:${person}`}
                  moments={
                    validVideoMoments(game?.moments) ? game!.moments : []
                  }
                  fixedPlayer={person}
                  players={snapshot.players.map((p) => ({
                    ...p,
                    positions: [],
                    libero: false,
                  }))}
                />
              </section>
              {!!snapshot.videos?.length && (
                <section className="ui-card pub-section">
                  <h2>Vídeos da partida</h2>
                  <MatchVideoPlayer videos={snapshot.videos} />
                </section>
              )}
            </>
          )}
        </>
      )}
      <p>
        <a href="/?view=public">Ver página pública do time</a>
      </p>
    </main>
  );
}
