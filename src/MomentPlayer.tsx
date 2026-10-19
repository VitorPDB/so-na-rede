import { useEffect, useState } from "react";
import type { MatchVideo } from "./model";
import { embedUrl, watchUrl } from "./videos";
import {
  formatVideoTime,
  youtubeSourceId,
  type VideoMoment,
} from "./videoMoments";

export function MomentPlayer({ moment }: { moment: VideoMoment }) {
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
          Math.floor(moment.videoTimestampMs / 1000) - 3,
        ),
        kind: "replay",
      }
    : undefined;
  if (v)
    return (
      <div className="video-viewer">
        <iframe
          key={`${id}:${moment.videoTimestampMs}`}
          title={`${moment.label} em ${formatVideoTime(moment.videoTimestampMs)}`}
          src={embedUrl(v)}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        <a
          className="ui-btn"
          href={watchUrl(v)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir no YouTube
        </a>
        <p className="ui-note">
          O vídeo abre três segundos antes do lance. Se o canal impedir
          reprodução incorporada, use o link do YouTube.
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
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = Math.max(
              0,
              moment.videoTimestampMs / 1000 - 3,
            );
          }}
        />
      )}
    </div>
  );
}
