import { useEffect, useState } from "react";
import type { SocialCardData } from "./socialCardData";
import { ModalDrawer } from "./ModalDrawer";
import { renderSocialCard } from "./renderSocialCard";
export function SocialCardExport({ data }: { data: SocialCardData }) {
  const [open, setOpen] = useState(false),
    [story, setStory] = useState(false),
    [hero, setHero] = useState(0),
    [url, setUrl] = useState(""),
    [blob, setBlob] = useState<Blob>(),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true,
      object = "";
    setUrl("");
    setBlob(undefined);
    setError("");
    void renderSocialCard(data, story, hero)
      .then((b) => {
        if (!active) return;
        object = URL.createObjectURL(b);
        setUrl(object);
        setBlob(b);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [open, story, data, hero]);
  const fileName = `so-na-rede-${data.player.number}-${story ? "story" : "feed"}.png`;
  return (
    <>
      <button className="ui-btn" onClick={() => setOpen(true)}>
        Criar card da partida
      </button>
      {open && (
        <ModalDrawer
          label="Compartilhar desempenho"
          className="social-export"
          onClose={() => setOpen(false)}
        >
          <header>
            <h2>Card de {data.player.name}</h2>
            <button className="ui-btn" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </header>
          <label>
            Conquista principal
            <select
              className="ui-select"
              value={hero}
              onChange={(e) => setHero(Number(e.target.value))}
            >
              {data.metrics
                .filter((m) => !m.label.includes("ERROS"))
                .map((m, i) => (
                  <option key={m.label} value={i}>
                    {m.value} · {m.label}
                  </option>
                ))}
              <option value={-1}>Nota na partida</option>
            </select>
          </label>
          {data.highlight && (
            <p className="ui-note">
              Destaque escolhido pela comissão · tema dourado
            </p>
          )}
          <div className="report-switches">
            <button
              className="ui-btn"
              aria-pressed={!story}
              onClick={() => setStory(false)}
            >
              Feed · 1080 × 1350
            </button>
            <button
              className="ui-btn"
              aria-pressed={story}
              onClick={() => setStory(true)}
            >
              Story · 1080 × 1920
            </button>
          </div>
          <p className="ui-note">
            A foto do perfil aparece inteira. Sem foto, destacamos o número da
            camisa. Ao compartilhar, você torna estes números visíveis para quem
            receber a imagem.
          </p>
          {error ? (
            <p role="alert">{error}</p>
          ) : url ? (
            <img src={url} alt={`Card de desempenho de ${data.player.name}`} />
          ) : (
            <p role="status">Preparando imagem…</p>
          )}
          <div className="video-review-actions">
            {url && (
              <a
                className="ui-btn ui-btn--primary"
                href={url}
                download={fileName}
              >
                Baixar PNG
              </a>
            )}
            {blob && typeof navigator.share === "function" && (
              <button
                className="ui-btn"
                onClick={async () => {
                  const file = new File([blob], fileName, {
                    type: "image/png",
                  });
                  if (!navigator.canShare?.({ files: [file] })) {
                    setError("Use Baixar PNG e compartilhe pela galeria.");
                    return;
                  }
                  try {
                    await navigator.share({ files: [file] });
                  } catch (e) {
                    if ((e as Error).name !== "AbortError")
                      setError(
                        "Não foi possível compartilhar. Use Baixar PNG.",
                      );
                  }
                }}
              >
                Compartilhar
              </button>
            )}
          </div>
        </ModalDrawer>
      )}
    </>
  );
}
