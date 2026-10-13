import type { AssessmentCriteria, Skill, SkillEvent } from "./model";
import { criteriaFields, setTypeOptions, incomingSetOptions } from "./criteria";
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
  hideIncomingPass = false,
  hideSetType = false,
}: {
  skill: Skill;
  value?: AssessmentCriteria;
  onChange: (value: AssessmentCriteria) => void;
  hidePass?: boolean;
  onlyQuality?: boolean;
  hideQuality?: boolean;
  event?: SkillEvent;
  inlineQuality?: boolean;
  hideIncomingPass?: boolean;
  hideSetType?: boolean;
}) {
  return (
    <div className="criteria-fields">
      {criteriaFields
        .filter(
          (f) =>
            f.skills.includes(skill) &&
            (!hidePass || f.key !== "passQuality") &&
            (!hideIncomingPass || f.key !== "incomingPass") &&
            (!hideSetType || f.key !== "setType") &&
            (!onlyQuality || ["passQuality", "blockQuality"].includes(f.key)) &&
            (!hideQuality || !["passQuality", "blockQuality"].includes(f.key)),
        )
        .map((field) => {
          return (
            <div className="criterion-field" key={field.key}>
              <AssessmentSelect
                label={
                  field.key === "setType" && skill === "set"
                    ? "Tipo de levantamento"
                    : field.label
                }
                value={value[field.key] ?? ""}
                selectedLabel={
                  (field.key === "incomingSet" &&
                    value.incomingSet &&
                    !Object.hasOwn(incomingSetOptions, value.incomingSet)) ||
                  (field.key === "setType" &&
                    value.setType &&
                    !Object.hasOwn(setTypeOptions, value.setType))
                    ? `${field.options[value[field.key]!]} · registro anterior`
                    : undefined
                }
                inline={inlineQuality}
                options={
                  event && ["passQuality", "blockQuality"].includes(field.key)
                    ? compatibleQuality(event, field.key, field.options)
                    : field.key === "incomingSet"
                      ? { "": "Não informado", ...incomingSetOptions }
                      : field.key === "setType"
                        ? { "": "Não informado", ...setTypeOptions }
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
