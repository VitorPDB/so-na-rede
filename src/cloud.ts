import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCloudConfig } from "./cloudConfig";

// These are public client credentials. Never put a service-role key here.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, 15000);
  init?.signal?.addEventListener("abort", abort, { once: true });
  if (init?.signal?.aborted) abort();
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", abort);
  }
}
export let cloud: SupabaseClient | null = null;
export let cloudIssue = "";
export async function initializeCloud() {
  try {
    let config = parseCloudConfig({ supabaseUrl: url, publishableKey: key });
    if (!config) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      let fileConfig: unknown;
      try {
        const response = await fetch("/live-config.json", {
          cache: "no-cache",
          signal: controller.signal,
        });
        if (response.ok) fileConfig = await response.json();
      } catch {
        /* Local marking remains available when the optional configuration cannot load. */
      } finally {
        clearTimeout(timeout);
      }
      if (fileConfig) config = parseCloudConfig(fileConfig);
    }
    if (config) {
      const { createClient } = await import("@supabase/supabase-js");
      cloud = createClient(config.supabaseUrl, config.publishableKey, {
        global: { fetch: fetchWithTimeout },
      });
    }
  } catch (error) {
    cloudIssue =
      error instanceof Error
        ? error.message
        : "Confira o arquivo live-config.json.";
  }
}
export const teamSlug = "so-na-rede";
export const publicLink = () => `${location.origin}/?view=public`;
