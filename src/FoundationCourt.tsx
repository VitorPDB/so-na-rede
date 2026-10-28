import { foundationFigures } from "./foundationFigures";
import type { Skill } from "./model";

export function FoundationCourt({
  skill,
  blockers,
  direction,
}: {
  skill: Skill;
  blockers?: number;
  direction?: string;
}) {
  const athlete = (
    pose: string,
    x: number,
    y: number,
    width = 143,
    opponent = false,
  ) => (
    <svg
      x={x}
      y={y}
      width={width}
      height={(width * 165) / 130}
      viewBox="0 0 130 165"
      className={`fv-athlete${opponent ? " fv-opponent" : ""}`}
    >
      <g dangerouslySetInnerHTML={{ __html: foundationFigures[pose] ?? "" }} />
    </svg>
  );
  const target =
    direction === "line"
      ? [230, 112]
      : direction === "cross"
        ? [576, 163]
        : direction === "middle"
          ? [432, 144]
          : null;
  const count = blockers ?? 0;
  const setPaths: Record<
    string,
    { path: string; arrow: string; x: number; y: number }
  > = {
    front: {
      path: "M366 240 Q280 145 180 240",
      arrow: "M182 229 180 240 191 238",
      x: 180,
      y: 240,
    },
    back: {
      path: "M366 240 Q480 145 610 240",
      arrow: "M599 239 610 240 607 229",
      x: 610,
      y: 240,
    },
    middle: {
      path: "M366 240 Q400 185 440 240",
      arrow: "M429 236 440 240 439 229",
      x: 440,
      y: 240,
    },
    backrow: {
      path: "M366 240 Q490 215 545 365",
      arrow: "M535 359 545 365 548 354",
      x: 545,
      y: 365,
    },
  };
  const setPath =
    skill === "set" && direction ? setPaths[direction] : undefined;
  return (
    <svg className="fv-court" viewBox="0 0 800 510" aria-hidden="true">
      <path className="fv-base" d="M190 96H610L710 432H90Z" />
      <path className="fv-near" d="M140 264H660L710 432H90Z" />
      <path className="fv-lines" d="M157 208H643M123 320H677M140 264H660" />
      <text x="400" y="69" textAnchor="middle">
        QUADRA ADVERSÁRIA
      </text>
      <text x="400" y="477" textAnchor="middle">
        NOSSA QUADRA
      </text>
      {skill === "attack" && target && (
        <g className="fv-route">
          <ellipse
            cx={target[0]}
            cy={target[1]}
            rx="20"
            ry="9"
            opacity=".2"
            fill="var(--c-gold-strong)"
          />
          <path
            className="fv-trajectory"
            d={
              direction === "middle"
                ? `M188 170 Q360 48 ${target[0]} ${target[1]}`
                : `M188 170 L${target[0]} ${target[1]}`
            }
          />
          <path
            className="fv-arrow"
            d={
              direction === "line"
                ? "M220 116 230 112 229 123"
                : direction === "cross"
                  ? "M566 157 576 163 566 169"
                  : `m${target[0] - 8} ${target[1] - 8} 8 8 4-12`
            }
          />
        </g>
      )}
      {skill === "attack" &&
        Array.from({ length: count }, (_, i) => (
          <g key={i}>
            {athlete(
              "block",
              count === 1
                ? 220
                : count === 2
                  ? 210 + i * 59
                  : 300 + (i - 1) * 59,
              93,
              72,
              true,
            )}
          </g>
        ))}
      <g>
        <path className="fv-post" d="M132 170v105m536-105v105" />
        <path
          className="fv-net"
          d={`${Array.from({ length: 29 }, (_, i) => `M${145 + i * 18} 178v77`).join(" ")} ${Array.from({ length: 5 }, (_, i) => `M139 ${187 + i * 14}H661`).join(" ")}`}
        />
        <path className="fv-tape" d="M133 176H667M139 255H661" />
        <path d="M139 161v17m522-17v17" stroke="var(--c-neg)" strokeWidth="3" />
      </g>
      {setPath && (
        <g className="fv-route">
          <path className="fv-trajectory" d={setPath.path} />
          <path className="fv-arrow" d={setPath.arrow} />
          <ellipse
            cx={setPath.x}
            cy={setPath.y}
            rx="18"
            ry="8"
            fill="var(--c-gold-strong)"
            opacity=".2"
          />
          <circle cx="366" cy="240" r="8" className="fv-ball" />
        </g>
      )}
      {skill === "reception" && (
        <g className="fv-route">
          <path className="fv-trajectory" d="M416 313 Q510 195 560 255" />
          <path className="fv-arrow" d="M549 251 560 255 559 244" />
          <circle cx="416" cy="313" r="8" className="fv-ball" />
          <ellipse
            cx="560"
            cy="255"
            rx="18"
            ry="8"
            fill="var(--c-gold-strong)"
            opacity=".2"
          />
          <text x="560" y="285" textAnchor="middle">
            LEVANTADOR
          </text>
        </g>
      )}
      {skill === "attack"
        ? athlete("attack", 80, 163)
        : skill === "block"
          ? Array.from({ length: count || 1 }, (_, i) => (
              <g key={i}>
                {athlete(
                  "block",
                  300 + (i - ((count || 1) - 1) / 2) * 78,
                  154,
                  110,
                )}
              </g>
            ))
          : athlete(
              skill,
              skill === "serve" ? 320 : 300,
              skill === "serve" ? 270 : 220,
            )}
      {skill === "attack" && (
        <circle cx="188" cy="170" r="9" className="fv-ball" />
      )}
    </svg>
  );
}
