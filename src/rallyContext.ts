import type { Projection, SkillEvent } from "./model";
import { passFor } from "./actionQuality";

/** Only opt-in live events inherit context; archived/manual assessments stay intact. */
export function withRallyContext(
  state: Projection,
  event: SkillEvent,
): SkillEvent {
  if (event.assessment?.rallyContext !== "auto") return event;
  const previous = state.events
    .filter((e) => e.set === state.set && e.rally === state.rally)
    .at(-1);
  const criteria = { ...event.assessment.criteria };
  let setTypeSource = event.assessment.setTypeSource;
  if (event.skill === "set") {
    delete criteria.incomingPass;
    if (previous && ["reception", "defense"].includes(previous.skill)) {
      const pass = passFor(previous);
      if (pass !== "error") criteria.incomingPass = pass;
    }
  }
  if (event.skill === "attack") {
    if (setTypeSource === "rally") delete criteria.setType;
    setTypeSource = undefined;
    if (previous?.skill === "set" && previous.assessment?.criteria?.setType) {
      criteria.setType = previous.assessment.criteria.setType;
      setTypeSource = "rally";
    }
  }
  return {
    ...event,
    assessment: { ...event.assessment, criteria, setTypeSource },
  };
}
