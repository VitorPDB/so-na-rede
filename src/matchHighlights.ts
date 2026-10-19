import { resultOf, type RecordedEvent } from "./model";

export function matchHighlights(events: RecordedEvent[]) {
  const scorers = new Map<
    string,
    { player: string; attacks: number; aces: number }
  >();
  const pairs = new Map<
    string,
    { players: string[]; count: number; points: number; useful: number }
  >();
  const partnerships = new Map<
    string,
    { setter: string; attacker: string; count: number; points: number }
  >();
  let previous: RecordedEvent | undefined;
  for (const e of events) {
    const point = (e.winner ?? resultOf(e).winner) === "ours";
    if (e.playerId) {
      const row = scorers.get(e.playerId) ?? {
        player: e.playerId,
        attacks: 0,
        aces: 0,
      };
      if (point && e.skill === "attack") row.attacks++;
      if (point && e.skill === "serve") row.aces++;
      scorers.set(e.playerId, row);
    }
    const players = [
      ...new Set(
        [e.playerId, ...(e.participants ?? []).map((p) => p.playerId)].filter(
          (p): p is string => !!p,
        ),
      ),
    ].sort();
    if (
      e.skill === "block" &&
      players.length === 2 &&
      e.assessment?.group !== "triple"
    ) {
      const key = JSON.stringify(players);
      const row = pairs.get(key) ?? { players, count: 0, points: 0, useful: 0 };
      row.count++;
      if (point) row.points++;
      if (
        ["effective", "simple"].includes(
          e.assessment?.criteria?.blockQuality ?? "",
        )
      )
        row.useful++;
      pairs.set(key, row);
    }
    if (
      e.skill === "attack" &&
      e.playerId &&
      previous?.skill === "set" &&
      previous.playerId &&
      previous.set === e.set &&
      previous.rally === e.rally &&
      !(previous.winner ?? resultOf(previous).winner) &&
      previous.assessment?.criteria?.setType !== "setter_tip" &&
      !previous.assessment?.tags.includes("setter_tip")
    ) {
      const key = JSON.stringify([previous.playerId, e.playerId]);
      const row = partnerships.get(key) ?? {
        setter: previous.playerId,
        attacker: e.playerId,
        count: 0,
        points: 0,
      };
      row.count++;
      if (point) row.points++;
      partnerships.set(key, row);
    }
    previous = e;
  }
  return {
    scorers: [...scorers.values()],
    pairs: [...pairs.values()].sort(
      (a, b) => b.points - a.points || b.useful - a.useful,
    ),
    partnerships: [...partnerships.values()],
  };
}

export function validPartnerships(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= 900 &&
    value.every(
      (r) =>
        r &&
        typeof r.setter === "string" &&
        r.setter.length <= 80 &&
        typeof r.attacker === "string" &&
        r.attacker.length <= 80 &&
        Number.isSafeInteger(r.count) &&
        r.count > 0 &&
        Number.isSafeInteger(r.points) &&
        r.points >= 0 &&
        r.points <= r.count,
    )
  );
}
