import type { Match, SkillEvent } from "./model";
import { project } from "./engine";
export function addFunnyMoment(
  match: Match,
  stamp: Pick<SkillEvent, "videoTimestampMs" | "videoSource">,
): Match {
  if (
    !Number.isFinite(stamp.videoTimestampMs) ||
    stamp.videoTimestampMs! < 0 ||
    !stamp.videoSource
  )
    throw new Error("Selecione o vídeo antes de marcar o momento.");
  if ((match.funnyMoments?.length ?? 0) >= 1000)
    throw new Error("Limite de 1.000 momentos por partida atingido.");
  const state = project(match);
  return {
    ...match,
    funnyMoments: [
      ...(match.funnyMoments ?? []),
      {
        id: crypto.randomUUID(),
        label: "Momento engraçado",
        playerIds: [],
        rallyPlayerIds: [],
        pointWon: false,
        magic: false,
        emergency: false,
        set: state.set,
        rally: state.rally,
        videoTimestampMs: stamp.videoTimestampMs!,
        videoSource: stamp.videoSource,
      },
    ],
  };
}
