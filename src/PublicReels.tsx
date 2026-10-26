import { useEffect, useRef, useState } from "react";
import type { Player } from "./model";
import { cloud } from "./cloud";
import { MomentBrowser } from "./MomentBrowser";
import { validVideoMoments, type VideoMoment } from "./videoMoments";
export function PublicReels({
  matchId,
  players,
}: {
  matchId: string;
  players: Player[];
}) {
  const host = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(
    location.hash === "#reels" ||
      new URLSearchParams(location.search).has("moment"),
  );
  const [moments, setMoments] = useState<VideoMoment[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const enable = () => {
      if (location.hash === "#reels") setEnabled(true);
    };
    window.addEventListener("hashchange", enable);
    if (!("IntersectionObserver" in window)) {
      setEnabled(true);
      return () => window.removeEventListener("hashchange", enable);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (host.current) observer.observe(host.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", enable);
    };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    if (!cloud) {
      setError("Reels disponíveis após configurar a publicação online.");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    void cloud
      .rpc("public_reels", { game_id: matchId })
      .then(({ data, error }) => {
        if (!active) return;
        setLoading(false);
        if (error)
          setError(
            "Não foi possível carregar os Reels. Tente novamente; a comissão pode precisar ativar a atualização.",
          );
        else if (validVideoMoments(data)) setMoments(data);
        else setError("Lances indisponíveis nesta publicação.");
      });
    return () => {
      active = false;
    };
  }, [enabled, matchId, retry]);
  return (
    <section id="reels" ref={host} className="ui-card pub-section public-reels">
      <h2>Reels do time</h2>
      <p>As jogadas que valem o replay.</p>
      {loading ? (
        <p role="status">Carregando jogadas…</p>
      ) : error ? (
        <p role="status">
          {error}{" "}
          <button className="ui-btn" onClick={() => setRetry(retry + 1)}>
            Tentar novamente
          </button>
        </p>
      ) : enabled ? (
        <MomentBrowser
          key={matchId}
          moments={moments}
          players={players}
          publicMatchId={matchId}
          thumbnails
        />
      ) : (
        <button className="ui-btn" onClick={() => setEnabled(true)}>
          Carregar Reels
        </button>
      )}
    </section>
  );
}
