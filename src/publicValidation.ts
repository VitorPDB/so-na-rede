import { analysisFields, validCriteriaData } from "./criteriaStats";
import { validVideos } from "./videos";
import type { PublicSnapshot, PublicMedia } from "./publicSnapshot";

export type Schema = {
  type: "object" | "array" | "string" | "number" | "boolean";
  nullable?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  pattern?: string;
  enum?: (string | number)[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  additional?: Schema;
};
const str = (max = 180, nullable = false): Schema => ({
  type: "string",
  min: 1,
  max,
  nullable,
});
const num = (max = 1_000_000, min = 0): Schema => ({
  type: "number",
  integer: true,
  min,
  max,
});
const bool: Schema = { type: "boolean" };
const id: Schema = { ...str(80), pattern: "^[A-Za-z0-9_-]+$" };
const list = (items: Schema, max: number, min = 0): Schema => ({
  type: "array",
  items,
  min,
  max,
});
const obj = (
  properties: Record<string, Schema>,
  optional: string[] = [],
): Schema => ({
  type: "object",
  properties,
  required: Object.keys(properties).filter((k) => !optional.includes(k)),
  max: 100,
});
const side: Schema = { type: "string", enum: ["ours", "theirs"] };
const score = list(num(1000), 2, 2);
const rotation = obj({
  p: num(6, 1),
  won: num(),
  lost: num(),
  receiving: num(),
  sideouts: num(),
});
const detail = {
  ...obj({ label: str(180), reason: str(500) }),
  nullable: true,
};
const stats = obj({
  rating: { type: "number", min: 0, max: 10, nullable: true },
  count: num(),
  points: num(),
  errors: num(),
  best: detail,
  worst: detail,
  metrics: list(
    obj({
      skill: {
        type: "string",
        enum: ["serve", "reception", "defense", "set", "attack", "block"],
      },
      label: str(),
      count: num(),
      successes: num(),
      errors: num(),
      quality: { type: "number", min: 0, max: 1 },
    }),
    6,
  ),
});
const cube = list(
  obj({
    skill: {
      type: "string",
      enum: ["serve", "reception", "defense", "set", "attack", "block"],
    },
    key: { type: "string", enum: analysisFields.map((f) => f.key) },
    total: num(),
    rows: list(
      obj({
        id: {
          type: "string",
          enum: [
            ...new Set(analysisFields.flatMap((f) => Object.keys(f.options))),
          ],
        },
        count: num(),
        rated: num(),
        qualitySum: { type: "number", min: 0, max: 1_000_000 },
      }),
      40,
    ),
  }),
  analysisFields.length * 6,
);
const technical = obj({
  version: { type: "number", enum: [1] },
  team: cube,
  players: list(obj({ id, data: cube }), 30),
});
const video = obj(
  {
    id,
    title: str(180),
    youtubeId: { ...str(11), pattern: "^[A-Za-z0-9_-]{11}$" },
    startSeconds: num(86400),
    kind: { type: "string", enum: ["live", "replay", "highlights"] },
    set: num(5, 1),
  },
  ["set"],
);
const period = obj(
  {
    set: num(5, 1),
    score,
    teamStats: stats,
    highlight: { ...id, nullable: true },
    attention: { ...id, nullable: true },
    provisional: bool,
    players: list(obj({ id, stats }), 30),
    rotations: list(rotation, 6),
    technical,
  },
  ["technical"],
);
export const snapshotSchema = obj(
  {
    version: { type: "number", enum: [1] },
    matchId: id,
    playedAt: {
      ...str(40, true),
      pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.+-]+Z?$",
    },
    team: str(),
    opponent: str(),
    set: num(5, 1),
    score,
    sets: list(num(3), 2, 2),
    server: side,
    finished: bool,
    setFinished: bool,
    p: num(6),
    teamStats: stats,
    highlight: { ...id, nullable: true },
    attention: { ...id, nullable: true },
    provisional: bool,
    players: list(
      obj({ id, name: str(100), number: num(99, 1), stats, zone: num(6) }),
      30,
      6,
    ),
    rallies: list(
      obj({
        set: num(5, 1),
        rally: num(1000, 1),
        score,
        winner: side,
        p: num(6),
      }),
      2000,
    ),
    rotations: list(rotation, 6),
    timeouts: list(
      obj({ set: num(5, 1), rally: num(1000, 1), score, side }),
      30,
    ),
    periods: list(period, 5, 1),
    videos: list(video, 20),
    technical,
  },
  ["videos", "technical"],
);
export const mediaSchema = obj({
  photos: {
    type: "object",
    max: 30,
    pattern: "^[A-Za-z0-9_-]{1,80}$",
    additional: obj({
      dataUrl: {
        ...str(160000),
        pattern: "^data:image/jpeg;base64,[A-Za-z0-9+/=]+$",
      },
      x: { type: "number", min: 0, max: 100 },
      y: { type: "number", min: 0, max: 100 },
      zoom: { type: "number", min: 1, max: 3 },
    }),
  },
  opponentLogo: {
    ...str(200000, true),
    pattern: "^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$",
  },
});
export function matchesSchema(
  value: unknown,
  schema: Schema,
  depth = 0,
): boolean {
  if (depth > 16) return false;
  if (value === null) return schema.nullable === true;
  if (schema.enum && !schema.enum.includes(value as string)) return false;
  if (schema.type === "number")
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (!schema.integer || Number.isInteger(value)) &&
      value >= (schema.min ?? -Infinity) &&
      value <= (schema.max ?? Infinity)
    );
  if (schema.type === "boolean") return typeof value === "boolean";
  if (schema.type === "string")
    return (
      typeof value === "string" &&
      value.length >= (schema.min ?? 0) &&
      value.length <= (schema.max ?? Infinity) &&
      (!schema.pattern || new RegExp(schema.pattern).test(value))
    );
  if (schema.type === "array")
    return (
      Array.isArray(value) &&
      value.length >= (schema.min ?? 0) &&
      value.length <= (schema.max ?? Infinity) &&
      value.every((v) => matchesSchema(v, schema.items!, depth + 1))
    );
  if (typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>,
    keys = Object.keys(v);
  return (
    keys.length <= (schema.max ?? Infinity) &&
    (schema.required ?? []).every((k) => Object.hasOwn(v, k)) &&
    keys.every((k) => {
      const child = schema.properties?.[k] ?? schema.additional;
      return (
        Boolean(child) &&
        (!schema.additional ||
          !schema.pattern ||
          new RegExp(schema.pattern).test(k)) &&
        matchesSchema(v[k], child!, depth + 1)
      );
    })
  );
}
export const validMatchId = (value: string | null) =>
  value !== null && /^[A-Za-z0-9_-]{1,80}$/.test(value);
export function validPublicSnapshot(value: unknown): value is PublicSnapshot {
  if (
    !matchesSchema(value, snapshotSchema) ||
    JSON.stringify(value).length > 1_048_576
  )
    return false;
  const s = value as PublicSnapshot;
  return (
    validVideos(s.videos) &&
    (!s.technical || validCriteriaData(s.technical)) &&
    s.periods.every((p) => !p.technical || validCriteriaData(p.technical))
  );
}
export function validPublicMedia(value: unknown): value is PublicMedia {
  return (
    matchesSchema(value, mediaSchema) &&
    JSON.stringify(value).length <= 5_242_880
  );
}
