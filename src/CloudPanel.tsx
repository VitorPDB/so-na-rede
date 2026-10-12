import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Match } from "./model";
import { cloud, cloudIssue, publicLink, teamSlug } from "./cloud";
import { publicMedia, publicSnapshot } from "./publicSnapshot";
import { validPublicSnapshot, validPublicMedia } from "./publicValidation";

const publicationKey = "so-na-rede:publication";
type Publication = { enabled: boolean; revision: number; matchId: string };
function loadPublication(): Publication | null {
  try {
    const p = JSON.parse(localStorage.getItem(publicationKey) ?? "null");
    return p &&
      typeof p.enabled === "boolean" &&
      Number.isInteger(p.revision) &&
      typeof p.matchId === "string"
      ? p
      : null;
  } catch {
    return null;
  }
}
export function usePublication(match: Match) {
  const [session, setSession] = useState<Session | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [publication, setPublication] = useState(loadPublication);
  const [status, setStatus] = useState("Transmissão desligada");
  const latest = useRef(match),
    busy = useRef(false),
    sent = useRef(""),
    mediaSent = useRef("");
  latest.current = match;
  useEffect(() => {
    if (!cloud) return;
    let active = true;
    cloud.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = cloud.auth.onAuthStateChange((_event, value) =>
      setSession(value),
    );
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setAuthorized(false);
    if (cloud && session)
      void cloud.rpc("can_publish").then(({ data, error }) => {
        if (!active) return;
        setAuthorized(!error && data === true);
        if (error || data !== true)
          setStatus("Conta sem permissão ou SQL de segurança pendente.");
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  function persist(p: Publication | null) {
    try {
      localStorage.setItem(publicationKey, JSON.stringify(p));
      setPublication(p);
    } catch {
      setStatus(
        "Não foi possível salvar a transmissão. Libere espaço no tablet.",
      );
    }
  }
  useEffect(() => {
    if (!publication?.enabled || !cloud) return;
    if (publication.matchId !== match.id) {
      setStatus("Nova partida: toque em Publicar para iniciar.");
      return;
    }
    if (!session || !authorized) {
      setStatus("Entre para reenviar as atualizações pendentes.");
      return;
    }
    let alive = true;
    let revision = publication.revision;
    let conflicted = false;
    let pending: {
      snapshot: ReturnType<typeof publicSnapshot>;
      media: ReturnType<typeof publicMedia> | null;
      serial: string;
      mediaSerial: string;
      requestId: string;
    } | null = null;
    async function flush() {
      if (!alive || busy.current || conflicted) return;
      if (!navigator.onLine) {
        setStatus("Offline · atualizações salvas no tablet");
        return;
      }
      const source = latest.current;
      if (source.id !== publication!.matchId) return;
      if (!pending) {
        const snapshot = publicSnapshot(source),
          serial = JSON.stringify(snapshot);
        const media = publicMedia(source),
          mediaSerial = JSON.stringify(media);
        if (serial === sent.current && mediaSerial === mediaSent.current)
          return;
        pending = {
          snapshot,
          serial,
          mediaSerial,
          media: mediaSerial === mediaSent.current ? null : media,
          requestId: crypto.randomUUID(),
        };
      }
      const request = pending;
      if (
        !validPublicSnapshot(request.snapshot) ||
        (request.media !== null && !validPublicMedia(request.media))
      ) {
        conflicted = true;
        setStatus(
          "Dados fora dos limites de publicação. A partida local permanece salva.",
        );
        return;
      }
      busy.current = true;
      setStatus("Enviando atualização…");
      try {
        const { data, error } = await cloud!.rpc("publish_live", {
          expected_revision: revision,
          snapshot: request.snapshot,
          media: request.media,
          request_id: request.requestId,
        });
        if (error) {
          if (error.message.includes("revision_conflict")) {
            conflicted = true;
            setStatus(
              "Outra aba ou pessoa publicou. Pause e publique novamente para assumir.",
            );
          } else if (error.message.includes("not_authorized")) {
            conflicted = true;
            setStatus("Esta conta não está autorizada a publicar.");
          } else if (error.message.includes("rate_limited")) {
            setStatus(
              "Limite de envios atingido. Tentaremos novamente em instantes; ações salvas no tablet.",
            );
          } else
            setStatus(
              "Envio pendente · confira a conexão e o acesso da comissão",
            );
          return;
        }
        revision = Number(data);
        sent.current = request.serial;
        mediaSent.current = request.mediaSerial;
        pending = null;
        // Persist the server revision even if the panel was closed during the request.
        const saved = loadPublication();
        if (saved?.enabled && saved.matchId === source.id) {
          localStorage.setItem(
            publicationKey,
            JSON.stringify({ ...saved, revision }),
          );
        }
        if (alive)
          setStatus("Publicado · " + new Date().toLocaleTimeString("pt-BR"));
      } catch {
        if (alive) setStatus("Envio pendente · tentaremos novamente");
      } finally {
        busy.current = false;
      }
    }
    const timer = setInterval(flush, 1500);
    window.addEventListener("online", flush);
    void flush();
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("online", flush);
    };
  }, [
    publication?.enabled,
    publication?.matchId,
    session?.user.id,
    authorized,
    match.id,
  ]);
  async function start() {
    if (!cloud || !session || !authorized || busy.current) return;
    const { data, error } = await cloud
      .from("live_public")
      .select("revision")
      .eq("slug", teamSlug)
      .maybeSingle();
    if (error) {
      setStatus("Não foi possível iniciar. Confira a configuração do banco.");
      return;
    }
    sent.current = "";
    mediaSent.current = "";
    persist({
      enabled: true,
      revision: data?.revision ?? 0,
      matchId: match.id,
    });
    setStatus("Preparando transmissão…");
  }
  return {
    session,
    authorized,
    status,
    enabled: Boolean(publication?.enabled && publication.matchId === match.id),
    start,
    stop: () => {
      persist(null);
      setStatus("Pausado · público mantém o último placar publicado");
    },
  };
}
export function CloudPanel({
  publication,
}: {
  publication: ReturnType<typeof usePublication>;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="ui-card st-card cloud-panel">
      <header className="ui-card-head">
        <div>
          <h2>Estatísticas públicas ao vivo</h2>
          <p>Publique placar e números para o público acompanhar.</p>
        </div>
        <span
          className={
            "st-status " +
            (!cloud ? "is-off" : publication.enabled ? "is-on" : "")
          }
        >
          {!cloud
            ? "Não configurado"
            : publication.enabled
              ? "Transmitindo"
              : publication.authorized
                ? "Pronto"
                : "Desconectado"}
        </span>
      </header>
      {!cloud ? (
        <div className="st-form">
          <p className="ui-note">
            {cloudIssue ||
              "Crie o projeto Supabase e execute o SQL de configuração. Na Vercel, configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY e publique novamente. Também é possível preencher public/live-config.json no projeto. A marcação local continua funcionando."}
          </p>
          <a
            className="ui-btn ui-btn--secondary"
            href="/live-config.json"
            download
          >
            Baixar arquivo de configuração
          </a>
          <a
            className="ui-btn ui-btn--secondary"
            href="/live-setup.sql"
            download
          >
            Baixar SQL do Supabase
          </a>
          <a className="ui-btn ui-btn--ghost" href="/ativar-online.md" download>
            Guia de ativação
          </a>
          <a className="ui-btn ui-btn--ghost" href="/VERCEL.md" download>
            Passo a passo da Vercel
          </a>
          <a
            className="ui-btn ui-btn--ghost"
            href="/?view=public&demo=1"
            target="_blank"
            rel="noopener noreferrer"
          >
            Testar demonstração pública
          </a>
        </div>
      ) : (
        <>
          <p className="ui-note">
            O público só consulta. Fotos, nomes e estatísticas desta partida
            serão publicados. Use um único tablet para marcar.
          </p>
          {!publication.session ? (
            <form
              className="st-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const { error } = await cloud!.auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (error)
                    setError(
                      "Não foi possível entrar. Confira o e-mail e a senha.",
                    );
                  else setPassword("");
                } catch {
                  setError(
                    "Sem conexão. Tente novamente quando voltar a internet.",
                  );
                } finally {
                  setPassword("");
                  setBusy(false);
                }
              }}
            >
              <label className="fe-field">
                <span className="ui-eyebrow">E-mail da comissão</span>
                <input
                  className="ui-input"
                  type="email"
                  maxLength={254}
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="fe-field">
                <span className="ui-eyebrow">Senha</span>
                <input
                  className="ui-input"
                  type="password"
                  maxLength={1024}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button
                className="ui-btn ui-btn--primary"
                disabled={busy}
                type="submit"
              >
                {busy ? "Entrando…" : "Entrar para publicar"}
              </button>
            </form>
          ) : (
            <>
              <p className="ui-note">
                Comissão conectada: <b>{publication.session.user.email}</b>
              </p>
              <div className="st-data">
                <button
                  className="ui-btn ui-btn--primary"
                  disabled={!publication.authorized && !publication.enabled}
                  onClick={() => {
                    if (publication.enabled) publication.stop();
                    else void publication.start();
                  }}
                >
                  {publication.enabled
                    ? "Pausar transmissão"
                    : "Publicar esta partida ao vivo"}
                </button>
                <button
                  className="ui-btn ui-btn--ghost"
                  onClick={() => {
                    publication.stop();
                    void cloud!.auth.signOut();
                  }}
                >
                  Sair da publicação
                </button>
              </div>
            </>
          )}
          <p className="ui-note" role="status">
            {publication.status}
          </p>
        </>
      )}
      {error && (
        <p className="ui-alert" role="alert">
          {error}
        </p>
      )}
      <a
        className="ui-btn ui-btn--secondary ui-btn--sm st-public"
        href="/?view=public"
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir página pública
      </a>
      <p className="ui-note">
        Link para compartilhar após hospedar: <code>{publicLink()}</code>
      </p>
    </section>
  );
}
