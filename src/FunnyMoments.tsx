import { useState } from "react";
import type { Match } from "./model";
import { VideoReview } from "./VideoReview";
import { formatVideoTime } from "./videoMoments";
import { addFunnyMoment } from "./funnyMomentData";
export { addFunnyMoment } from "./funnyMomentData";
export function FunnyMoments({
  match,
  onChange,
}: {
  match: Match;
  onChange: (match: Match) => boolean;
}) {
  const [message, setMessage] = useState("");
  return (
    <details className="ui-card">
      <summary>Momentos engraçados · {match.funnyMoments?.length ?? 0}</summary>
      <p>
        Marque 2 segundos antes do clique, sem alterar placar ou notas. As
        marcações do YouTube também acompanham a publicação.
      </p>
      <VideoReview
        videos={match.videos}
        markLabel="Momento engraçado"
        onMark={(stamp) => {
          try {
            if (onChange(addFunnyMoment(match, stamp)))
              setMessage("Momento engraçado salvo.");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
        marks={(match.funnyMoments ?? []).map((m) => ({
          id: m.id,
          label: m.label,
          event: m,
        }))}
      />
      {(match.funnyMoments ?? []).map((m) => (
        <p key={m.id}>
          {m.label} · {formatVideoTime(m.videoTimestampMs)}{" "}
          <button
            className="ui-btn"
            onClick={() =>
              onChange({
                ...match,
                funnyMoments: match.funnyMoments?.filter((x) => x.id !== m.id),
              })
            }
            aria-label={`Remover momento engraçado em ${formatVideoTime(m.videoTimestampMs)}`}
          >
            Remover marcação
          </button>
        </p>
      ))}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
