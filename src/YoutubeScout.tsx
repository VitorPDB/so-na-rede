import { useEffect, useRef, useState, type RefObject } from "react";
import type { MatchVideo, SkillEvent } from "./model";
import {
  loadYoutubeAPI,
  captureYoutubeMoment,
  type YoutubePlayer,
} from "./youtubePlayer";
import { watchUrl } from "./videos";
export type VideoCapture = () => Pick<
  SkillEvent,
  "videoTimestampMs" | "videoSource"
>;
export function YoutubeScout({
  video,
  onMark,
  captureRef,
  disabled = false,
}: {
  video: MatchVideo;
  onMark?: (stamp: ReturnType<VideoCapture>) => void;
  captureRef?: RefObject<VideoCapture | undefined>;
  disabled?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YoutubePlayer | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, retry] = useState(0);
  const capture = () => {
    if (!player.current || !ready)
      throw new Error("Aguarde o player ficar pronto.");
    return captureYoutubeMoment(player.current, video.youtubeId);
  };
  useEffect(() => {
    if (captureRef) captureRef.current = capture;
    return () => {
      if (captureRef) captureRef.current = undefined;
    };
  }, [ready, video.youtubeId]);
  useEffect(() => {
    let disposed = false;
    let instance: YoutubePlayer | undefined;
    setReady(false);
    setError("");
    const container = document.createElement("div");
    host.current!.appendChild(container);
    loadYoutubeAPI()
      .then((api) => {
        if (disposed) return;
        instance = new api.Player(container, {
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          videoId: video.youtubeId,
          playerVars: {
            origin: window.location.origin,
            playsinline: 1,
            start: Math.floor(video.startSeconds),
            rel: 0,
          },
          events: {
            onReady: () => {
              if (!disposed) {
                player.current = instance;
                setReady(true);
              }
            },
            onError: () => {
              if (!disposed) {
                setReady(false);
                setError(
                  "O YouTube não liberou esta gravação no player. Confira o link e se o canal permite incorporação.",
                );
              }
            },
          },
        });
      })
      .catch((e) => {
        if (!disposed) setError(e.message);
      });
    return () => {
      disposed = true;
      player.current = undefined;
      instance?.destroy();
      container.remove();
    };
  }, [video.youtubeId, video.startSeconds, attempt]);
  return (
    <section className="youtube-scout">
      <div className="youtube-scout-frame" ref={host} />
      <p className="ui-note">
        {ready
          ? "Ao começar uma ação, o horário é capturado e o vídeo pausa. Escolha fundamento e jogador; depois continue o vídeo."
          : "Carregando player do YouTube…"}
      </p>
      <div className="video-review-actions">
        {onMark && (
          <button
            className="ui-btn"
            disabled={!ready || disabled}
            onClick={() => {
              try {
                onMark(capture());
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Marcar ação neste instante
          </button>
        )}
        <button
          className="ui-btn"
          disabled={!ready || disabled}
          onClick={() => player.current?.playVideo()}
        >
          Continuar vídeo
        </button>
        <button
          className="ui-btn"
          disabled={!ready || disabled}
          onClick={() => {
            const p = player.current;
            if (p) {
              p.seekTo(Math.max(0, p.getCurrentTime() - 5), true);
              p.pauseVideo();
            }
          }}
        >
          Voltar 5 s
        </button>
      </div>
      {error && (
        <p role="alert">
          {error}{" "}
          <button className="ui-btn" onClick={() => retry(attempt + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      <a href={watchUrl(video)} target="_blank" rel="noopener noreferrer">
        Abrir no YouTube
      </a>
    </section>
  );
}
