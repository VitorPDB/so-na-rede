const memory = new Map<string, number>();
export function videoPositionKey(
  match: string,
  set: number,
  source: string,
  start: number,
) {
  return JSON.stringify([match, set, source, start]);
}
export function readVideoPosition(key: string): number | undefined {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = sessionStorage.getItem("so-na-rede:video:" + key);
    if (raw === null) return;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  } catch {
    /* Memory fallback for restricted browsers. */
  }
}
export function saveVideoPosition(key: string, seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return;
  memory.set(key, seconds);
  try {
    sessionStorage.setItem("so-na-rede:video:" + key, String(seconds));
  } catch {
    /* In-memory fallback. */
  }
}
