import { Hand, Target, Volleyball, Timer, Move, ArrowUp } from "lucide-react";
import type { AssessmentCriteria, Skill } from "./model";
import { criteriaFields } from "./criteria";
export function CriteriaFields({
  skill,
  value = {},
  onChange,
  hidePass = false,
}: {
  skill: Skill;
  value?: AssessmentCriteria;
  onChange: (value: AssessmentCriteria) => void;
  hidePass?: boolean;
}) {
  return (
    <div className="criteria-fields">
      {criteriaFields
        .filter(
          (f) =>
            f.skills.includes(skill) && (!hidePass || f.key !== "passQuality"),
        )
        .map((field) => {
          const Icon =
            field.key === "technique"
              ? Hand
              : field.key === "gameMoment"
                ? Timer
                : field.key === "approach"
                  ? Move
                  : field.key === "setDirection"
                    ? ArrowUp
                    : field.key === "passQuality"
                      ? Target
                      : Volleyball;
          return (
            <label key={field.key}>
              <span>
                <Icon size={17} aria-hidden="true" />
                {field.label}
              </span>
              <select
                value={value[field.key] ?? ""}
                onChange={(e) => {
                  const next = { ...value };
                  if (e.target.value)
                    Object.assign(next, { [field.key]: e.target.value });
                  else delete next[field.key];
                  onChange(next);
                }}
              >
                <option value="">Não informado</option>
                {Object.entries(field.options).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <small>{field.hint}</small>
            </label>
          );
        })}
    </div>
  );
}
