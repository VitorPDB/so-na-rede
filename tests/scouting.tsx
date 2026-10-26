import React, { useState, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/big-shoulders-display";
import "../src/styles/index.css";
import { MobileScout } from "../src/MobileScout";
import { YoutubeScout } from "../src/YoutubeScout";
import { newMatch, type SkillEvent, type MatchVideo } from "../src/model";
import { append, project, undo } from "../src/engine";
import { initialAssessment } from "../src/actionQuality";
import { SocialCardExport } from "../src/SocialCardExport";
import { socialCardData } from "../src/socialCardData";
window.YT = {
  Player: class {
    time = 363;
    state = 2;
    id = "M7lc1UVf-VE";
    el: HTMLElement;
    constructor(el: HTMLElement, o: any) {
      this.el = el;
      this.time = o.playerVars.start || 363;
      el.style.cssText =
        "background:#25222a;color:#efecf2;padding:35px;font-size:25px;height:100%;box-sizing:border-box";
      this.draw();
      queueMicrotask(() => o.events.onReady());
    }
    draw() {
      this.el.textContent = "YouTube simulado · " + this.time.toFixed(2) + " s";
    }
    getCurrentTime() {
      return this.time;
    }
    getPlayerState() {
      return this.state;
    }
    getVideoData() {
      return { video_id: this.id };
    }
    pauseVideo() {
      this.state = 2;
      this.draw();
    }
    playVideo() {
      this.state = 1;
      this.draw();
    }
    seekTo(t: number) {
      this.time = t;
      this.draw();
    }
    destroy() {
      this.el.remove();
    }
  },
};
function App() {
  const [m, M] = useState(() => {
      const n = newMatch();
      n.id = "qa-scout";
      return n;
    }),
    [open, O] = useState(false),
    [pending, P] = useState<SkillEvent>(),
    [tab, T] = useState(false),
    [feedback, F] = useState("");
  const video: MatchVideo = {
    id: "qa-v",
    title: "Teste",
    youtubeId: "M7lc1UVf-VE",
    kind: "replay",
    startSeconds: 363,
  };
  const s = project(m);
  const card = useMemo(() => socialCardData(m, m.players[0]), [m]);
  return (
    <main style={{ padding: 25 }}>
      <h1>QA · componentes reais, YouTube simulado</h1>
      <button className="ui-btn" onClick={() => O(true)}>
        Abrir scouting
      </button>
      <button className="ui-btn" onClick={() => T(!tab)}>
        {tab ? "Voltar à Partida" : "Abrir Análise"}
      </button>
      <p>
        Eventos: {s.events.length} · Último horário:{" "}
        {s.events.at(-1)?.videoTimestampMs ?? "—"}
      </p>
      {!open && !tab && (
        <YoutubeScout
          video={video}
          positionKey={JSON.stringify([
            m.id,
            s.set,
            video.youtubeId,
            video.startSeconds,
          ])}
        />
      )}
      <button
        className="ui-btn"
        onClick={() => {
          const canvas = document.createElement("canvas");
          canvas.width = 500;
          canvas.height = 700;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#573066";
          ctx.fillRect(0, 0, 500, 700);
          ctx.fillStyle = "#f0c66a";
          ctx.fillRect(30, 30, 440, 25);
          ctx.font = "38px sans-serif";
          ctx.fillText("FOTO DE TESTE", 75, 350);
          ctx.strokeStyle = "#efecf2";
          ctx.lineWidth = 5;
          ctx.strokeRect(30, 80, 440, 580);
          M({
            ...m,
            players: m.players.map((p, i) =>
              i
                ? p
                : {
                    ...p,
                    photo: {
                      dataUrl: canvas.toDataURL("image/png"),
                      x: 50,
                      y: 50,
                      zoom: 1,
                    },
                  },
            ),
          });
        }}
      >
        Adicionar imagem de teste ao perfil
      </button>
      <SocialCardExport data={card} />
      {open && (
        <MobileScout
          match={m}
          state={s}
          video={video}
          pending={pending}
          onRecord={(skill, result, stamp) =>
            P({
              skill,
              result,
              ...stamp,
              assessment: initialAssessment(skill, result),
            })
          }
          onSelect={(id, e) => {
            try {
              M(append(m, { type: "event", event: { ...e!, playerId: id } }));
              P(undefined);
              F("Ação registrada e salva.");
            } catch (e) {
              F(String(e));
            }
          }}
          onClose={() => {
            O(false);
            P(undefined);
          }}
          onCancel={() => P(undefined)}
          onUndo={() => {
            M(undo(m));
            return true;
          }}
          canUndo={s.active.length > 0}
          disabled={s.setFinished}
          feedback={feedback}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
