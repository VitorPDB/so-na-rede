import { CardSelect } from "./CardSelect";
import { useState } from "react";
import { ExternalLink, Play, Plus, Trash2, Pencil, Video } from "lucide-react";
import type { MatchVideo } from "./model";
import {
  embedUrl,
  watchUrl,
  videoKinds,
  validVideos,
  youtubeLink,
} from "./videos";
export function MatchVideoPlayer({
  videos,
  finished = false,
}: {
  videos?: MatchVideo[];
  finished?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const list = validVideos(videos) ? (videos ?? []) : [];
  if (!list.length) return null;
  const video = list.find((v) => v.id === selected);
  return (
    <section className="ui-card match-videos" aria-label="Vídeos da partida">
      <header className="ui-card-head">
        <div>
          <h2>
            <Video size={20} aria-hidden="true" /> Vídeos da partida
          </h2>
          <p>Assista junto do placar e das estatísticas.</p>
        </div>
      </header>
      <div className="video-links">
        {list.map((v) => (
          <button
            type="button"
            className="ui-btn ui-btn--secondary"
            key={v.id}
            aria-pressed={selected === v.id}
            onClick={() => setSelected(v.id)}
          >
            <Play size={18} aria-hidden="true" />
            {v.title}
            {v.set ? ` · Set ${v.set}` : ""}
            <small>
              {v.kind === "live" && !finished
                ? "Assistir transmissão"
                : "Assistir gravação"}
            </small>
          </button>
        ))}
      </div>
      {video && (
        <div className="video-viewer">
          <iframe
            key={`${video.id}:${video.youtubeId}:${video.startSeconds}`}
            title={video.title}
            src={embedUrl(video)}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          <div className="video-actions">
            <a
              className="ui-btn ui-btn--secondary"
              href={watchUrl(video)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={18} aria-hidden="true" />
              Abrir no YouTube
            </a>
            <button
              type="button"
              className="ui-btn ui-btn--ghost"
              onClick={() => setSelected("")}
            >
              Fechar vídeo
            </button>
          </div>
          <p className="ui-note">
            Se o vídeo não puder ser reproduzido aqui, abra no YouTube.{" "}
            {video.kind === "live" && !finished
              ? "O vídeo pode estar atrasado em relação ao placar."
              : "A gravação não está sincronizada automaticamente com as estatísticas."}
          </p>
        </div>
      )}
    </section>
  );
}
export function MatchVideoEditor({
  videos = [],
  onChange,
}: {
  videos?: MatchVideo[];
  onChange: (videos: MatchVideo[]) => boolean;
}) {
  const [editing, setEditing] = useState("");
  const [title, setTitle] = useState("Jogo completo"),
    [url, setUrl] = useState(""),
    [start, setStart] = useState("");
  const [kind, setKind] = useState<MatchVideo["kind"]>("replay"),
    [set, setSet] = useState("");
  const [message, setMessage] = useState("");
  const clear = () => {
    setEditing("");
    setTitle("Jogo completo");
    setUrl("");
    setStart("");
    setKind("replay");
    setSet("");
  };
  const save = () => {
    try {
      const parsed = youtubeLink(url);
      const video: MatchVideo = {
        id: editing || crypto.randomUUID(),
        title: title.trim(),
        ...parsed,
        startSeconds: start.trim() ? Number(start) : parsed.startSeconds,
        kind,
        ...(set ? { set: Number(set) } : {}),
      };
      const next = editing
        ? videos.map((v) => (v.id === editing ? video : v))
        : [...videos, video];
      if (!validVideos(next))
        throw new Error(
          "Confira título, início (0–86400 s) e set (1–5). Máximo de 20 vídeos.",
        );
      if (onChange(next)) {
        clear();
        setMessage("Vídeos salvos neste dispositivo.");
      } else
        setMessage(
          "Não foi possível salvar. Confira o aviso de armazenamento.",
        );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível salvar o vídeo.",
      );
    }
  };
  return (
    <section
      className="ui-card match-videos"
      aria-label="Anexar vídeos à partida"
    >
      <header className="ui-card-head">
        <div>
          <h2>Vídeos da partida</h2>
          <p>
            Links de qualquer canal do YouTube. Não precisa ser um canal do
            time.
          </p>
        </div>
      </header>
      <div className="video-editor-fields">
        <label>
          Título
          <input
            className="ui-input"
            value={title}
            maxLength={180}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Link do YouTube
          <input
            className="ui-input"
            type="url"
            value={url}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label>
          Tipo
          <CardSelect
            className="ui-select"
            value={kind}
            onChange={(e) => setKind(e.target.value as MatchVideo["kind"])}
          >
            {Object.entries(videoKinds).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </CardSelect>
        </label>
        <label>
          Início em segundos · opcional
          <input
            className="ui-input"
            type="number"
            min={0}
            max={86400}
            value={start}
            placeholder="Usar horário do link"
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Set · opcional
          <CardSelect
            className="ui-select"
            value={set}
            onChange={(e) => setSet(e.target.value)}
          >
            <option value="">Jogo completo / outros</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                Set {n}
              </option>
            ))}
          </CardSelect>
        </label>
      </div>
      <div className="video-actions">
        <button type="button" className="ui-btn ui-btn--primary" onClick={save}>
          <Plus size={18} aria-hidden="true" />
          {editing ? "Salvar alterações do vídeo" : "Adicionar vídeo"}
        </button>
        {editing && (
          <button
            type="button"
            className="ui-btn ui-btn--secondary"
            onClick={clear}
          >
            Cancelar edição
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="ui-note">
          {message}
        </p>
      )}
      <ul className="video-editor-list">
        {videos.map((v) => (
          <li key={v.id}>
            <div>
              <strong>{v.title}</strong>
              <small>
                {videoKinds[v.kind]}
                {v.set ? ` · Set ${v.set}` : ""} · Início {v.startSeconds}s
              </small>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              aria-label={`Editar vídeo ${v.title}`}
              onClick={() => {
                setEditing(v.id);
                setTitle(v.title);
                setUrl(watchUrl(v));
                setStart(String(v.startSeconds));
                setKind(v.kind);
                setSet(v.set ? String(v.set) : "");
                setMessage("");
              }}
            >
              <Pencil size={18} aria-hidden="true" />
              Editar
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              aria-label={`Remover vídeo ${v.title}`}
              onClick={() => {
                if (onChange(videos.filter((x) => x.id !== v.id))) {
                  if (editing === v.id) clear();
                  setMessage("Vídeo removido. Estatísticas preservadas.");
                }
              }}
            >
              <Trash2 size={18} aria-hidden="true" />
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
