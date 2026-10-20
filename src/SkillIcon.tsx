import type { ReactNode } from "react";
import { Shield } from "lucide-react";
const figures: Record<string, ReactNode> = {
  block: (
    <>
      <circle cx="24" cy="20" r="4" />
      <path d="M24 26v12m0-10-8-4V10m8 18 8-4V10M24 38l-7 12m7-12 7 12" />
      <path className="detail" d="M39 23v29m-3-25h7m-7 7h7m-7 7h7" />
      <circle className="ball" cx="25" cy="8" r="4" />
    </>
  ),
  attack: (
    <>
      <circle cx="25" cy="21" r="4" />
      <path d="m25 27-3 11m2-8-10-4-4 4m15-3 7-8-2-8m-8 27-9 5-6-3m15-2 8 7 7-2" />
      <circle className="ball" cx="39" cy="8" r="4" />
      <path className="detail" d="m40 17 5 8m-8-5 3 5" />
    </>
  ),
  set: (
    <>
      <circle cx="24" cy="23" r="4" />
      <path d="M24 29v10m0-9-9-9 4-8m5 17 9-9-4-8M24 39l-7 11m7-11 7 11" />
      <circle className="ball" cx="24" cy="7" r="4" />
    </>
  ),
  reception: (
    <>
      <circle cx="22" cy="24" r="4" />
      <path d="m22 30 4 8m-4-6 10 2 7-7m-15 5 9 4 6-9m-13 11-10 4-4 8m14-12 8 6 6 6" />
      <circle className="ball" cx="43" cy="18" r="4" />
      <path className="detail" d="m45 7-1 4" />
    </>
  ),
  defense: (
    <>
      <circle cx="31" cy="30" r="4" />
      <path d="m26 36-12 4m14-4 11 3 9-5m-19 6 11 2 8-8m-34 6-6-7m6 7-5 7H3" />
      <circle className="ball" cx="46" cy="24" r="4" />
      <path className="detail" d="M17 51h28" />
    </>
  ),
  serve: (
    <>
      <circle cx="23" cy="23" r="4" />
      <path d="m23 29 1 11m-1-10 12-9m-12 9-9-10 4-9m6 29-9 11m9-11 9 11" />
      <circle className="ball" cx="38" cy="13" r="4" />
    </>
  ),
};
export function skillForLabel(label: string): string | undefined {
  const names: Record<string, string> = {
    Bloqueio: "block",
    Ataque: "attack",
    "Ataque / corte": "attack",
    Levantamento: "set",
    Recepção: "reception",
    Defesa: "defense",
    Saque: "serve",
  };
  return names[label.split(" · ")[0]];
}
export function SkillIcon({
  skill,
  size = 28,
  className = "",
}: {
  skill?: string;
  size?: number;
  className?: string;
}) {
  if (!skill || !figures[skill])
    return (
      <Shield
        size={size}
        className={`skill-icon ${className}`}
        aria-hidden="true"
      />
    );
  return (
    <svg
      className={`skill-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {figures[skill]}
    </svg>
  );
}
