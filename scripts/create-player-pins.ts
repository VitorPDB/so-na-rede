// Local provisioning only. No credentials are imported into the browser bundle.
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { newMatch } from "../src/model";
const output = ".qa/player-pins.txt";
if (existsSync(output))
  throw new Error(
    "Credenciais já geradas. Preserve-as; rotação deve ser explícita.",
  );
mkdirSync(".qa", { recursive: true });
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec("create extension pgcrypto");
  const pins = new Set<string>();
  const sql: string[] = ["begin;"];
  const lines: string[] = [];
  for (const p of newMatch().players) {
    let pin: string;
    do {
      pin = String(randomInt(1000, 10000));
    } while (pins.has(pin));
    pins.add(pin);
    const hash = (
      await db.query<{ hash: string }>(
        "select crypt($1,gen_salt('bf',12)) hash",
        [pin],
      )
    ).rows[0].hash;
    sql.push(
      `insert into public.player_access(player_id,name,number,pin_hash) values ('${p.id}','${p.name.replaceAll("'", "''")}',${p.number},'${hash}') on conflict(player_id) do nothing;`,
    );
    lines.push(`${p.name}: ${pin}`);
  }
  sql.push("commit;");
  writeFileSync(".qa/provision-player-pins.sql", sql.join("\n") + "\n");
  writeFileSync(
    output,
    "PINs iniciais — ativar com provision-player-pins.sql; não publicar este arquivo.\n" +
      lines.join("\n") +
      "\n",
  );
  console.log("Credenciais geradas em .qa (fora do Git e do site).");
} finally {
  await db.close();
}
