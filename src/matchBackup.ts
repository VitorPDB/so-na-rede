// Independent recovery copy. The synchronous local save remains the commit barrier.
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("so-na-rede-recovery", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("matches");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Banco de recuperação ocupado."));
  });
}
let pending = Promise.resolve();
export function mirrorMatch(raw: string) {
  if (typeof indexedDB === "undefined") return;
  pending = pending.catch(() => {}).then(async () => {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("matches", "readwrite");
      const store = tx.objectStore("matches");
      const previous = store.get("latest");
      previous.onsuccess = () => {
        if (typeof previous.result === "string") store.put(previous.result, "previous");
        store.put(raw, "latest");
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
  // Optional redundancy cannot turn a successful synchronous save into a failure.
  void pending.catch(() => {});
}
export async function recoveryCopies(): Promise<string[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("matches", "readonly");
      const store = tx.objectStore("matches");
      const latest = store.get("latest"), previous = store.get("previous");
      tx.oncomplete = () => resolve([latest.result, previous.result].filter((v): v is string => typeof v === "string"));
      tx.onerror = () => reject(tx.error);
    });
  } catch { return []; }
}
