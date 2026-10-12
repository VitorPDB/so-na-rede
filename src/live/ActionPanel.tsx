import {
  Activity,
  ArrowDownToLine,
  BrickWall,
  CircleDot,
  Minus,
  Plus,
  ShieldCheck,
  ShieldHalf,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Volleyball,
  type LucideIcon,
} from "lucide-react";
import { type Projection, type Side, type Skill, skills } from "../model";

export const skillIcons: Record<Skill, LucideIcon> = {
  reception: ShieldHalf,
  serve: CircleDot,
  attack: Activity,
  block: BrickWall,
  defense: ShieldCheck,
  set: ArrowDownToLine,
  opponent: Trophy,
};

const outcomes = [
  { id: "simple_good", label: "Bom", tone: "good", icon: ThumbsUp },
  { id: "simple_gafe", label: "Gafe", tone: "gafe", icon: ThumbsDown },
  { id: "simple_ours", label: "Ponto nosso", tone: "ours", icon: Plus },
  { id: "simple_theirs", label: "Ponto deles", tone: "theirs", icon: Minus },
] as const;

export function ActionPanel({
  state,
  disabled,
  onRecord,
  onPoint,
}: {
  state: Projection;
  disabled: boolean;
  onRecord: (skill: Skill, result: string) => void;
  onPoint: (side: Side) => void;
}) {
  const s = state;
  const simpleSkills: Skill[] = [
    s.server === "ours" ? "serve" : "reception",
    "set",
    "attack",
    "block",
    "defense",
  ];
  return (
    <section
      className="lv-card lv-actions is-simple"
      aria-labelledby="actions-title"
    >
      <header className="lv-card-head">
        <div>
          <h2 id="actions-title">Registrar ação</h2>
          <p className="flow-hint">
            <b>1</b> Resultado <span aria-hidden="true">→</span> <b>2</b>{" "}
            Jogador
          </p>
        </div>
      </header>

      {
        <div className="outcome-list">
          {simpleSkills.map((key, row) => {
            const Icon = skillIcons[key];
            const title = key === "attack" ? "Ataque" : skills[key].label;
            const options =
              key === "reception" || key === "defense"
                ? [
                    {
                      id: "simple_A",
                      label: "A",
                      tone: "good",
                      icon: ThumbsUp,
                    },
                    {
                      id: "simple_B",
                      label: "B",
                      tone: "neutral",
                      icon: Volleyball,
                    },
                    {
                      id: "simple_C",
                      label: "C",
                      tone: "gafe",
                      icon: ThumbsDown,
                    },
                    ...outcomes.slice(2),
                  ]
                : outcomes;
            return (
              <div
                className="outcome-row"
                key={key}
                style={{ "--i": row } as React.CSSProperties}
              >
                <div className="outcome-skill">
                  <Icon size={18} aria-hidden="true" />
                  <strong>{title}</strong>
                </div>
                <div className="outcome-buttons">
                  {options.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      className={"outcome " + o.tone}
                      disabled={disabled}
                      aria-label={`${title} ${o.label.toLowerCase()}`}
                      onClick={() => onRecord(key, o.id)}
                    >
                      <o.icon size={16} aria-hidden="true" />
                      <span>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      }

      <div className="no-skill">
        <span className="ui-eyebrow">Ponto sem fundamento identificado</span>
        <div>
          <button
            type="button"
            className="outcome neutral"
            disabled={disabled}
            onClick={() => onRecord("opponent", "error")}
          >
            <Trophy size={16} aria-hidden="true" />
            <span>Erro adversário</span>
          </button>
          <button
            type="button"
            className="outcome ours"
            disabled={disabled}
            onClick={() => onPoint("ours")}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Ponto nosso</span>
          </button>
          <button
            type="button"
            className="outcome theirs"
            disabled={disabled}
            onClick={() => onPoint("theirs")}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Ponto deles</span>
          </button>
        </div>
      </div>
    </section>
  );
}
