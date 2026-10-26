import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Undo2, X } from "lucide-react";
import {
  type Match,
  type MatchVideo,
  type Projection,
  type Skill,
  type SkillEvent,
  skills,
} from "./model";
import { ModalDrawer } from "./ModalDrawer";
import { YoutubeScout, type VideoCapture } from "./YoutubeScout";
import { videoPositionKey } from "./videoPosition";
import { SkillIcon } from "./SkillIcon";
import { PlayerChooser } from "./PlayerChooser";
import { formatVideoTime } from "./videoMoments";

export function MobileScout({
  match,
  state,
  video,
  pending,
  onRecord,
  onSelect,
  onCancel,
  onClose,
  onUndo,
  canUndo,
  disabled,
  feedback,
}: {
  match: Match;
  state: Projection;
  video: MatchVideo;
  pending?: SkillEvent;
  onRecord: (
    skill: Skill,
    result: string,
    stamp: ReturnType<VideoCapture>,
  ) => void;
  onSelect: (id: string, details?: SkillEvent) => void;
  onCancel: () => void;
  onClose: () => void;
  onUndo: () => boolean;
  canUndo: boolean;
  disabled: boolean;
  feedback?: string;
}) {
  const capture = useRef<VideoCapture | undefined>(undefined);
  const [skill, setSkill] = useState<Skill>();
  const [stamp, setStamp] = useState<ReturnType<VideoCapture>>({});
  const [message, setMessage] = useState("");
  const hadPending = useRef(false);
  const controls = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hadPending.current && !pending) {
      setSkill(undefined);
      controls.current?.scrollTo(0, 0);
    }
    hadPending.current = !!pending;
  }, [pending]);
  const begin = (next: Skill) => {
    try {
      if (!capture.current) throw new Error("Aguarde o vídeo carregar.");
      setStamp(capture.current());
      setSkill(next);
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <ModalDrawer
      label="Scouting com vídeo"
      className="scout-modal"
      onClose={onClose}
    >
      <header className="scout-modal-header">
        <div>
          <h2>Scouting com vídeo</h2>
          <span>
            Set {state.set} · {state.score.join("–")}
          </span>
        </div>
        <button
          className="ui-icon-btn"
          onClick={onClose}
          aria-label="Fechar scouting"
        >
          <X />
        </button>
      </header>
      <div className="scout-modal-body">
        <div className="scout-video">
          <YoutubeScout
            video={video}
            captureRef={capture}
            compact
            positionKey={videoPositionKey(
              match.id,
              state.set,
              video.youtubeId,
              video.startSeconds,
            )}
          />
          {stamp.videoTimestampMs !== undefined && (
            <p className="ui-note">
              {skill || pending ? "Ação capturada em" : "Última captura:"}{" "}
              {formatVideoTime(stamp.videoTimestampMs)}. Replay não altera esse
              horário.
            </p>
          )}
        </div>
        <div className="scout-controls" ref={controls}>
          <ol className="scout-steps" aria-label="Etapas do registro">
            {["Fundamento", "Qualidade", "Nota e jogador"].map((label, i) => (
              <li
                key={label}
                aria-current={
                  (pending ? 2 : skill ? 1 : 0) === i ? "step" : undefined
                }
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>
          {disabled ? (
            <p role="status">
              Set encerrado. Feche o scouting para preparar o próximo set.
            </p>
          ) : pending ? (
            <PlayerChooser
              embedded
              match={match}
              state={state}
              event={pending}
              onSelect={(id, e) => {
                onSelect(id, e);
                setMessage("");
              }}
              onClose={() => {
                onCancel();
                setSkill(undefined);
              }}
            />
          ) : skill ? (
            <>
              <button
                className="ui-btn ui-btn--ghost"
                onClick={() => setSkill(undefined)}
              >
                <ArrowLeft size={18} />
                Trocar fundamento
              </button>
              <h3>
                <SkillIcon skill={skill} />
                {skills[skill].label}: como foi?
              </h3>
              <div className="scout-quality">
                {[
                  ["simple_good", "Bom", "good"],
                  ["simple_gafe", "Gafe", "gafe"],
                  ["simple_ours", "+1 nós", "ours"],
                  ["simple_theirs", "+1 eles", "theirs"],
                ].map(([result, label, tone]) => (
                  <button
                    className={"outcome " + tone}
                    key={result}
                    onClick={() => onRecord(skill, result, stamp)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>Qual foi o fundamento?</h3>
              <div className="scout-skills">
                {(
                  [
                    "serve",
                    "reception",
                    "set",
                    "attack",
                    "block",
                    "defense",
                  ] as Skill[]
                ).map((key) => (
                  <button
                    className="ui-btn"
                    key={key}
                    onClick={() => begin(key)}
                  >
                    <SkillIcon skill={key} size={36} />
                    {skills[key].label}
                  </button>
                ))}
              </div>
            </>
          )}
          {message && <p role="alert">{message}</p>}
          {feedback && <p role="status">{feedback}</p>}
          <button
            className="ui-btn scout-undo"
            disabled={!canUndo || !!pending}
            onClick={() => {
              if (onUndo()) {
                setSkill(undefined);
                setMessage("Último lançamento desfeito.");
              }
            }}
          >
            <Undo2 size={18} />
            Desfazer último lançamento
          </button>
        </div>
      </div>
    </ModalDrawer>
  );
}
