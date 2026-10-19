export interface YoutubePlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  getVideoData(): { video_id?: string };
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}
type YoutubeAPI = {
  Player: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => YoutubePlayer;
};
declare global {
  interface Window {
    YT?: YoutubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let loading: Promise<YoutubeAPI> | undefined;
export function loadYoutubeAPI(): Promise<YoutubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.onYouTubeIframeAPIReady;
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      window.onYouTubeIframeAPIReady = previous;
      reject(
        new Error(
          "Não foi possível carregar o YouTube. Confira a conexão e tente novamente.",
        ),
      );
    };
    const timer = window.setTimeout(fail, 20000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      try {
        previous?.();
      } finally {
        window.YT?.Player ? resolve(window.YT) : fail();
      }
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
export function captureYoutubeMoment(player: YoutubePlayer, videoId: string) {
  if (
    player.getVideoData().video_id !== videoId ||
    ![1, 2, 4].includes(player.getPlayerState())
  )
    throw new Error(
      "Dê play na gravação antes de marcar. Aguarde o vídeo terminar de carregar.",
    );
  const seconds = player.getCurrentTime();
  if (!Number.isFinite(seconds) || seconds < 0)
    throw new Error("Horário do vídeo indisponível. Tente novamente.");
  const stamp = {
    videoTimestampMs: Math.round(seconds * 1000),
    videoSource: `youtube:${videoId}`,
  };
  player.pauseVideo();
  return stamp;
}
