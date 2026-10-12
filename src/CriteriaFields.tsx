import type { AssessmentCriteria, Skill, SkillEvent } from "./model";
import { criteriaFields } from "./criteria";
import { AssessmentSelect } from "./AssessmentSelect";
import { compatibleQuality } from "./actionQuality";
export function CriteriaFields({
  skill,
  value = {},
  onChange,
  hidePass = false,
  onlyQuality = false,
  hideQuality = false,
  event,
  inlineQuality = false,
}: {
  skill: Skill;
  value?: AssessmentCriteria;
  onChange: (value: AssessmentCriteria) => void;
  hidePass?: boolean;
  onlyQuality?: boolean;
  hideQuality?: boolean;
  event?: SkillEvent;
  inlineQuality?: boolean;
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
          return (
            <div className="criterion-field" key={field.key}>
              <AssessmentSelect
                label={field.label}
                value={value[field.key] ?? ""}
                inline={inlineQuality}
                options={
                  event && ["passQuality", "blockQuality"].includes(field.key)
                    ? compatibleQuality(event, field.key, field.options)
                    : { "": "Não informado", ...field.options }
                }
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
