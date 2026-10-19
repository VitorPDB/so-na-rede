import { useState } from "react";
import { CardSelect } from "./CardSelect";
import { type Player, skills } from "./model";
import {
  filterVideoMoments,
  formatVideoTime,
  type VideoMoment,
} from "./videoMoments";
import { MomentPlayer } from "./MomentPlayer";
export function MomentBrowser({
  moments,
  players,
  fixedPlayer,
}: {
  moments: VideoMoment[];
  players: Player[];
  fixedPlayer?: string;
}) {
  const [player, setPlayer] = useState(fixedPlayer ?? "");
  const [partner, setPartner] = useState("");
  const [mode, setMode] = useState<"action" | "rally">("action");
  const [set, setSet] = useState(0);
  const [skill, setSkill] = useState("");
  const [special, setSpecial] = useState("");
  const [selected, setSelected] = useState<VideoMoment>();
  const primary = fixedPlayer ?? player;
  const filtered = filterVideoMoments(moments, {
    player: primary,
    partner,
    mode,
    set,
    skill,
    special,
  });
  const active = filtered.find((m) => m.id === selected?.id);
  const options = players.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));
  return (
    <section aria-label="Filtrar lances de vídeo">
      <div className="moment-filters">
        {!fixedPlayer && (
          <label>
            Jogador
            <CardSelect
              value={primary}
              onChange={(e) => {
                setPlayer(e.target.value);
                setPartner("");
              }}
            >
              <option value="">Todos os jogadores</option>
              {options}
            </CardSelect>
          </label>
        )}
        <label>
          Com outro jogador
          <CardSelect
            value={partner}
            disabled={!primary}
            onChange={(e) => setPartner(e.target.value)}
          >
            <option value="">Sem filtro de dupla</option>
            {players
              .filter((p) => p.id !== primary)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </CardSelect>
        </label>
        {partner && (
          <label>
            Participação da dupla
            <CardSelect
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="action">Na mesma ação</option>
              <option value="rally">No mesmo rally</option>
            </CardSelect>
          </label>
        )}
        <label>
          Set
          <CardSelect
            value={set}
            onChange={(e) => setSet(Number(e.target.value))}
          >
            <option value={0}>Todos os sets</option>
            {[...new Set(moments.map((m) => m.set))].sort().map((n) => (
              <option value={n} key={n}>
                Set {n}
              </option>
            ))}
          </CardSelect>
        </label>
        <label>
          Fundamento
          <CardSelect value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">Todos os fundamentos</option>
            {Object.entries(skills).map(([id, s]) => (
              <option value={id} key={id}>
                {s.label}
              </option>
            ))}
          </CardSelect>
        </label>
        <label>
          Destaque
          <CardSelect
            value={special}
            onChange={(e) => setSpecial(e.target.value)}
          >
            <option value="">Todos os lances</option>
            <option value="magic">Tirou da cartola</option>
            <option value="emergency">Emergência</option>
          </CardSelect>
        </label>
      </div>
      <p className="ui-note">
        {filtered.length} lances com horário.{" "}
        {partner && mode === "rally"
          ? "Mostra as ações dos rallies em que ambos participaram, mesmo em toques diferentes."
          : "Filtra os participantes da própria ação."}{" "}
        Dados antigos sem detalhes não são inferidos.
      </p>
      {active && (
        <>
          <MomentPlayer
            key={`${active.id}:${active.videoSource}`}
            moment={active}
          />
          <button className="ui-btn" onClick={() => setSelected(undefined)}>
            Fechar lance
          </button>
        </>
      )}
      <div className="video-review-actions">
        {filtered.map((m) => (
          <button className="ui-btn" key={m.id} onClick={() => setSelected(m)}>
            Set {m.set} · Rally {m.rally} ·{" "}
            {m.playerIds
              .map((id) => players.find((p) => p.id === id)?.name ?? id)
              .join(" + ")}{" "}
            · {m.label} · {formatVideoTime(m.videoTimestampMs)}
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p>Nenhum lance com horário corresponde aos filtros.</p>
      )}
    </section>
  );
}
