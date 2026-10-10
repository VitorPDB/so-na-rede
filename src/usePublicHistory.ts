import { useEffect, useRef, useState } from "react";
import { cloud } from "./cloud";
import type { PublicMedia } from "./publicSnapshot";
import type { PublicRow } from "./usePublicLive";

export interface PastMatch {
  match_id: string;
  updated_at: string;
  played_at?: string;
  team: string;
  opponent: string;
  sets: [number, number];
}
export interface PastPublication extends PublicRow {
  media: PublicMedia | null;
}
const listKey = "so-na-rede:public-history";
const gameKey = "so-na-rede:public-history-game";
function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Reading the public archive does not require persistent storage. */
  }
}
export function usePublicHistory(
  enabled: boolean,
  matchId: string | null,
  demo: boolean,
) {
  const [items, setItems] = useState<PastMatch[]>([]);
  const [game, setGame] = useState<PastPublication | null>(null);
  const [message, setMessage] = useState("");
  const [gameMessage, setGameMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    async function load() {
      setBusy(true);
      setMessage("");
      try {
        if (demo) {
          const { publicDemoHistory } = await import("./publicDemo");
          const rows = publicDemoHistory();
          if (active) {
            setItems(
              rows.map((r) => ({
                match_id: r.snapshot.matchId,
                updated_at: r.updated_at,
                played_at: r.updated_at,
                team: r.snapshot.team,
                opponent: r.snapshot.opponent,
                sets: r.snapshot.sets,
              })),
            );
            setMore(false);
          }
          return;
        }
        if (!navigator.onLine)
          throw new Error("Sem conexão. Lista salva neste dispositivo.");
        if (!cloud)
          throw new Error(
            "Configure o Supabase para publicar e consultar partidas antigas.",
          );
        const { data, error } = await cloud
          .from("public_matches")
          .select(
            "match_id,played_at,updated_at,team:snapshot->>team,opponent:snapshot->>opponent,sets:snapshot->sets",
          )
          .order("played_at", { ascending: false })
          .order("match_id")
          .range(offset, offset + 19);
        if (error)
          throw new Error(
            "Não foi possível buscar o histórico. Confira se o SQL atualizado foi aplicado.",
          );
        if (!active) return;
        const rows = data as unknown as PastMatch[];
        setItems((previous) => {
          const combined = offset ? [...previous, ...rows] : rows;
          const unique = Array.from(
            new Map(combined.map((r) => [r.match_id, r])).values(),
          );
          save(listKey, unique.slice(0, 60));
          return unique;
        });
        setMore(rows.length === 20);
      } catch (error) {
        if (active) {
          if (!offset) {
            const stored = read<PastMatch[]>(listKey);
            setItems(Array.isArray(stored) ? stored : []);
          }
          setMessage((error as Error).message);
          setMore(false);
        }
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [enabled, demo, offset, refresh]);

  useEffect(() => {
    const current = ++generation.current;
    setGame(null);
    setGameMessage(matchId ? "Buscando estatísticas da partida…" : "");
    if (!matchId) return;
    async function load() {
      try {
        let result: PastPublication;
        if (demo) {
          const { publicDemoHistory } = await import("./publicDemo");
          const row = publicDemoHistory().find(
            (r) => r.snapshot.matchId === matchId,
          );
          if (!row) throw new Error("Partida não encontrada.");
          result = { ...row, media: null };
        } else {
          if (!navigator.onLine)
            throw new Error(
              "Sem conexão. Exibindo a última versão salva desta partida.",
            );
          if (!cloud)
            throw new Error("O histórico público ainda não foi configurado.");
          const { data, error } = await cloud
            .from("public_matches")
            .select("*")
            .eq("match_id", matchId)
            .maybeSingle();
          if (error) throw new Error("Não foi possível carregar esta partida.");
          if (!data)
            throw new Error(
              "Esta partida não está publicada ou foi reaberta pela comissão.",
            );
          result = { ...data, media_revision: 0 } as PastPublication;
        }
        if (generation.current !== current) return;
        setGame(result);
        setGameMessage("");
        if (!demo) save(gameKey, result);
      } catch (error) {
        if (generation.current !== current) return;
        // A removed/reopened game must not be resurrected by its old cache online.
        const stored = !navigator.onLine
          ? read<PastPublication>(gameKey)
          : null;
        if (stored?.snapshot?.matchId === matchId && stored.snapshot.finished)
          setGame(stored);
        setGameMessage((error as Error).message);
      }
    }
    void load();
    return () => {
      generation.current++;
    };
  }, [matchId, demo, refresh]);
  return {
    items,
    game,
    message,
    gameMessage,
    busy,
    more,
    loadMore: () => setOffset((n) => n + 20),
    refresh: () => {
      setOffset(0);
      setRefresh((n) => n + 1);
    },
  };
}
