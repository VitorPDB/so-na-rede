import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { cloud, initializeCloud } from "./cloud";
import { applyStoredTheme } from "./theme";
applyStoredTheme();
import "./styles/index.css";
const root = createRoot(document.getElementById("root")!);
const App = lazy(() => import("./App"));
const PublicLive = lazy(() =>
  import("./PublicLive").then((module) => ({ default: module.PublicLive })),
);
const loading = (
  <div className="boot-screen" role="status">
    <img src="/team-logo-transparent.png" alt="" />
    <p>Carregando Só na Rede…</p>
  </div>
);
root.render(loading);
void initializeCloud().then(() => {
  const view = new URLSearchParams(location.search).get("view");
  const publicView =
    view === "public" || Boolean(cloud && view !== "commission");
  document
    .querySelector('link[rel="manifest"]')
    ?.setAttribute(
      "href",
      publicView ? "/manifest-public.webmanifest" : "/manifest.webmanifest",
    );
  document.title = publicView
    ? "Só na Rede · Ao vivo"
    : "Só na Rede · Scout ao vivo";
  root.render(
    <React.StrictMode>
      <Suspense fallback={loading}>
        {publicView ? <PublicLive /> : <App />}
      </Suspense>
    </React.StrictMode>,
  );
});
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(console.error);
