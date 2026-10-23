import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cloud } from "./cloud";
import type { Match } from "./model";
import { download, parseMatch } from "./storage";
import { keepMatchCopy, matchCopies, type ShelfCopy } from "./matchShelf";

type Link = {
  owner: string;
  id: string;
  device: string;
  revision: number;
  digest: string;
};
type Game = {
  id: string;
  team: string;
  opponent: string;
  revision: number;
  updatedAt: string;
};
type Reply = {
  revision: number;
  device: string;
  updatedAt: string;
  body?: unknown;
};
const key = (id: string) => `so-na-rede:sync:${id}`;
export function readSyncLink(id: string): Link | null {
  try {
    const l = JSON.parse(localStorage.getItem(key(id)) ?? "null");
    return l &&
      l.id === id &&
      typeof l.owner === "string" &&
      typeof l.device === "string" &&
      Number.isSafeInteger(l.revision) &&
      typeof l.digest === "string"
      ? l
      : null;
  } catch {
    return null;
  }
}
export async function matchDigest(raw: string) {
  const result = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(result), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function deviceId() {
  const key = "so-na-rede:sync-device";
  const saved = sessionStorage.getItem(key);
  if (saved) return saved;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}
async function rpc(action: string, args: Record<string, unknown> = {}) {
  if (!cloud)
    throw new Error("Configure o Supabase para continuar em outros aparelhos.");
  const { data, error } = await cloud.rpc("scout_match_sync", {
    action,
    ...args,
  });
  if (error) throw new Error(error.message);
  return data;
}
export function syncMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/device_conflict|revision_conflict|request_conflict/.test(message))
    return "Outro aparelho assumiu ou alterou esta partida. Sua cópia local está preservada. Abra a versão da conta ou salve uma cópia independente.";
  if (/not_authorized/.test(message))
    return "Entre na conta autorizada da comissão para sincronizar.";
  if (/scout_match_sync|schema cache/.test(message))
    return "A continuidade ainda não está ativada no banco. Execute match-sync.sql no Supabase.";
  if (/invalid_match/.test(message))
    return "Partida fora dos limites de sincronização (até 25 MB). Exporte o JSON para proteger os dados.";
  if (/cópia|espaço|salvar|abrir/.test(message)) return message;
  return "Envio pendente. Confira a conexão e tente novamente; a partida continua salva neste aparelho.";
}
export function useMatchContinuity(
  match: Match,
  session: Session | null,
  authorized: boolean,
  onOpen: (match: Match) => boolean,
  stopPublic: () => void,
) {
  const [link, setLink] = useState<Link | null>(() => readSyncLink(match.id));
  const [status, setStatus] = useState("Somente neste aparelho");
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [copies, setCopies] = useState<ShelfCopy[]>([]);
  const lock = useRef(false);
  const transition = useRef(false);
  const current = useRef({
    match,
    session,
    authorized,
    onOpen,
    stopPublic,
    link,
  });
  current.current = { match, session, authorized, onOpen, stopPublic, link };
  const epoch = useRef(0);
  const pending = useRef<{
    raw: string;
    digest: string;
    request: string;
  } | null>(null);
  const dirty = useRef(false);
  const priorMatch = useRef(match);
  if (priorMatch.current !== match) {
    dirty.current = true;
    priorMatch.current = match;
  }
  useEffect(() => {
    epoch.current++;
    pending.current = null;
    setLink(readSyncLink(match.id));
    setBlocked(false);
    setGames([]);
    setStatus(
      "Partida local preservada. Conecte ou confira a última sincronização.",
    );
  }, [match.id, session?.user.id]);
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (current.current.link && (dirty.current || pending.current)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  const persist = (next: Link) => {
    localStorage.setItem(key(next.id), JSON.stringify(next));
    current.current.link = next;
    setLink(next);
  };
  const fail = (e: unknown) => {
    if (/device_conflict|revision_conflict|request_conflict/.test(String(e))) {
      setBlocked(true);
      current.current.stopPublic();
    }
    setStatus(syncMessage(e));
  };
  async function flush() {
    const c = current.current;
    if (
      lock.current ||
      blocked ||
      !c.link ||
      !c.session ||
      !c.authorized ||
      c.link.owner !== c.session.user.id ||
      c.link.id !== c.match.id
    )
      return;
    if (!navigator.onLine) {
      setStatus("Offline · alterações só neste aparelho até reconectar");
      return;
    }
    lock.current = true;
    setBusy(true);
    const generation = epoch.current;
    try {
      const raw = JSON.stringify(c.match),
        hash = await matchDigest(raw);
      if (!pending.current && hash === c.link.digest) {
        const remote: Reply = await rpc("status", { game_id: c.match.id });
        if (
          remote.device !== c.link.device ||
          remote.revision !== c.link.revision
        )
          throw new Error("device_conflict");
        if (generation === epoch.current) {
          dirty.current = current.current.match !== c.match;
          setStatus(
            `Sincronizado · ${new Date(remote.updatedAt).toLocaleString("pt-BR")}`,
          );
        }
        return;
      }
      pending.current ??= { raw, digest: hash, request: crypto.randomUUID() };
      const request = pending.current;
      setStatus("Enviando partida completa…");
      const remote: Reply = await rpc("save", {
        game_id: c.match.id,
        body: JSON.parse(request.raw),
        expected_revision: c.link.revision,
        device: c.link.device,
        request_id: request.request,
      });
      if (generation !== epoch.current) return;
      persist({ ...c.link, revision: remote.revision, digest: request.digest });
      pending.current = null;
      dirty.current = JSON.stringify(current.current.match) !== request.raw;
      setStatus(
        dirty.current
          ? "Últimas ações aguardando envio…"
          : `Sincronizado · ${new Date(remote.updatedAt).toLocaleString("pt-BR")}`,
      );
    } catch (e) {
      if (generation === epoch.current) fail(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const timer = setInterval(() => void flush(), 3000);
    const retry = () => void flush();
    window.addEventListener("online", retry);
    void flush();
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retry);
    };
  }, [link?.id, link?.owner, session?.user.id, authorized, blocked]);
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    transition.current = true;
    setBusy(true);
    try {
      await work();
    } catch (e) {
      fail(e);
    } finally {
      lock.current = false;
      transition.current = false;
      setBusy(false);
    }
  }
  const refresh = () =>
    run(async () => {
      const owner = current.current.session?.user.id;
      const rows = await rpc("list");
      if (owner === current.current.session?.user.id) setGames(rows);
      setCopies(await matchCopies());
    });
  const connect = () =>
    run(async () => {
      const c = current.current;
      if (!c.session || !c.authorized) return;
      // Never silently attach an existing remote game or someone else's local binding.
      if (c.link) throw new Error("revision_conflict");
      const raw = JSON.stringify(c.match);
      parseMatch(raw);
      const device = deviceId();
      const reply: Reply = await rpc("save", {
        game_id: c.match.id,
        body: JSON.parse(raw),
        expected_revision: 0,
        device,
        request_id: crypto.randomUUID(),
      });
      if (
        current.current.session?.user.id !== c.session.user.id ||
        current.current.match.id !== c.match.id
      )
        return;
      persist({
        owner: c.session.user.id,
        id: c.match.id,
        device,
        revision: reply.revision,
        digest: await matchDigest(raw),
      });
      dirty.current = current.current.match !== c.match;
      setStatus(
        "Partida salva na conta. As próximas alterações serão sincronizadas.",
      );
      setGames(await rpc("list"));
    });
  const open = (id: string) =>
    run(async () => {
      const c = current.current;
      if (!c.session || !c.authorized) return;
      if (
        !window.confirm(
          "Continuar com a versão salva na conta? Este aparelho assumirá a edição. A partida local atual será guardada em Cópias deste aparelho; ações ainda não enviadas não serão mescladas.",
        )
      )
        return;
      const remote: Reply = await rpc("read", { game_id: id });
      const next = parseMatch(JSON.stringify(remote.body));
      await keepMatchCopy(c.match);
      const device = deviceId();
      const claimed: Reply = await rpc("claim", {
        game_id: id,
        expected_revision: remote.revision,
        device,
        request_id: crypto.randomUUID(),
      });
      if (current.current.session?.user.id !== c.session.user.id) return;
      c.stopPublic();
      if (!c.onOpen(next))
        throw new Error(
          "Não foi possível salvar a partida recebida. Sua cópia anterior está protegida.",
        );
      persist({
        owner: c.session.user.id,
        id,
        device,
        revision: claimed.revision,
        digest: await matchDigest(JSON.stringify(next)),
      });
      pending.current = null;
      dirty.current = false;
      setBlocked(false);
      setStatus("Partida recebida. Este aparelho assumiu a edição.");
      setCopies(await matchCopies());
    });
  const fork = () =>
    run(async () => {
      const c = current.current;
      await keepMatchCopy(c.match);
      c.stopPublic();
      const next = { ...c.match, id: crypto.randomUUID() };
      if (!c.onOpen(next))
        throw new Error("Não foi possível salvar a cópia independente.");
      pending.current = null;
      setLink(null);
      setBlocked(false);
      setStatus(
        "Cópia independente criada. Toque em Salvar na minha conta para sincronizá-la.",
      );
    });
  return {
    status,
    blocked,
    busy,
    games,
    copies,
    link,
    refresh,
    connect,
    open,
    fork,
    flush,
    canEdit: () => !transition.current && !blocked,
    linked: !!link && link.id === match.id,
    own: link?.owner === session?.user.id,
    loadCopies: () => run(async () => setCopies(await matchCopies())),
  };
}
export function MatchContinuity({
  sync,
  session,
  authorized,
}: {
  sync: ReturnType<typeof useMatchContinuity>;
  session: Session | null;
  authorized: boolean;
}) {
  return (
    <section
      className="ui-card st-card match-continuity"
      aria-label="Continuar partidas"
      id="continuar-partidas"
    >
      <h2>Suas partidas em outros aparelhos</h2>
      <p>
        Entre na mesma conta da comissão em cada aparelho. Somente alterações
        sincronizadas aparecem no outro dispositivo.
      </p>
      <p role="status">{sync.status}</p>
      {!session ? (
        <p>
          Entre no formulário da comissão abaixo para acessar suas partidas.
        </p>
      ) : !authorized ? (
        <p>Esta conta precisa de autorização da comissão.</p>
      ) : (
        <>
          {sync.linked && !sync.own && (
            <p role="alert">
              Esta cópia foi vinculada a outra conta. Entre na conta original ou
              crie uma cópia independente.
            </p>
          )}
          <div className="video-review-actions">
            {!sync.linked && (
              <button
                className="ui-btn ui-btn--primary"
                disabled={sync.busy}
                onClick={sync.connect}
              >
                Salvar partida na minha conta
              </button>
            )}
            <button
              className="ui-btn"
              disabled={sync.busy}
              onClick={sync.refresh}
            >
              Ver partidas da minha conta
            </button>
            {sync.linked && sync.own && !sync.blocked && (
              <button
                className="ui-btn"
                disabled={sync.busy}
                onClick={sync.flush}
              >
                Sincronizar agora
              </button>
            )}
            {sync.linked && (
              <button
                className="ui-btn"
                disabled={sync.busy}
                onClick={sync.fork}
              >
                Criar cópia independente
              </button>
            )}
          </div>
          <ul className="sync-games">
            {sync.games.map((g) => (
              <li key={g.id}>
                <div>
                  <strong>
                    {g.team} × {g.opponent}
                  </strong>
                  <small>
                    Salva em {new Date(g.updatedAt).toLocaleString("pt-BR")}
                  </small>
                </div>
                <button
                  className="ui-btn"
                  disabled={sync.busy}
                  onClick={() => sync.open(g.id)}
                >
                  Continuar neste aparelho
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <details>
        <summary onClick={() => void sync.loadCopies()}>
          Cópias deste aparelho
        </summary>
        <p>
          Antes de trocar de partida, guardamos a versão local completa. Baixe o
          JSON e use Restaurar backup para recuperá-la.
        </p>
        {sync.copies.map((c) => (
          <p key={c.id}>
            <button
              className="ui-btn"
              onClick={() =>
                download(`partida-${c.id}.json`, c.raw, "application/json")
              }
            >
              Baixar {c.label} · {new Date(c.savedAt).toLocaleString("pt-BR")}
            </button>
          </p>
        ))}
      </details>
    </section>
  );
}
