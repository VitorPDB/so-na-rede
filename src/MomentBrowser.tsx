import { useState } from "react";
import { Play, Sparkles, Zap } from "lucide-react";
import { SkillIcon, skillForLabel } from "./SkillIcon";
import { CardSelect } from "./CardSelect";
import { type Player, skills } from "./model";
import {
  filterVideoMoments,
  formatVideoTime,
  type VideoMoment,
} from "./videoMoments";
import { MomentFeed } from "./MomentFeed";
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
  if (!moments.length)
    return (
      <p className="ui-note">
        Ainda não há lances com horário neste recorte. Eles aparecem quando a
        comissão marca as ações no vídeo e publica a partida.
      </p>
    );
  const activeFilters = [
    primary && players.find((p) => p.id === primary)?.name,
    partner && `com ${players.find((p) => p.id === partner)?.name ?? partner}`,
    set && `Set ${set}`,
    skill && skills[skill as keyof typeof skills]?.label,
    special &&
      {
        point: "Pontos nossos",
        magic: "Tirou da cartola",
        emergency: "Emergência",
      }[special],
  ]
    .filter(Boolean)
    .join(" · ");
  const clear = () => {
    setPlayer(fixedPlayer ?? "");
    setPartner("");
    setSet(0);
    setSkill("");
    setSpecial("");
  };
  return (
    <section aria-label="Filtrar lances de vídeo">
      <details className="moment-filter-panel">
        <summary>
          Filtrar jogadas <span>{activeFilters || "Todos os lances"}</span>
        </summary>
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
            <CardSelect
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            >
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
              <option value="point">Pontos nossos</option>
              <option value="magic">Tirou da cartola</option>
              <option value="emergency">Emergência</option>
            </CardSelect>
          </label>
        </div>
        <button className="ui-btn" onClick={clear}>
          Limpar filtros
        </button>
      </details>
      <p className="ui-note">
        {filtered.length} lances com horário.{" "}
        {partner && mode === "rally"
          ? "Mostra as ações dos rallies em que ambos participaram, mesmo em toques diferentes."
          : "Filtra os participantes da própria ação."}{" "}
        Dados antigos sem detalhes não são inferidos.
      </p>
      <button
        className="ui-btn"
        disabled={!filtered.length}
        onClick={() => setSelected(filtered[0])}
      >
        <Play size={18} aria-hidden="true" /> Assistir jogadas em sequência
      </button>
      {active && (
        <MomentFeed
          moments={filtered}
          selectedId={active.id}
          players={players}
          onSelect={setSelected}
          onClose={() => setSelected(undefined)}
        />
      )}
      <div className="moment-cards">
        {filtered.map((m) => (
          <button
            className={`moment-card${m.pointWon ? " is-point" : ""}`}
            key={m.id}
            aria-pressed={active?.id === m.id}
            onClick={() => setSelected(m)}
          >
            <span className="moment-skill-badge">
              <SkillIcon skill={m.skill ?? skillForLabel(m.label)} size={48} />
            </span>
            <span className="moment-card-body">
              <strong>
                {m.skill ? skills[m.skill].label : m.label.split(" · ")[0]}
              </strong>
              <span>
                {m.playerIds
                  .map((id) => players.find((p) => p.id === id)?.name ?? id)
                  .join(" + ")}
              </span>
              <small>
                Set {m.set} · Rally {m.rally}
              </small>
              {m.pointWon && (
                <em className="moment-point-label">Ponto nosso</em>
              )}
              {(m.magic || m.label.includes("Tirou da cartola")) && (
                <em>
                  <Sparkles size={13} aria-hidden="true" /> Tirou da cartola
                </em>
              )}
              {(m.emergency || m.label.includes("Emergência")) && (
                <em>
                  <Zap size={13} aria-hidden="true" /> Emergência
                </em>
              )}
            </span>
            <span className="moment-card-time">
              {formatVideoTime(m.videoTimestampMs)}
              <Play size={17} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p>
          Nenhum lance corresponde aos filtros.{" "}
          <button className="ui-btn" onClick={clear}>
            Ver todos os lances
          </button>
        </p>
      )}
    </section>
  );
}
