import { ChevronRight, ChevronLeft, Pencil, Check } from "lucide-react";
import { type Match, type Player } from "../model";
import { Photo } from "../PlayerProfile";
import { RatingBadge } from "../live/Insights";

const pad = (n: number) => String(n).padStart(2, "0");

export function Roster({
  match,
  stats,
  editing,
  onEditing,
  onProfile,
  onChange,
}: {
  match: Match;
  stats: {
    player: Player;
    rating: number | null;
    count: number;
    points: number;
  }[];
  editing: boolean;
  onEditing: (value: boolean) => void;
  onProfile: (id: string) => void;
  onChange: (match: Match) => boolean;
}) {
  const update = (id: string, fields: Partial<Player>) =>
    onChange({
      ...match,
      players: match.players.map((x) =>
        x.id === id ? { ...x, ...fields } : x,
      ),
    });
  const liberos = match.players.filter((p) => p.libero).length;

  return (
    <div className="ro">
      <div className="an-toolbar">
        <p className="ro-summary">
          <b>{match.players.length}</b> jogadores ·{" "}
          {match.players.length - liberos} de linha · {liberos} líbero
          {liberos === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          className={
            "ui-btn ui-btn--sm " +
            (editing ? "ui-btn--primary" : "ui-btn--secondary")
          }
          aria-pressed={editing}
          onClick={() => onEditing(!editing)}
        >
          {editing ? (
            <Check size={16} aria-hidden="true" />
          ) : (
            <Pencil size={16} aria-hidden="true" />
          )}
          {editing ? "Concluir edição" : "Editar elenco"}
        </button>
      </div>

      {!editing ? (
        <div className="ro-grid">
          {match.players.map((p, i) => {
            const row = stats.find((r) => r.player.id === p.id)!;
            return (
              <button
                type="button"
                className={"ro-card" + (p.libero ? " is-libero" : "")}
                key={p.id}
                style={{ "--i": i } as React.CSSProperties}
                aria-label={`Abrir perfil de ${p.name}`}
                onClick={() => onProfile(p.id)}
              >
                <span className="ro-portrait">
                  <Photo player={p} className="ro-photo" />
                  {p.photo && <b>#{pad(p.number)}</b>}
                </span>
                <span className="ro-info">
                  <strong>
                    {p.name}
                    {p.libero && !p.positions.includes("Líbero") && (
                      <span className="ui-tag">Líbero</span>
                    )}
                  </strong>
                  <span className="ro-positions">
                    {p.positions.map((pos, idx) => (
                      <i key={pos} className={idx === 0 ? "is-main" : ""}>
                        {pos}
                      </i>
                    ))}
                  </span>
                  <small>
                    {row.count
                      ? `${row.count} ações · ${row.points} pts${row.count < 3 ? " · provisório" : ""}`
                      : "Sem ações nesta partida"}
                  </small>
                </span>
                <span className="ro-side">
                  <RatingBadge value={row.rating} />
                  <ChevronRight size={18} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="ro-edit">
          <p className="ui-note ro-edit-hint">
            Alterações são salvas na hora. As posições ficam em ordem de
            frequência: toque na seta para subir uma posição.
          </p>
          {match.players.map((p) => (
            <div className="ui-card ro-row" key={p.id}>
              <button
                type="button"
                className="ro-row-photo"
                aria-label={"Abrir perfil de " + p.name}
                onClick={() => onProfile(p.id)}
              >
                <Photo player={p} className="ro-photo" />
                <small>Perfil</small>
              </button>
              <label className="fe-field ro-name">
                <span className="ui-eyebrow">Nome</span>
                <input
                  className="ui-input"
                  value={p.name}
                  onChange={(e) => {
                    if (e.target.value.trim())
                      update(p.id, { name: e.target.value });
                  }}
                />
              </label>
              <label className="fe-field ro-number">
                <span className="ui-eyebrow">Nº</span>
                <input
                  className="ui-input"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="99"
                  value={p.number}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (
                      n > 0 &&
                      n < 100 &&
                      !match.players.some(
                        (x) => x.id !== p.id && x.number === n,
                      )
                    )
                      update(p.id, { number: n });
                  }}
                />
              </label>
              <div className="fe-field ro-pos">
                <span className="ui-eyebrow">
                  Posições · por frequência
                  {p.libero && <span className="ui-tag">Líbero</span>}
                </span>
                <div className="ro-pos-chips">
                  {p.positions.map((pos, i) => (
                    <button
                      type="button"
                      key={`${pos}-${i}`}
                      disabled={!i}
                      title={
                        i ? "Tornar mais frequente" : "Posição mais frequente"
                      }
                      onClick={() => {
                        const positions = [...p.positions];
                        [positions[i - 1], positions[i]] = [
                          positions[i],
                          positions[i - 1],
                        ];
                        update(p.id, { positions });
                      }}
                    >
                      <b>{i + 1}</b>
                      {pos}
                      {i > 0 && <ChevronLeft size={14} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                <input
                  className="ui-input ro-pos-input"
                  aria-label={`Editar posições de ${p.name}`}
                  placeholder="Separe por vírgulas"
                  defaultValue={p.positions.join(", ")}
                  key={p.positions.join(",")}
                  disabled={p.libero}
                  onBlur={(e) => {
                    const positions = [
                      ...new Set(
                        e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      ),
                    ];
                    if (positions.length && !p.libero)
                      update(p.id, { positions });
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
