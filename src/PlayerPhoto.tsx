import type { Player } from "./model";
export function Photo({
  player,
  className = "",
}: {
  player: Player;
  className?: string;
}) {
  return (
    <span className={"player-photo " + className}>
      {player.photo ? (
        <img
          src={player.photo.dataUrl}
          alt={"Foto de " + player.name}
          style={{
            objectPosition: `${player.photo.x}% ${player.photo.y}%`,
            transform: `scale(${player.photo.zoom})`,
            transformOrigin: `${player.photo.x}% ${player.photo.y}%`,
          }}
        />
      ) : (
        <span>{String(player.number).padStart(2, "0")}</span>
      )}
    </span>
  );
}
