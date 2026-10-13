import type { SkillEvent } from "./model";
/** A decisive fault changes one event, never appends an additional point. */
export function withDirectFault(event: SkillEvent): SkillEvent {
  const a = event.assessment;
  if (!a?.criteria?.faultType) return event;
  return {
    ...event,
    result: "simple_theirs",
    winner: "theirs",
    assessment: {
      ...a,
      execution: "error",
      responsibility: "wrong",
      criteria: {
        ...a.criteria,
        ...(event.skill === "block" ? { blockQuality: "error" as const } : {}),
      },
    },
    participants: event.participants?.map((p) =>
      p.playerId === event.playerId
        ? { ...p, responsibility: "wrong" as const }
        : p,
    ),
  };
}
