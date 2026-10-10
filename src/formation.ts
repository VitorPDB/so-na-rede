import { p1Roles, type Role, type Zone, type Player } from "./model";

// P labels indicate setter zone; clockwise side-out moves P1 to P6.
export function formationAt(base: string[], setterZone: Zone) {
  const offset = (7 - setterZone) % 6;
  return {
    lineup: base.map((_, i) => base[(i + offset) % 6]),
    roles: p1Roles.map((_, i) => p1Roles[(i + offset) % 6]),
  };
}
export function toP1(lineup: string[], setterZone: number) {
  return lineup.map((_, i) => lineup[(i + setterZone - 1) % 6]);
}
// Old games retain their historical lineup; infer only their original roles.
export function legacyRoles(lineup: string[], players: Player[]): Role[] {
  const setter = lineup.findIndex(
    (id) => players.find((p) => p.id === id)?.positions[0] === "Levantador",
  );
  return setter >= 0
    ? formationAt(toP1(lineup, setter + 1), (setter + 1) as Zone).roles
    : lineup.map((id) => {
        const position = players.find((p) => p.id === id)?.positions[0];
        return position === "Central"
          ? "middle"
          : position === "Oposto"
            ? "opposite"
            : "outside";
      });
}
