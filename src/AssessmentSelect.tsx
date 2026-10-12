import {
  ChevronDown,
  Target,
  Gauge,
  Hand,
  Timer,
  Move,
  ArrowUp,
  Volleyball,
  Circle,
  Mountain,
  Siren,
  TriangleAlert,
  CheckCheck,
  Shield,
  Sparkles,
  UsersRound,
  UserRound,
} from "lucide-react";
export function fieldIcon(label: string) {
  if (/Jogador|Quem analisar|Autor|Função|Central/i.test(label))
    return UserRound;
  if (/Formação|Formato/i.test(label)) return UsersRound;
  if (/Período|Partida/i.test(label)) return Timer;
  if (/Adversário/i.test(label)) return Shield;
  return /Dificuldade/.test(label)
    ? Gauge
    : /Qualidade|Execução/.test(label)
      ? Target
      : /Técnica/.test(label)
        ? Hand
        : /Momento/.test(label)
          ? Timer
          : /Passada/.test(label)
            ? Move
            : /Direção|Origem/.test(label)
              ? ArrowUp
              : /Participação|Tipo de bloqueio/.test(label)
                ? UsersRound
                : Volleyball;
}
export function choiceIcon(id: string, label: string) {
  if (id === "easy") return Circle;
  if (id === "normal") return Gauge;
  if (id === "hard") return Mountain;
  if (id === "emergency") return Siren;
  if (/erro|gafe|ruim|atrasado|buraco|bloqueou tendo|explorado/i.test(label))
    return TriangleAlert;
  if (/perfeit|excelente|ponto bem/i.test(label)) return Sparkles;
  if (/efetivo|defesa/i.test(label)) return Shield;
  if (/boa|bom|^A |^B /.test(label)) return CheckCheck;
  if (/individual|simples ·/i.test(label)) return UserRound;
  if (/duplo|triplo|ensaiada/i.test(label)) return UsersRound;
  return fieldIcon(label);
}
export function AssessmentSelect({
  label,
  value,
  options,
  onChange,
  hint,
  inline = false,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
  hint?: string;
  inline?: boolean;
}) {
  const Icon = fieldIcon(label);
  const cards = (
    <div className="assessment-choice-grid" role="group" aria-label={label}>
      {Object.entries(options).map(([id, text]) => {
        const ChoiceIcon = choiceIcon(id, text);
        return (
          <button
            type="button"
            key={id}
            aria-label={`${label}: ${text}`}
            aria-pressed={value === id}
            onClick={(e) => {
              onChange(id);
              if (!inline) {
                const details = e.currentTarget.closest("details");
                if (details) {
                  details.open = false;
                  details.querySelector("summary")?.focus();
                }
              }
            }}
          >
            <ChoiceIcon size={19} aria-hidden="true" />
            <span>{text}</span>
          </button>
        );
      })}
    </div>
  );
  if (inline)
    return (
      <div className="assessment-choice-inline">
        <div className="assessment-choice-title">
          <Icon size={18} aria-hidden="true" />
          <strong>{label}</strong>
        </div>
        {cards}
        {hint && <small className="assessment-choice-hint">{hint}</small>}
      </div>
    );
  return (
    <details className="assessment-choice">
      <summary>
        <Icon size={18} aria-hidden="true" />
        <strong>{label}</strong>
        <small>{options[value] ?? "Escolher"}</small>
        <ChevronDown
          size={16}
          className="assessment-choice-chevron"
          aria-hidden="true"
        />
      </summary>
      {cards}
      {hint && <p className="assessment-choice-hint">{hint}</p>}
    </details>
  );
}
