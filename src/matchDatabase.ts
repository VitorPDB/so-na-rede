import type { Match } from "./model";

// Private disk format. Exported JSON and Supabase continue using the full Match.
type Ref = { $matchDocument: string } | { $matchAsset: string };
type Head = { token: string; document: string; previous?: string };
type RecordValue = { id: string; value: unknown };
const DB = "so-na-rede-matches-v2";
export function sameStoredContent(a: unknown, b: unknown): boolean {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sorted)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([, value]) => value !== undefined)
              .sort(([x], [y]) => x.localeCompare(y))
              .map(([key, value]) => [key, sorted(value)]),
          )
        : v;
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
}
let opening: Promise<IDBDatabase> | undefined;
function open() {
  return (opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("documents", { keyPath: "id" });
      r.result.createObjectStore("assets", { keyPath: "id" });
      r.result.createObjectStore("meta");
    };
    r.onsuccess = () => {
      r.result.onversionchange = () => {
        r.result.close();
        opening = undefined;
      };
      resolve(r.result);
    };
    r.onerror = () => {
      opening = undefined;
      reject(r.error);
    };
    r.onblocked = () => {
      opening = undefined;
      reject(Error("Feche as outras abas do scout e tente novamente."));
    };
  }));
}
function request<T>(r: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function get<T>(store: string, id: string) {
  return request(
    (await open()).transaction(store).objectStore(store).get(id),
  ) as Promise<T | undefined>;
}
async function hash(raw: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function readMatchDocument(
  id: string,
  full = true,
): Promise<Match> {
  const stored = await get<RecordValue>("documents", id);
  if (!stored)
    throw Error(
      "Cópia integral ausente no aparelho. Importe o backup JSON desta partida.",
    );
  const decode = async (value: unknown): Promise<unknown> => {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return Promise.all(value.map(decode));
    const o = value as Record<string, unknown>;
    if (typeof o.$matchDocument === "string")
      return readMatchDocument(o.$matchDocument, full);
    if (typeof o.$matchAsset === "string") {
      const asset = await get<RecordValue>("assets", o.$matchAsset);
      if (!asset)
        throw Error("Foto ausente na cópia local. Importe o backup JSON.");
      return asset.value;
    }
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(o)) {
      if (
        !full &&
        key === "fullMatch" &&
        child &&
        typeof child === "object" &&
        "$matchDocument" in child
      ) {
        result.localSource = (
          child as Ref & { $matchDocument: string }
        ).$matchDocument;
      } else result[key] = await decode(child);
    }
    return result;
  };
  return (await decode(stored.value)) as Match;
}
export async function readDatabaseMatch() {
  const head = await get<Head>("meta", "head");
  if (!head) return;
  try {
    return {
      head,
      match: await readMatchDocument(head.document, false),
      recovered: false,
    };
  } catch (error) {
    if (!head.previous) throw error;
    return {
      head,
      match: await readMatchDocument(head.previous, false),
      recovered: true,
    };
  }
}
export async function databaseToken() {
  return (await get<Head>("meta", "head"))?.token;
}
export async function expandMatch(match: Match): Promise<Match> {
  if (!match.history?.some((g) => g.localSource)) return match;
  return {
    ...match,
    history: await Promise.all(
      match.history.map(async (game) => {
        const { localSource, ...rest } = game;
        return localSource
          ? {
              ...rest,
              fullMatch:
                game.fullMatch ?? (await readMatchDocument(localSource)),
            }
          : rest;
      }),
    ),
  };
}
export async function writeDatabaseMatch(
  match: Match,
  expectedToken?: string,
  priorCopy?: Match,
) {
  const documents = new Map<string, unknown>(),
    assets = new Map<string, string>();
  const encode = async (value: unknown): Promise<unknown> => {
    if (typeof value === "string" && value.startsWith("data:image/")) {
      const id = await hash(value);
      assets.set(id, value);
      return { $matchAsset: id };
    }
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return Promise.all(value.map(encode));
    const o = value as Record<string, unknown>,
      result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(o)) {
      if (key === "localSource") continue;
      if (key === "fullMatch" && child)
        result[key] = { $matchDocument: await document(child) };
      else result[key] = await encode(child);
    }
    if (typeof o.localSource === "string" && !o.fullMatch)
      result.fullMatch = { $matchDocument: o.localSource };
    return result;
  };
  const document = async (value: unknown) => {
    const encoded = await encode(value),
      id = await hash(JSON.stringify(encoded));
    documents.set(id, encoded);
    return id;
  };
  const priorDocument = priorCopy ? await document(priorCopy) : undefined;
  const id = await document(match),
    db = await open();
  return new Promise<Head>((resolve, reject) => {
    const tx = db.transaction(["documents", "assets", "meta"], "readwrite");
    let next: Head,
      conflict = false;
    let failure: unknown;
    const r = tx.objectStore("meta").get("head");
    r.onsuccess = () => {
      const before = r.result as Head | undefined;
      if (before?.token !== expectedToken) {
        conflict = true;
        tx.abort();
        return;
      }
      next = {
        token: crypto.randomUUID(),
        document: id,
        previous:
          before?.document === id
            ? before.previous
            : (before?.document ?? priorDocument),
      };
      try {
        for (const [key, value] of documents)
          tx.objectStore("documents").put({ id: key, value });
        for (const [key, value] of assets)
          tx.objectStore("assets").put({ id: key, value });
        tx.objectStore("meta").put(next, "head");
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(next);
    tx.onerror = tx.onabort = () =>
      reject(
        conflict
          ? Error(
              "O jogo foi alterado em outra aba. Recarregue esta aba antes de continuar.",
            )
          : (failure ??
              tx.error ??
              Error("Não foi possível salvar a partida neste aparelho.")),
      );
  });
}
// Only unreachable versions are collected. Current + previous source trees and
// all referenced historical games/photos remain complete.
export async function compactMatchDatabase() {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["documents", "assets", "meta"], "readwrite");
    const headRequest = tx.objectStore("meta").get("head");
    const docsRequest = tx.objectStore("documents").getAll();
    const assetsRequest = tx.objectStore("assets").getAllKeys();
    assetsRequest.onsuccess = () => {
      const head = headRequest.result as Head | undefined;
      if (!head) return;
      const docs = new Map(
        (docsRequest.result as RecordValue[]).map((r) => [r.id, r.value]),
      );
      const usedDocs = new Set<string>(),
        usedAssets = new Set<string>();
      const markDoc = (id: string) => {
        if (usedDocs.has(id)) return;
        usedDocs.add(id);
        walk(docs.get(id));
      };
      const walk = (v: unknown) => {
        if (!v || typeof v !== "object") return;
        const o = v as Record<string, unknown>;
        if (typeof o.$matchDocument === "string") markDoc(o.$matchDocument);
        else if (typeof o.$matchAsset === "string")
          usedAssets.add(o.$matchAsset);
        else Object.values(o).forEach(walk);
      };
      markDoc(head.document);
      if (head.previous) markDoc(head.previous);
      for (const id of docs.keys())
        if (!usedDocs.has(id)) tx.objectStore("documents").delete(id);
      for (const id of assetsRequest.result)
        if (!usedAssets.has(String(id))) tx.objectStore("assets").delete(id);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
