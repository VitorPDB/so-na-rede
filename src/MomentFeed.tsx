import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { CardSelect } from "./CardSelect";
import { MomentPlayer } from "./MomentPlayer";
import { SkillIcon, skillForLabel } from "./SkillIcon";
import type { Player } from "./model";
import type { VideoMoment } from "./videoMoments";

export function MomentFeed({
  moments,
  selectedId,
  players,
  onSelect,
  onClose,
}: {
  moments: VideoMoment[];
  selectedId: string;
  players: Player[];
  onSelect: (moment: VideoMoment) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [before, setBefore] = useState(5);
  const [after, setAfter] = useState(5);
  const index = moments.findIndex((m) => m.id === selectedId);
  const moment = moments[index];
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const move = (offset: number) => {
    const next = moments[index + offset];
    if (next) onSelect(next);
  };
  return (
    <dialog
      ref={dialog}
      className="moment-feed"
      aria-label="Feed de jogadas"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="moment-feed-header">
        <strong>
          Jogadas · {index + 1} / {moments.length}
        </strong>
        <button
          className="ui-btn"
          onClick={onClose}
          aria-label="Fechar jogadas"
          autoFocus
        >
          <X />
        </button>
      </header>
      {moment && (
        <>
          <div
            className={`moment-feed-info${moment.pointWon ? " is-point" : ""}`}
            aria-live="polite"
          >
            <SkillIcon
              skill={moment.skill ?? skillForLabel(moment.label)}
              size={40}
            />
            <div>
              <strong>{moment.label}</strong>
              <p>
                {moment.playerIds
                  .map((id) => players.find((p) => p.id === id)?.name ?? id)
                  .join(" + ")}
              </p>
              <small>
                Set {moment.set} · Rally {moment.rally}
                {moment.pointWon ? " · Ponto nosso" : ""}
              </small>
            </div>
          </div>
          <MomentPlayer
            key={`${moment.id}:${moment.videoSource}:${before}:${after}`}
            moment={moment}
            before={before}
            after={after}
          />
          <div
            className="moment-feed-swipe"
            onTouchStart={(e) => {
              const t = e.touches[0];
              touch.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchCancel={() => {
              touch.current = null;
            }}
            onTouchEnd={(e) => {
              const start = touch.current;
              touch.current = null;
              if (!start) return;
              const t = e.changedTouches[0];
              const dy = start.y - t.clientY;
              if (
                Math.abs(dy) > 40 &&
                Math.abs(dy) > Math.abs(start.x - t.clientX)
              )
                move(dy > 0 ? 1 : -1);
            }}
          >
            <strong>Deslize aqui para trocar de jogada ↕</strong>
            <small aria-live="polite">
              {moments.length === 1
                ? "Única jogada deste filtro"
                : index === 0
                  ? "↑ Próxima jogada"
                  : index === moments.length - 1
                    ? "Fim da sequência · ↓ Jogada anterior"
                    : "↑ Próxima · ↓ Anterior"}
            </small>
          </div>
          <nav className="moment-feed-nav" aria-label="Navegar pelas jogadas">
            <button
              className="ui-btn"
              disabled={index <= 0}
              onClick={() => move(-1)}
            >
              <ArrowUp size={20} /> Anterior
            </button>
            <button
              className="ui-btn"
              disabled={index >= moments.length - 1}
              onClick={() => move(1)}
            >
              Próxima <ArrowDown size={20} />
            </button>
          </nav>
          <details className="moment-feed-duration">
            <summary>Ajustar duração do trecho</summary>
            <label>
              Antes do lance{" "}
              <CardSelect
                value={before}
                onChange={(e) => setBefore(Number(e.target.value))}
              >
                {[3, 5, 10, 15].map((s) => (
                  <option key={s} value={s}>
                    {s} segundos
                  </option>
                ))}
              </CardSelect>
            </label>
            <label>
              Depois do lance{" "}
              <CardSelect
                value={after}
                onChange={(e) => setAfter(Number(e.target.value))}
              >
                {[3, 5, 10, 15].map((s) => (
                  <option key={s} value={s}>
                    {s} segundos
                  </option>
                ))}
              </CardSelect>
            </label>
          </details>
        </>
      )}
    </dialog>
  );
}
