import { SkillIcon } from "./SkillIcon";
import { useEffect, useRef, useState } from "react";
import type { SkillEvent, MatchVideo } from "./model";
import { MatchVideoPlayer } from "./MatchVideos";
import { youtubeSourceId } from "./videoMoments";
import { YoutubeScout } from "./YoutubeScout";
import { CardSelect } from "./CardSelect";
export function VideoReview({
  onMark,
  marks,
  videos = [],
  disabled = false,
}: {
  onMark: (stamp: Pick<SkillEvent, "videoTimestampMs" | "videoSource">) => void;
  marks: { id: string; label: string; event: SkillEvent }[];
  videos?: MatchVideo[];
  disabled?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File>();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [youtube, setYoutube] = useState("");

  const [youtubeMoment, setYoutubeMoment] = useState<MatchVideo>();
  const chosen = videos.find((v) => v.id === youtube);
  const source = file ? `${file.name}|${file.size}|${file.lastModified}` : "";
  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const seek = (event: SkillEvent) => {
    const youtubeId = youtubeSourceId(event.videoSource);
    if (youtubeId) {
      setYoutubeMoment({
        id: youtubeId,
        title: "Lance marcado",
        youtubeId,
        startSeconds: Math.floor((event.videoTimestampMs ?? 0) / 1000),
        kind: "replay",
      });
      return;
    }
    if (!video.current || !url) return;
    if (event.videoSource && event.videoSource !== source) {
      setError("Selecione o arquivo original desta marcação.");
      return;
    }
    video.current.currentTime = (event.videoTimestampMs ?? 0) / 1000;
    video.current.pause();
    setError("");
  };
  return (
    <section className="ui-card video-review">
      <h2>Revisar pelo vídeo</h2>
      {!!videos.length && (
        <div>
          <label>
            Gravação do YouTube
            <CardSelect
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
            >
              <option value="">Selecione uma gravação</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </CardSelect>
          </label>
          {chosen && (
            <YoutubeScout
              key={chosen.id}
              video={chosen}
              onMark={onMark}
              disabled={disabled}
            />
          )}
        </div>
      )}
      {youtubeMoment && (
        <MatchVideoPlayer
          key={`${youtubeMoment.youtubeId}:${youtubeMoment.startSeconds}`}
          videos={[youtubeMoment]}
        />
      )}
      <p>
        Abra a gravação do aparelho. O arquivo não é enviado; os horários são
        salvos com as ações. Ao voltar, selecione o mesmo arquivo.
      </p>
      <label className="ui-btn">
        Selecionar vídeo
        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            setFile(e.target.files?.[0]);
            setError("");
          }}
        />
      </label>
      {url && (
        <>
          <video
            ref={video}
            src={url}
            controls
            preload="metadata"
            onError={() =>
              setError(
                "Este vídeo não pôde ser reproduzido. Experimente MP4 com codec H.264.",
              )
            }
          />
          <div className="video-review-actions">
            <button
              className="ui-btn"
              onClick={() => {
                if (video.current)
                  video.current.currentTime = Math.max(
                    0,
                    video.current.currentTime - 5,
                  );
              }}
            >
              Voltar 5 s
            </button>
            <button
              className="ui-btn"
              onClick={() => {
                if (video.current)
                  video.current.playbackRate =
                    video.current.playbackRate === 1 ? 0.5 : 1;
              }}
            >
              Alternar 0,5× / 1×
            </button>
            <button
              className="ui-btn"
              disabled={disabled}
              onClick={() => {
                if (video.current && video.current.readyState >= 1) {
                  video.current.pause();
                  onMark({
                    videoTimestampMs: Math.round(
                      video.current.currentTime * 1000,
                    ),
                    videoSource: source,
                  });
                }
              }}
            >
              Marcar ação neste instante
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="video-review-actions">
        {marks
          .filter((m) => m.event.videoTimestampMs !== undefined)
          .map((m) => (
            <button
              className="ui-btn"
              disabled={!url && !youtubeSourceId(m.event.videoSource)}
              key={m.id}
              onClick={() => seek(m.event)}
            >
              <SkillIcon skill={m.event.skill} /> {m.label} ·{" "}
              {Math.floor(m.event.videoTimestampMs! / 60000)}:
              {String(
                Math.floor(m.event.videoTimestampMs! / 1000) % 60,
              ).padStart(2, "0")}
            </button>
          ))}
      </div>
    </section>
  );
}
