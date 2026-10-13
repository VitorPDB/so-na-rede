import { type SkillEvent, type Skill, resultOf } from "./model";
import { normalAssessment } from "./assessment";
export function actionIntent(event: SkillEvent) {
  if (["simple_gafe", "simple_C", "bad", "-"].includes(event.result))
    return "gafe";
  if (resultOf(event).error) return "error";
  return "good";
}
export function passFor(event: SkillEvent) {
  return (
    event.assessment?.criteria?.passQuality ??
    (event.result === "simple_A"
      ? "A"
      : actionIntent(event) === "gafe"
        ? "C"
        : actionIntent(event) === "error"
          ? "error"
          : "B")
  );
}
export function blockFor(event: SkillEvent) {
  return (
    event.assessment?.criteria?.blockQuality ??
    (actionIntent(event) === "gafe"
      ? "late"
      : actionIntent(event) === "error"
        ? "error"
        : resultOf(event).winner === "ours"
          ? "perfect"
          : "effective")
  );
}
export function executionFor(event: SkillEvent) {
  return (
    event.assessment?.execution ??
    (actionIntent(event) === "gafe"
      ? "poor"
      : actionIntent(event) === "error"
        ? "error"
        : resultOf(event).winner === "ours"
          ? "point"
          : "good")
  );
}
export function compatibleQuality(
  event: SkillEvent,
  field: string,
  options: Record<string, string>,
) {
  const intent = actionIntent(event);
  const allowed =
    field === "passQuality"
      ? intent === "good"
        ? ["A", "B"]
        : intent === "gafe"
          ? ["C"]
          : ["error"]
      : field === "blockQuality"
        ? intent === "good"
          ? ["perfect", "effective", "simple", "direction", "unrated"]
          : intent === "gafe"
            ? ["used", "late", "absent", "gap"]
            : ["error", "used", "late", "absent", "gap"]
        : intent === "good"
          ? [
              "good",
              "excellent",
              ...(resultOf(event).winner === "ours" ? ["point"] : []),
            ]
          : intent === "gafe"
            ? ["poor"]
            : ["error"];
  return Object.fromEntries(
    Object.entries(options).filter(([key]) => allowed.includes(key)),
  );
}
export function initialAssessment(skill: Skill, result: string) {
  const a = normalAssessment();
  const event: SkillEvent = { skill, result, assessment: a };
  if (["reception", "defense"].includes(skill))
    a.criteria = { passQuality: passFor(event) };
  if (skill === "block") a.criteria = { blockQuality: blockFor(event) };
  return a;
}
export function criteriaForResult(
  skill: Skill,
  result: string,
  criteria: NonNullable<SkillEvent["assessment"]>["criteria"] = {},
) {
  const next = { ...criteria },
    event: SkillEvent = { skill, result };
  if (next.faultType && actionIntent(event) !== "error") delete next.faultType;
  if (
    next.passQuality &&
    (next.passQuality !== "A" || actionIntent(event) !== "good")
  )
    delete next.passQuality;
  if (
    next.blockQuality &&
    !Object.hasOwn(
      compatibleQuality(event, "blockQuality", { [next.blockQuality]: "" }),
      next.blockQuality,
    )
  )
    delete next.blockQuality;
  return next;
}
