import { useEffect, useRef } from "react";

/**
 * Sequência de pontos do set, rally a rally, como na súmula: cada coluna é um
 * ponto, marcado na linha de quem pontuou com o placar daquele time.
 * Só lê os rallies já registrados; não altera nada.
 */
export function RallyStrip({
  rallies,
  set,
}: {
  rallies: { set: number; winner: "ours" | "theirs" }[];
  set: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  let us = 0;
  let them = 0;
  const cols = rallies
    .filter((r) => r.set === set)
    .map((r) =>
      r.winner === "ours" ? { us: ++us, them: 0 } : { us: 0, them: ++them },
    );
  // Mantém o ponto mais recente visível quando o set passa da largura.
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [cols.length]);
  return (
    <div
      className="rs"
      role="group"
      aria-label={`Sequência de pontos do ${set}º set: ${us} a ${them} em ${cols.length} rallies`}
    >
      <div className="rs-labels" aria-hidden="true">
        <span className="is-us">Nós</span>
        <span className="is-them">Eles</span>
      </div>
      <div className="rs-track" ref={track} aria-hidden="true">
        {cols.length === 0 && (
          <span className="rs-empty">
            O primeiro ponto do set aparece aqui.
          </span>
        )}
        {cols.map((c, i) => (
          <span
            key={i}
            className={"rs-col" + (i === cols.length - 1 ? " is-last" : "")}
          >
            <span className={"rs-cell" + (c.us ? " is-us" : "")}>
              {c.us || ""}
            </span>
            <span className={"rs-cell" + (c.them ? " is-them" : "")}>
              {c.them || ""}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
