import { project, stats } from "./engine";
import { effectiveDifficulty } from "./criteria";
import { playerEvents } from "./assessment";
import { type Match, type Player, resultOf, ratingProfiles } from "./model";
export type CardMetric = { label: string; value: string };
export type SocialCardData = {
  player: Player;
  highlight?: boolean;
  date?: string;
  team: string;
  opponent: string;
  score: string;
  finished: boolean;
  rating: number | null;
  metrics: CardMetric[];
  note: string;
};
const pct = (n: number, d: number) =>
  d ? `${Math.round((n / d) * 100)}%` : "—";
export function socialCardData(
  match: Match,
  player: Player,
  state = project(match),
): SocialCardData {
  const rows = playerEvents(state.events, player.id);
  const summary = stats(
    rows,
    match.weights,
    match.ratingProfiles ?? ratingProfiles,
  );
  const by = (skill: string) => rows.filter((e) => e.skill === skill);
  const attacks = by("attack"),
    receptions = by("reception");
  const passes = receptions.filter((e) => e.assessment?.criteria?.passQuality);
  const winners = (skill: string) =>
    state.events.filter(
      (e) =>
        e.skill === skill &&
        resultOf(e).winner === "ours" &&
        (e.playerId === player.id ||
          (skill === "block" &&
            e.participants?.some(
              (p) =>
                p.playerId === player.id &&
                p.responsibility !== "none" &&
                p.responsibility !== "wrong",
            ))),
    ).length;
  const aces = winners("serve");
  const saves = by("defense").filter(
    (e) =>
      !resultOf(e).error &&
      e.assessment &&
      ["hard", "emergency"].includes(effectiveDifficulty(e)),
  ).length;
  const templates = {
    libero: (): CardMetric[] => [
      {
        label: "RECEPÇÃO POSITIVA",
        value: pct(
          passes.filter((e) =>
            ["A", "B"].includes(e.assessment!.criteria!.passQuality!),
          ).length,
          passes.length,
        ),
      },
      {
        label: "PASSE PERFEITO",
        value: pct(
          passes.filter((e) => e.assessment!.criteria!.passQuality === "A")
            .length,
          passes.length,
        ),
      },
      { label: "DEFESAS REGISTRADAS", value: String(by("defense").length) },
      {
        label: "ERROS DE RECEPÇÃO",
        value: String(receptions.filter((e) => resultOf(e).error).length),
      },
    ],
    offensive: (): CardMetric[] => [
      { label: "PONTOS", value: String(summary.points) },
      {
        label: aces ? "ACES" : "SALVADAS DIFÍCEIS",
        value: String(aces || saves),
      },
      { label: "BLOQUEIOS PONTUADOS", value: String(winners("block")) },
      {
        label: "PRECISÃO DE ATAQUE",
        value: pct(
          attacks.length - attacks.filter((e) => resultOf(e).error).length,
          attacks.length,
        ),
      },
    ],
  };
  return {
    player,
    highlight: match.socialHighlightPlayerId === player.id,
    date: match.matchDate ?? match.audit[0]?.createdAt?.slice(0, 10),
    team: match.team,
    opponent: match.opponent,
    score: state.sets.join(" × "),
    finished: state.finished,
    rating: summary.rating,
    metrics: templates[player.libero ? "libero" : "offensive"](),
    note: player.libero
      ? `${passes.length}/${receptions.length} recepções com ABC · nota de passe ${stats(receptions, match.weights).rating?.toFixed(1) ?? "—"}`
      : `${attacks.length} ataques · ${summary.errors} erros · ${summary.count} ações`,
  };
}
export function validSocialCardData(v: unknown): v is SocialCardData {
  const x = v as SocialCardData;
  const str = (s: unknown, max = 180) =>
    typeof s === "string" && s.length <= max;
  return (
    !!x &&
    (x.highlight === undefined || typeof x.highlight === "boolean") &&
    (x.date === undefined || str(x.date, 30)) &&
    str(x.team) &&
    str(x.opponent) &&
    str(x.score, 40) &&
    typeof x.finished === "boolean" &&
    (x.rating === null ||
      (Number.isFinite(x.rating) && x.rating! >= 0 && x.rating! <= 10)) &&
    str(x.note, 300) &&
    !!x.player &&
    str(x.player.id, 80) &&
    str(x.player.name, 100) &&
    Number.isInteger(x.player.number) &&
    typeof x.player.libero === "boolean" &&
    Array.isArray(x.player.positions) &&
    x.player.positions.length <= 10 &&
    x.player.positions.every((p) => str(p, 60)) &&
    (!x.player.photo ||
      (str(x.player.photo.dataUrl, 160000) &&
        /^data:image\/(png|jpeg|webp);base64,/.test(x.player.photo.dataUrl) &&
        [x.player.photo.x, x.player.photo.y, x.player.photo.zoom].every(
          Number.isFinite,
        ))) &&
    Array.isArray(x.metrics) &&
    x.metrics.length === 4 &&
    x.metrics.every((m) => m && str(m.label, 80) && str(m.value, 30))
  );
}

export function publicationCards(match: Match) {
  const state = project(match);
  return match.players.map((p) => {
    const card = socialCardData(match, p, state);
    const { photo: _photo, ...player } = card.player;
    return { ...card, player };
  });
}
