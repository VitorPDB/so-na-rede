import { useEffect, useState } from "react";
import type { MatchVideo } from "./model";
import { embedUrl, watchUrl } from "./videos";
import {
  formatVideoTime,
  youtubeSourceId,
  type VideoMoment,
} from "./videoMoments";

export function MomentPlayer({
  moment,
  before = 5,
  after = 5,
}: {
  moment: VideoMoment;
  before?: number;
  after?: number;
}) {
  const [replay, setReplay] = useState(0);
  const [file, setFile] = useState<File>();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const id = youtubeSourceId(moment.videoSource);
  const v: MatchVideo | undefined = id
    ? {
        id,
        title: moment.label,
        youtubeId: id,
        startSeconds: Math.max(
          0,
          Math.floor(moment.videoTimestampMs / 1000) - before,
        ),
        kind: "replay",
      }
    : undefined;
  if (v)
    return (
      <div className="video-viewer">
        <iframe
          key={`${id}:${moment.videoTimestampMs}:${replay}`}
          title={`${moment.label} em ${formatVideoTime(moment.videoTimestampMs)}`}
          src={`${embedUrl(v).replace("autoplay=0", "autoplay=1")}&end=${Math.ceil(moment.videoTimestampMs / 1000) + after}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <button className="ui-btn" onClick={() => setReplay((n) => n + 1)}>
          Repetir trecho
        </button>
        <a
          className="ui-btn"
          href={watchUrl(v)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir no YouTube
        </a>
        <p className="ui-note">
          Trecho automático: {before} s antes e {after} s depois. Se não
          iniciar, toque em play. Se o canal impedir reprodução incorporada, use
          o link do YouTube.
        </p>
      </div>
    );
  if (!moment.videoSource)
    return (
      <p className="ui-note">
        Horário registrado, mas sem identificação do vídeo. Não é possível
        escolher a gravação automaticamente.
      </p>
    );
  return (
    <div className="video-review">
      <p>Selecione o arquivo original para rever este lance.</p>
      <input
        type="file"
        accept="video/*"
        aria-label="Vídeo local deste lance"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (`${f.name}|${f.size}|${f.lastModified}` !== moment.videoSource) {
            setError("Este não é o arquivo usado na marcação.");
            return;
          }
          setError("");
          setFile(f);
        }}
      />
      {error && <p role="alert">{error}</p>}
      {url && (
        <video
          key={`${url}:${moment.id}`}
          src={url}
          controls
          playsInline
          onTimeUpdate={(e) => {
            if (
              e.currentTarget.currentTime >=
              moment.videoTimestampMs / 1000 + after
            )
              e.currentTarget.pause();
          }}
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = Math.max(
              0,
              moment.videoTimestampMs / 1000 - before,
            );
          }}
        />
      )}
    </div>
  );
}
