import { MomentBrowser } from "./MomentBrowser";
import type { Match } from "./model";
import { project } from "./engine";
import { MatchVideoPlayer } from "./MatchVideos";
import { videoMoments } from "./videoMoments";

export function PlayerVideos({
  match,
  playerId,
}: {
  match: Match;
  playerId: string;
}) {
  const games = [
    {
      id: match.id,
      title: "Partida atual",
      videos: match.videos,
      moments: videoMoments(project(match).events),
    },
    ...(match.history ?? [])
      .filter(
        (g) =>
          g.id !== match.id &&
          g.players.some((p) => p.playerId === playerId && p.count > 0),
      )
      .map((g) => ({
        id: g.id,
        title: `${g.opponent} · ${g.date.slice(0, 10)}`,
        videos: g.videos,
        moments: g.videoMoments ?? [],
      })),
  ];
  return (
    <section className="ui-card player-videos">
      <h2>Vídeos e lances do jogador</h2>
      <p className="ui-note">
        Os lances são deste jogador, incluindo participação em bloqueios. As
        gravações completas são das partidas.
      </p>
      {games.map((g) => {
        const moments = g.moments.filter((m) => m.playerIds.includes(playerId));
        return (
          <details key={g.id} open={g.id === match.id}>
            <summary>
              {g.title} · {moments.length} lances com horário
            </summary>
            <MomentBrowser
              moments={g.moments}
              players={match.players}
              fixedPlayer={playerId}
            />
            <MatchVideoPlayer videos={g.videos} />
            {!g.videos?.length && (
              <p className="ui-note">
                Nenhum vídeo do YouTube anexado à partida.
              </p>
            )}
          </details>
        );
      })}
    </section>
  );
}
