// Run against Vite with an isolated browser. No user profile or real Supabase.
// PLAYWRIGHT_MODULE/BROWSER_EXECUTABLE can point to an existing local installation.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
const base = process.env.BASE_URL || "http://localhost:4176";
try {
  const context = await browser.newContext();
  await context.route("**/__storage_test__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Isolated storage test</title>",
    }),
  );
  const page = await context.newPage();
  await page.goto(base + "/__storage_test__");
  const before = await page.evaluate(async () => {
    const { newMatch } = await import("/src/model.ts");
    const { append } = await import("/src/engine.ts");
    const { archiveGame } = await import("/src/career.ts");
    const finish = (name) => {
      let m = { ...newMatch(), bestOf: 3, opponent: name };
      m.players = m.players.map((p, i) => ({
        ...p,
        photo: {
          dataUrl:
            "data:image/jpeg;base64," +
            String.fromCharCode(65 + i).repeat(50000),
          x: 50,
          y: 50,
          zoom: 1,
        },
      }));
      for (let set = 0; set < 2; set++) {
        for (let n = 0; n < 25; n++)
          m = append(m, { type: "point", winner: "ours" });
        if (!set)
          m = append(m, {
            type: "nextSet",
            lineup: m.initialLineup,
            server: "ours",
          });
      }
      return m;
    };
    const first = finish("Fixture A"),
      second = finish("Fixture B");
    second.history = archiveGame(first);
    const raw = JSON.stringify(second);
    window.original = second;
    localStorage.setItem("so-na-rede:match:v1", raw);
    localStorage.setItem("so-na-rede:match:v1:backup", raw);
    localStorage.setItem("so-na-rede:public-last", '{"disposable":true}');
    const start = performance.now();
    for (let i = 0; i < 20; i++) JSON.parse(raw);
    return {
      rawBytes: new Blob([raw]).size,
      localStorageTextBytes: raw.length * 4,
      parseMs: (performance.now() - start) / 20,
    };
  });
  const migrated = await page.evaluate(async () => {
    const storage = await import("/src/storage.ts");
    const db = await import("/src/matchDatabase.ts");
    const started = performance.now();
    await storage.initializeMatchStorage();
    const m = storage.loadMatch();
    if (!m?.history?.[0].localSource || m.history[0].fullMatch)
      throw Error("History not lazy");
    if (!db.sameStoredContent(await storage.expandMatch(m), window.original))
      throw Error("Migration changed data");
    if (localStorage.getItem("so-na-rede:match:v1"))
      throw Error("Legacy primary not released");
    const exported = JSON.stringify(await storage.expandMatch(m));
    storage.parseMatch(exported);
    if (exported.includes("localSource"))
      throw Error("Local references escaped export");
    const old = await import("/src/analysisWorkspace.ts");
    const full = await old.completeArchivedMatch(m.history[0]);
    if (full.opponent !== "Fixture A" || full.audit.length !== 51)
      throw Error("Historical analysis lost data");
    return {
      migrationMs: performance.now() - started,
      lazyJSONBytes: new Blob([JSON.stringify(m)]).size,
    };
  });
  // Flood the old small storage area: primary writes must still work in IndexedDB.
  await page.evaluate(async () => {
    let n = 0;
    try {
      while (n < 100)
        localStorage.setItem("unrelated-" + n++, "x".repeat(100000));
    } catch {}
    const s = await import("/src/storage.ts");
    let m = s.loadMatch();
    for (let i = 0; i < 25; i++) {
      const next = { ...m, socialHighlightPlayerId: m.players[i % 2].id };
      s.saveMatch(next, m);
      m = next;
    }
    await s.flushMatchStorage();
    if (s.matchStorageStatus().pending || s.matchStorageStatus().error)
      throw Error("Writes did not finish");
    await (await import("/src/matchDatabase.ts")).compactMatchDatabase();
  });
  await page.reload();
  const after = await page.evaluate(async () => {
    const s = await import("/src/storage.ts");
    await s.initializeMatchStorage();
    const m = s.loadMatch();
    if (m.socialHighlightPlayerId !== m.players[0].id)
      throw Error("Latest selection lost on reload");
    const full = await s.expandMatch(m);
    if (full.history[0].fullMatch.audit.length !== 51)
      throw Error("History lost on reload");
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("so-na-rede-matches-v2");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction(["assets", "documents"]);
    const a = tx.objectStore("assets").getAll(),
      d = tx.objectStore("documents").getAll();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    const bytes = new Blob([JSON.stringify(a.result), JSON.stringify(d.result)])
      .size;
    db.close();
    return {
      assets: a.result.length,
      documents: d.result.length,
      storedPayloadBytes: bytes,
      playerCount: m.players.length,
    };
  });
  assert.equal(
    after.assets,
    after.playerCount,
    "Photos repeated across games/checkpoints",
  );
  assert(after.documents <= 3, "Unreferenced checkpoints accumulated");
  assert(
    after.storedPayloadBytes < before.rawBytes,
    "Normalized storage did not shrink",
  );
  // Another tab must never silently overwrite a newer committed source.
  const other = await context.newPage();
  await other.goto(base + "/__storage_test__");
  await other.evaluate(async () => {
    const s = await import("/src/storage.ts");
    await s.initializeMatchStorage();
  });
  await page.evaluate(async () => {
    const s = await import("/src/storage.ts");
    const m = s.loadMatch();
    s.saveMatch({ ...m, socialHighlightPlayerId: m.players[1].id }, m);
    await s.flushMatchStorage();
  });
  const conflict = await other.evaluate(async () => {
    const s = await import("/src/storage.ts");
    const m = s.loadMatch();
    s.saveMatch({ ...m, socialHighlightPlayerId: undefined }, m);
    try {
      await s.flushMatchStorage();
      return "";
    } catch (e) {
      return e.message;
    }
  });
  assert.match(conflict, /outra aba/);
  // A failed transaction keeps the primary checkpoint intact and leaves edits exportable.
  await page.evaluate(async () => {
    const s = await import("/src/storage.ts");
    const before = s.loadMatch();
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "documents")
        throw new DOMException("test failure", "QuotaExceededError");
      return original.apply(this, args);
    };
    s.saveMatch({ ...before, opponent: "Uncommitted edit" }, before);
    try {
      await s.flushMatchStorage();
      throw Error("Expected failure");
    } catch (e) {
      if (!s.matchStorageStatus().error) throw e;
    } finally {
      IDBObjectStore.prototype.put = original;
    }
    const backup = JSON.parse(await s.localMatchBackup());
    if (backup.opponent !== "Uncommitted edit")
      throw Error("Pending edit not exportable");
    const disk = await (
      await import("/src/matchDatabase.ts")
    ).readDatabaseMatch();
    if (disk.match.opponent !== before.opponent)
      throw Error("Failed transaction replaced original");
  });
  const legacyRaw = await page.evaluate(async () => {
    const db = await import("/src/matchDatabase.ts");
    return JSON.stringify(
      await db.expandMatch((await db.readDatabaseMatch()).match),
    );
  });
  const recoveryContext = await browser.newContext();
  await recoveryContext.route("**/__storage_test__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Migration rollback</title>",
    }),
  );
  const recoveryPage = await recoveryContext.newPage();
  await recoveryPage.goto(base + "/__storage_test__");
  await recoveryPage.evaluate(async (raw) => {
    localStorage.setItem("so-na-rede:match:v1", raw);
    localStorage.setItem(
      "so-na-rede:match:v1:backup",
      JSON.stringify({
        ...JSON.parse(raw),
        opponent: "Previous valid checkpoint",
      }),
    );
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "documents")
        throw new DOMException("test", "QuotaExceededError");
      return original.apply(this, args);
    };
    const s = await import("/src/storage.ts");
    await s.initializeMatchStorage();
    IDBObjectStore.prototype.put = original;
    if (localStorage.getItem("so-na-rede:match:v1") !== raw)
      throw Error("Failed migration deleted legacy source");
    let blocked = false;
    try {
      s.loadMatch();
    } catch {
      blocked = true;
    }
    if (!blocked) throw Error("Failed migration silently accepted");
  }, legacyRaw);
  await recoveryPage.reload();
  await recoveryPage.evaluate(async () => {
    const s = await import("/src/storage.ts");
    await s.initializeMatchStorage();
    if (!s.loadMatch()) throw Error("Retry migration failed");
    const db = await import("/src/matchDatabase.ts");
    const saved = await db.readDatabaseMatch();
    const prior = await db.readMatchDocument(saved.head.previous);
    if (prior.opponent !== "Previous valid checkpoint")
      throw Error("Distinct legacy backup lost");
  });
  await recoveryPage.evaluate(
    (raw) =>
      localStorage.setItem(
        "so-na-rede:match:v1",
        JSON.stringify({
          ...JSON.parse(raw),
          opponent: "Written by old app tab",
        }),
      ),
    legacyRaw,
  );
  await recoveryPage.reload();
  await recoveryPage.evaluate(async (raw) => {
    const s = await import("/src/storage.ts");
    await s.initializeMatchStorage();
    let blocked = false;
    try {
      s.loadMatch();
    } catch {
      blocked = true;
    }
    if (!blocked || !localStorage.getItem("so-na-rede:match:v1"))
      throw Error("Old-version tab was silently overwritten");
    await s.restoreMatchStorage(JSON.parse(raw));
    if (
      s.loadMatch().opponent === "Written by old app tab" ||
      localStorage.getItem("so-na-rede:match:v1")
    )
      throw Error("Explicit JSON recovery failed");
  }, legacyRaw);
  console.log(
    JSON.stringify(
      {
        before,
        migrated,
        after,
        checks:
          "migration/rollback, distinct legacy backup, lazy history, photo dedup, full export, quota, rapid writes, reload, GC, concurrent tab and failed transaction",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
