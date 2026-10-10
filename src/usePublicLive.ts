import { useEffect, useRef, useState } from "react";
import { cloud, cloudIssue, teamSlug } from "./cloud";
import type { PublicMedia, PublicSnapshot } from "./publicSnapshot";

export type PublicRow = {
  revision: number;
  media_revision: number;
  updated_at: string;
  snapshot: PublicSnapshot;
};
export type PublicStatus =
  "setup" | "loading" | "waiting" | "live" | "offline" | "error" | "cached";
const cacheKey = "so-na-rede:public-last";
function cached(): { row: PublicRow | null; media: PublicMedia | null } {
  try {
    const value = JSON.parse(localStorage.getItem(cacheKey) ?? "null");
    const s = value?.row?.snapshot;
    if (
      s?.version === 1 &&
      Array.isArray(s.players) &&
      Array.isArray(s.rallies) &&
      Array.isArray(s.rotations) &&
      Array.isArray(s.timeouts) &&
      Array.isArray(s.score) &&
      s.teamStats
    )
      return { row: value.row, media: value.media ?? null };
  } catch {
    /* A cache is optional and never changes the commission's data. */
  }
  return { row: null, media: null };
}
export function usePublicLive() {
  const [initial] = useState(cached);
  const [row, setRow] = useState(initial.row);
  const [media, setMedia] = useState(initial.media);
  const [status, setStatus] = useState<PublicStatus>(
    !cloud ? "setup" : initial.row ? "cached" : "loading",
  );
  const [message, setMessage] = useState(
    cloudIssue ||
      (!cloud
        ? "A transmissão ainda não foi configurada."
        : "Buscando a última publicação…"),
  );
  const [now, setNow] = useState(Date.now());
  const refresh = useRef<() => void>(() => {});
  const lastMatchId = useRef(initial.row?.snapshot.matchId);
  useEffect(() => {
    if (!cloud) return;
    let active = true,
      loading = false,
      again = false,
      mediaRevision = -1,
      receivedRevision = -1;
    async function load() {
      if (loading) {
        again = true;
        return;
      }
      if (!navigator.onLine) {
        setStatus("offline");
        setMessage("Sem conexão. Exibindo a última publicação recebida.");
        return;
      }
      loading = true;
      try {
        const live = await cloud!
          .from("live_public")
          .select("revision,media_revision,updated_at,snapshot")
          .eq("slug", teamSlug)
          .maybeSingle();
        if (!active) return;
        if (live.error) {
          setStatus("error");
          setMessage(
            "Não foi possível atualizar. Mantendo os dados recebidos.",
          );
          return;
        }
        if (!live.data) {
          setRow(null);
          setMedia(null);
          setStatus("waiting");
          setMessage("Aguardando a comissão iniciar a transmissão.");
          try {
            localStorage.removeItem(cacheKey);
          } catch {}
          return;
        }
        if (live.data.snapshot?.version !== 1) {
          setStatus("error");
          setMessage("Atualize a página para visualizar esta versão.");
          return;
        }
        const next = live.data as PublicRow;
        if (next.revision < receivedRevision) return;
        receivedRevision = next.revision;
        if (next.snapshot.matchId !== lastMatchId.current) {
          setMedia(null);
          mediaRevision = -1;
          lastMatchId.current = next.snapshot.matchId;
        }
        setRow(next);
        if (next.media_revision !== mediaRevision) {
          const assets = await cloud!
            .from("live_media")
            .select("media")
            .eq("slug", teamSlug)
            .maybeSingle();
          if (active && !assets.error) {
            setMedia(assets.data?.media ?? null);
            mediaRevision = next.media_revision;
          }
        }
        if (active) {
          setStatus("live");
          setMessage("Conectado à transmissão");
          setNow(Date.now());
        }
      } catch {
        if (active) {
          setStatus(navigator.onLine ? "error" : "offline");
          setMessage("Conexão indisponível. Mantendo a última publicação.");
        }
      } finally {
        loading = false;
        if (again && active) {
          again = false;
          void load();
        }
      }
    }
    refresh.current = () => void load();
    void load();
    const channel = cloud
      .channel("public-score")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_public",
          filter: `slug=eq.${teamSlug}`,
        },
        () => void load(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });
    const fallback = setInterval(() => void load(), 30000);
    const clock = setInterval(() => setNow(Date.now()), 10000);
    const resume = () => {
      if (document.visibilityState === "visible") void load();
    };
    const offline = () => {
      setStatus("offline");
      setMessage("Sem conexão. Exibindo a última publicação recebida.");
    };
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      refresh.current = () => {};
      clearInterval(fallback);
      clearInterval(clock);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", resume);
      void cloud!.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    if (!row) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ row, media }));
    } catch {
      /* Reading still works when browser storage is full. */
    }
  }, [row, media]);
  return { row, media, status, message, now, refresh: () => refresh.current() };
}
