import type { ArchivedGame, Match, MatchVideo } from "./model";
export const videoKinds = {
  live: "Transmissão ao vivo",
  replay: "Gravação",
  highlights: "Melhores momentos",
};
export function youtubeLink(input: string) {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Cole o link completo do vídeo no YouTube.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use um link do YouTube.");
  const host = url.hostname.toLowerCase();
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/")[1];
  else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "www.youtube-nocookie.com",
    ].includes(host)
  ) {
    const path = url.pathname.split("/");
    id =
      url.pathname === "/watch"
        ? (url.searchParams.get("v") ?? "")
        : ["live", "embed", "shorts"].includes(path[1])
          ? (path[2] ?? "")
          : "";
  }
  if (!/^[\w-]{11}$/.test(id))
    throw new Error(
      "Use o link de um vídeo ou live específica, não o endereço do canal.",
    );
  const time =
    url.searchParams.get("t") ??
    url.searchParams.get("start") ??
    new URLSearchParams(url.hash.slice(1)).get("t") ??
    "0";
  let startSeconds = 0;
  if (/^\d+$/.test(time)) startSeconds = Number(time);
  else {
    const match = time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match || !time) throw new Error("O horário do link é inválido.");
    startSeconds =
      Number(match[1] ?? 0) * 3600 +
      Number(match[2] ?? 0) * 60 +
      Number(match[3] ?? 0);
  }
  if (!Number.isSafeInteger(startSeconds) || startSeconds > 86400)
    throw new Error("O início do vídeo deve estar entre 0 e 86400 segundos.");
  return { youtubeId: id, startSeconds };
}
export function validVideos(value: unknown): value is MatchVideo[] | undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 20) return false;
  const ids = new Set<string>();
  return value.every((v) => {
    if (
      typeof v !== "object" ||
      v === null ||
      Object.keys(v).some(
        (k) =>
          !["id", "title", "youtubeId", "startSeconds", "kind", "set"].includes(
            k,
          ),
      )
    )
      return false;
    if (
      !v ||
      typeof v.id !== "string" ||
      !v.id ||
      v.id.length > 80 ||
      ids.has(v.id) ||
      typeof v.title !== "string" ||
      !v.title.trim() ||
      v.title.length > 180 ||
      typeof v.youtubeId !== "string" ||
      !/^[\w-]{11}$/.test(v.youtubeId) ||
      !Number.isInteger(v.startSeconds) ||
      v.startSeconds < 0 ||
      v.startSeconds > 86400 ||
      !Object.hasOwn(videoKinds, v.kind) ||
      (v.set !== undefined &&
        (!Number.isInteger(v.set) || v.set < 1 || v.set > 5))
    )
      return false;
    ids.add(v.id);
    return true;
  });
}
export const watchUrl = (v: MatchVideo) =>
  `https://www.youtube.com/watch?v=${v.youtubeId}${v.startSeconds ? "&t=" + v.startSeconds + "s" : ""}`;
export const embedUrl = (v: MatchVideo) =>
  `https://www.youtube-nocookie.com/embed/${v.youtubeId}?start=${v.startSeconds}&playsinline=1&autoplay=0&rel=0`;
export function attachArchiveVideos(
  match: Match,
  id: string,
  videos: MatchVideo[],
): Match {
  if (!validVideos(videos)) throw new Error("Vídeos inválidos.");
  if (!match.history?.some((g) => g.id === id))
    throw new Error("Partida não encontrada no histórico.");
  return {
    ...match,
    history: match.history.map((g) =>
      g.id === id
        ? {
            ...g,
            videos,
            publicData: g.publicData ? { ...g.publicData, videos } : undefined,
          }
        : g,
    ),
  };
}
export const archiveVideos = (game: ArchivedGame) =>
  game.videos ?? game.publicData?.videos ?? [];
