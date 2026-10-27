// Public/offline cache is disposable: never compete with private editing data.
// Three known keys, at most ~256 KiB of UTF-16 text each.
export function savePublicCache(key: string, value: unknown) {
  try {
    const raw = JSON.stringify(value);
    if (raw.length > 128 * 1024) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, raw);
  } catch {
    /* Online reads remain available when optional cache cannot fit. */
  }
}
