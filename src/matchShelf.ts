import type { Match } from "./model";
import { parseMatch } from "./storage";
export type ShelfCopy = {
  id: string;
  label: string;
  savedAt: string;
  raw: string;
};
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("so-na-rede-switch-backups", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("copies", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Não foi possível abrir as cópias locais. Exporte o JSON antes de trocar.",
        ),
      );
  });
}
export async function keepMatchCopy(match: Match) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("copies", "readwrite");
      tx.objectStore("copies").put({
        id: crypto.randomUUID(),
        label: `${match.team} × ${match.opponent}`,
        savedAt: new Date().toISOString(),
        raw: JSON.stringify(match),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(
          new Error(
            "Sem espaço para proteger a partida atual. Exporte o JSON antes de trocar.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function matchCopies(): Promise<ShelfCopy[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("copies").objectStore("copies").getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as ShelfCopy[]).sort((a, b) =>
            b.savedAt.localeCompare(a.savedAt),
          ),
        );
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
export function readShelfCopy(copy: ShelfCopy) {
  return parseMatch(copy.raw);
}
