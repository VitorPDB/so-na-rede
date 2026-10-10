import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
let buildDirectory = "dist";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "version-offline-cache",
      configResolved(config) {
        buildDirectory = config.build.outDir;
      },
      closeBundle() {
        const path = resolve(buildDirectory, "sw.js");
        const assets = readdirSync(resolve(buildDirectory, "assets"))
          .filter((name) => /\.(js|css|woff2)$/.test(name))
          .map((name) => `/assets/${name}`);
        writeFileSync(
          resolve(buildDirectory, "app-assets.json"),
          JSON.stringify(assets),
        );
        writeFileSync(
          resolve(buildDirectory, "live-setup.sql"),
          readFileSync("supabase/live.sql", "utf8"),
        );
        writeFileSync(
          resolve(buildDirectory, "ativar-online.md"),
          readFileSync("ONLINE.md", "utf8"),
        );
        writeFileSync(
          resolve(buildDirectory, "CLOUDFLARE.md"),
          readFileSync("CLOUDFLARE.md", "utf8"),
        );
        writeFileSync(
          resolve(buildDirectory, "VERCEL.md"),
          readFileSync("VERCEL.md", "utf8"),
        );
        writeFileSync(
          path,
          readFileSync(path, "utf8")
            .replace(
              "const APP_ASSETS = [];",
              `const APP_ASSETS = ${JSON.stringify(assets)};`,
            )
            .replace("so-na-rede-v1", `so-na-rede-${Date.now()}`),
        );
      },
    },
  ],
});
