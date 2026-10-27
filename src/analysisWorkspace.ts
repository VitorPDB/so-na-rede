import type { Match, ArchivedGame } from "./model";
import { project } from "./engine";
import { archiveGame } from "./career";
import { parseMatch } from "./storage";
import { matchCopies, readShelfCopy } from "./matchShelf";
import { readMatchDocument } from "./matchDatabase";
export function analysisWorkspace(current: Match, target: Match): Match {
  if (!project(current).finished)
    throw Error("Finalize a partida atual antes de analisar outra.");
  if (!project(target).finished)
    throw Error("A partida escolhida não está finalizada.");
  return {
    ...target,
    history: archiveGame(current).filter((g) => g.id !== target.id),
  };
}
export async function completeArchivedMatch(
  game: ArchivedGame,
): Promise<Match> {
  const accept = (m: Match) => m.id === game.id && project(m).finished;
  if (game.fullMatch && accept(game.fullMatch))
    return { ...game.fullMatch, videos: game.videos ?? game.fullMatch.videos };
  if (game.localSource) {
    const stored = parseMatch(
      JSON.stringify(await readMatchDocument(game.localSource)),
    );
    if (accept(stored))
      return { ...stored, videos: game.videos ?? stored.videos };
  }
  let local: Match | undefined;
  try {
    for (const copy of await matchCopies()) {
      try {
        const m = readShelfCopy(copy);
        if (accept(m)) {
          local = m;
          break;
        }
      } catch {
        /* Independent invalid copies do not invalidate the archive. */
      }
    }
  } catch {
    /* Try the synchronized account. */
  }
  const { cloud } = await import("./cloud");
  if (cloud) {
    try {
      const {
        data: { session },
      } = await cloud.auth.getSession();
      if (session) {
        const { data, error } = await cloud.rpc("scout_match_sync", {
          action: "read",
          game_id: game.id,
        });
        if (!error && data?.body) {
          const m = parseMatch(JSON.stringify(data.body));
          if (accept(m)) return { ...m, videos: game.videos ?? m.videos };
        }
      }
    } catch {
      /* Use a completed local copy when offline. */
    }
  }
  if (local) return { ...local, videos: game.videos ?? local.videos };
  throw Error(
    "Esta partida tem apenas um resumo. Abra o histórico e importe o JSON finalizado para recuperar a análise completa.",
  );
}
