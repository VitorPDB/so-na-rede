export type CloudConfig = { supabaseUrl: string; publishableKey: string };

export function parseCloudConfig(value: unknown): CloudConfig | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const supabaseUrl =
    typeof input.supabaseUrl === "string" ? input.supabaseUrl.trim() : "";
  const publishableKey =
    typeof input.publishableKey === "string" ? input.publishableKey.trim() : "";
  if (!supabaseUrl && !publishableKey) return null;
  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    throw new Error("Confira a URL do projeto no live-config.json.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  )
    throw new Error(
      "Use a URL HTTPS do projeto Supabase, sem caminhos adicionais.",
    );
  let publicKey = /^sb_publishable_[a-zA-Z0-9_-]+$/.test(publishableKey);
  if (!publicKey && publishableKey.split(".").length === 3) {
    try {
      const payload = publishableKey
        .split(".")[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      publicKey = JSON.parse(atob(payload)).role === "anon";
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey)
    throw new Error(
      "Use apenas a chave pública publishable ou anon; nunca service_role ou secret.",
    );
  return { supabaseUrl: url.origin, publishableKey };
}
