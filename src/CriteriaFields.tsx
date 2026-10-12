import { Hand, Target, Volleyball, Timer, Move, ArrowUp } from "lucide-react";
import type { AssessmentCriteria, Skill } from "./model";
import { criteriaFields } from "./criteria";
import { AssessmentSelect } from "./AssessmentSelect";
export function CriteriaFields({
  skill,
  value = {},
  onChange,
  hidePass = false,
  onlyQuality = false,
  hideQuality = false,
}: {
  skill: Skill;
  value?: AssessmentCriteria;
  onChange: (value: AssessmentCriteria) => void;
  hidePass?: boolean;
  onlyQuality?: boolean;
  hideQuality?: boolean;
}) {
  return (
    <div className="criteria-fields">
      {criteriaFields
        .filter(
          (f) =>
            f.skills.includes(skill) &&
            (!hidePass || f.key !== "passQuality") &&
            (!onlyQuality || ["passQuality", "blockQuality"].includes(f.key)) &&
            (!hideQuality || !["passQuality", "blockQuality"].includes(f.key)),
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
            <div className="criterion-field" key={field.key}>
              <span>
                <Icon size={17} aria-hidden="true" />
                {field.label}
              </span>
              <AssessmentSelect
                label={field.label}
                value={value[field.key] ?? ""}
                options={{ "": "Não informado", ...field.options }}
                hint={field.hint}
                onChange={(selected) => {
                  const next = { ...value };
                  if (selected) Object.assign(next, { [field.key]: selected });
                  else delete next[field.key];
                  onChange(next);
                }}
              />
            </div>
          );
        })}
    </div>
  );
}
