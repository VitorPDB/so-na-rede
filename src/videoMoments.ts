import { type RecordedEvent, type SkillEvent, resultOf, skills } from "./model";
import { effectiveDifficulty } from "./criteria";

export function specialMarks(event: SkillEvent) {
  return {
    magic: event.assessment?.tags.includes("magic") ?? false,
    emergency: !!event.assessment && effectiveDifficulty(event) === "emergency",
  };
}
export type VideoMoment = {
  id: string;
  playerIds: string[];
  label: string;
  set: number;
  rally: number;
  videoTimestampMs: number;
  videoSource?: string;
  rallyPlayerIds?: string[];
  skill?: SkillEvent["skill"];
  magic?: boolean;
  emergency?: boolean;
  pointWon?: boolean;
};
export function videoMoments(events: RecordedEvent[]): VideoMoment[] {
  const actors = new Map<string, Set<string>>();
  for (const e of events) {
    const key = `${e.set}:${e.rally}`;
    const ids = actors.get(key) ?? new Set<string>();
    for (const id of [
      e.playerId,
      ...(e.participants ?? []).map((p) => p.playerId),
    ])
      if (id) ids.add(id);
    actors.set(key, ids);
  }
  return events
    .filter((e) => e.videoTimestampMs !== undefined)
    .map((e) => ({
      id: e.id,
      skill: e.skill,
      pointWon: resultOf(e).winner === "ours",
      ...specialMarks(e),
      rallyPlayerIds: [...(actors.get(`${e.set}:${e.rally}`) ?? [])],
      playerIds: [
        ...new Set(
          [e.playerId, ...(e.participants ?? []).map((p) => p.playerId)].filter(
            (id): id is string => !!id,
          ),
        ),
      ],
      label: [
        skills[e.skill].label,
        specialMarks(e).magic ? "Tirou da cartola" : "",
        specialMarks(e).emergency ? "Emergência" : "",
      ]
        .filter(Boolean)
        .join(" · "),
      set: e.set,
      rally: e.rally,
      videoTimestampMs: e.videoTimestampMs!,
      ...(e.videoSource ? { videoSource: e.videoSource } : {}),
    }));
}
export function youtubeSourceId(source?: string) {
  return /^youtube:[\w-]{11}$/.test(source ?? "")
    ? source!.slice(8)
    : undefined;
}
export function formatVideoTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function validVideoMoments(value: unknown): value is VideoMoment[] {
  return (
    Array.isArray(value) &&
    value.length <= 10000 &&
    value.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        m.id.length <= 100 &&
        typeof m.label === "string" &&
        m.label.length <= 180 &&
        Array.isArray(m.playerIds) &&
        m.playerIds.length <= 30 &&
        m.playerIds.every(
          (id: unknown) => typeof id === "string" && id.length <= 80,
        ) &&
        Number.isInteger(m.set) &&
        m.set >= 1 &&
        m.set <= 5 &&
        Number.isInteger(m.rally) &&
        m.rally >= 1 &&
        Number.isFinite(m.videoTimestampMs) &&
        m.videoTimestampMs >= 0 &&
        (m.rallyPlayerIds === undefined ||
          (Array.isArray(m.rallyPlayerIds) &&
            m.rallyPlayerIds.length <= 30 &&
            m.rallyPlayerIds.every(
              (id: unknown) => typeof id === "string" && id.length <= 80,
            ))) &&
        (m.skill === undefined || Object.hasOwn(skills, m.skill)) &&
        (m.pointWon === undefined || typeof m.pointWon === "boolean") &&
        (m.magic === undefined || typeof m.magic === "boolean") &&
        (m.emergency === undefined || typeof m.emergency === "boolean") &&
        (m.videoSource === undefined ||
          (typeof m.videoSource === "string" && m.videoSource.length <= 600)),
    )
  );
}
export type MomentFilter = {
  player?: string;
  partner?: string;
  mode?: "action" | "rally";
  set?: number;
  skill?: string;
  special?: string;
};
// Call for a single match, so identical set/rally numbers never join different games.
export function filterVideoMoments(
  moments: VideoMoment[],
  filter: MomentFilter,
) {
  const groups = new Map<string, Set<string>>();
  for (const m of moments) {
    const key = `${m.set}:${m.rally}`;
    const actors = groups.get(key) ?? new Set<string>();
    for (const id of m.rallyPlayerIds ?? m.playerIds) actors.add(id);
    groups.set(key, actors);
  }
  const players = [filter.player, filter.partner].filter(
    (id): id is string => !!id,
  );
  return moments.filter((m) => {
    const actors =
      filter.mode === "rally" && players.length > 1
        ? groups.get(`${m.set}:${m.rally}`)!
        : new Set(m.playerIds);
    return (
      players.every((id) => actors.has(id)) &&
      (!filter.set || m.set === filter.set) &&
      (!filter.skill || m.skill === filter.skill) &&
      (!filter.special ||
        (filter.special === "point"
          ? m.pointWon
          : filter.special === "magic"
            ? m.magic
            : m.emergency) === true)
    );
  });
}
