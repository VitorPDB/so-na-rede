import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCloudConfig } from "./src/cloudConfig";
let buildDirectory = "dist";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "version-offline-cache",
      configResolved(config) {
        buildDirectory = config.build.outDir;
        const checkPublic = (directory: string) => {
          for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (
              /^(\.env|\.git|\.aws|\.codex|\.agents)(?:[.\-]|$)/i.test(
                entry.name,
              ) ||
              /\.(zip|bak|backup|pem|key|p12|pfx)$/i.test(entry.name)
            )
              throw new Error(
                `Arquivo privado no diretório público: ${entry.name}`,
              );
            if (entry.isSymbolicLink())
              throw new Error(
                "Links simbólicos não são permitidos no diretório público.",
              );
            if (entry.isDirectory())
              checkPublic(resolve(directory, entry.name));
          }
        };
        checkPublic(config.publicDir);
        parseCloudConfig(
          JSON.parse(
            readFileSync(resolve(config.publicDir, "live-config.json"), "utf8"),
          ),
        );
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
          readFileSync("supabase/live.sql", "utf8") +
            "\n" +
            readFileSync("supabase/videos.sql", "utf8") +
            "\n" +
            readFileSync("supabase/security-schema.sql", "utf8") +
            "\n" +
            readFileSync("supabase/security.sql", "utf8") +
            "\n" +
            readFileSync("supabase/players.sql", "utf8"),
        );
        writeFileSync(
          resolve(buildDirectory, "security-setup.sql"),
          readFileSync("supabase/security-schema.sql", "utf8") +
            "\n" +
            readFileSync("supabase/security.sql", "utf8") +
            "\n" +
            readFileSync("supabase/players.sql", "utf8"),
        );
        writeFileSync(
          resolve(buildDirectory, "ativar-online.md"),
          readFileSync("ONLINE.md", "utf8"),
        );
        writeFileSync(
          resolve(buildDirectory, "videos-setup.sql"),
          readFileSync("supabase/videos.sql", "utf8"),
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
