import { useState } from "react";
import { RallyReview } from "./RallyReview";
import type { Match } from "./model";
import { PostGameDetailed } from "./PostGameDetailedTable";
import { PostGameTotals } from "./PostGameTotals";
import { ClipboardList, Table2 } from "lucide-react";
export function PostGameView(props: {
  match: Match;
  onChange: (m: Match) => boolean;
  onApplied: () => void;
}) {
  const [mode, setMode] = useState<"detailed" | "totals" | "review">("review");
  return (
    <>
      <div
        className="postgame-toolbar"
        role="group"
        aria-label="Formato do pós-jogo"
      >
        <button
          className="button secondary"
          aria-pressed={mode === "review"}
          onClick={() => setMode("review")}
        >
          Completar rallies · vídeo
        </button>
        <button
          aria-pressed={mode === "detailed"}
          className={`button ${mode === "detailed" ? "" : "secondary"}`}
          onClick={() => setMode("detailed")}
        >
          <ClipboardList size={18} aria-hidden="true" />
          Completo · rally a rally
        </button>
        <button
          aria-pressed={mode === "totals"}
          className={`button ${mode === "totals" ? "" : "secondary"}`}
          onClick={() => setMode("totals")}
        >
          <Table2 size={18} aria-hidden="true" />
          Rápido · totais por set
        </button>
      </div>
      {mode === "review" ? (
        <RallyReview match={props.match} onChange={props.onChange} />
      ) : mode === "detailed" ? (
        <PostGameDetailed {...props} />
      ) : (
        <PostGameTotals match={props.match} onChange={props.onChange} />
      )}
    </>
  );
}
