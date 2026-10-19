import { useRef } from "react";
import { ChevronDown, Shield } from "lucide-react";
import type { PublicSnapshot } from "./publicSnapshot";

type Game = { public: PublicSnapshot; opponentLogo?: string | null };
function MatchScore({ game }: { game: Game }) {
  const s = game.public;
  const logo = game.opponentLogo;
  const validLogo = logo && /^data:image\/(png|jpeg|webp);base64,/.test(logo);
  return (
    <span className="published-score">
      <span className="published-score-meta">
        {s.playedAt
          ? new Date(s.playedAt).toLocaleDateString("pt-BR")
          : "Partida atual"}{" "}
        · {s.finished ? "Placar final · sets" : "Em andamento · sets"}
      </span>
      <span className="published-team">
        <span>{s.team}</span>
        <img src="/team-logo-transparent.png" alt="" />
        <strong>{s.sets[0]}</strong>
      </span>
      <span className="published-versus" aria-hidden="true">
        ×
      </span>
      <span className="published-team">
        <span>{s.opponent}</span>
        {validLogo ? (
          <img src={logo} alt="" />
        ) : (
          <Shield aria-label="Adversário sem escudo cadastrado" />
        )}
        <strong>{s.sets[1]}</strong>
      </span>
    </span>
  );
}
export function PublishedMatchPicker({
  games,
  value,
  onChange,
}: {
  games: Game[];
  value: string;
  onChange: (value: string) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const selected = games[Number(value)] ?? games[0];
  if (!selected) return null;
  return (
    <details className="published-picker" ref={details}>
      <summary aria-label="Selecionar partida">
        <MatchScore game={selected} />
        <ChevronDown aria-hidden="true" />
      </summary>
      <div
        className="published-options"
        role="group"
        aria-label="Partidas publicadas"
      >
        {games.map((game, i) => (
          <button
            type="button"
            key={game.public.matchId}
            aria-pressed={String(i) === value}
            onClick={() => {
              onChange(String(i));
              if (details.current) {
                details.current.open = false;
                details.current.querySelector("summary")?.focus();
              }
            }}
          >
            <MatchScore game={game} />
          </button>
        ))}
      </div>
    </details>
  );
}
