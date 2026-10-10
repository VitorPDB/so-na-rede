import { ArrowLeftRight, Volleyball } from "lucide-react";
import {
  type Match,
  type Player,
  type Projection,
  type Zone,
  roleLabels,
} from "../model";
import { Jersey } from "../Jersey";
import { Photo } from "../PlayerProfile";

const ZONES: Zone[] = [4, 3, 2, 5, 6, 1];

export function CourtCard({
  match,
  state,
  selected,
  picking,
  disabled,
  onPlayer,
  onSubs,
  onBench,
  onAutoLibero,
}: {
  match: Match;
  state: Projection;
  selected: string;
  picking: boolean;
  disabled: boolean;
  onPlayer: (id: string) => void;
  onSubs: () => void;
  onBench: (id: string) => void;
  onAutoLibero: () => void;
}) {
  const s = state;
  const player = (id: string) => match.players.find((p) => p.id === id)!;
  const bench = match.players.filter((p) => !s.lineup.includes(p.id));
  return (
    <section className="lv-card lv-court" aria-labelledby="court-title">
      <header className="lv-card-head">
        <div>
          <h2 id="court-title">Em quadra</h2>
          <p>
            {picking
              ? "Toque em quem realizou a ação"
              : "Toque para selecionar · rotação automática"}
          </p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn--secondary ui-btn--sm"
          onClick={onSubs}
          disabled={picking}
        >
          <ArrowLeftRight size={16} aria-hidden="true" />
          Trocas e líbero
        </button>
      </header>

      <div className="court-net" aria-hidden="true">
        <span>Rede</span>
      </div>
      <div className="court-grid">
        {ZONES.map((z, i) => {
          const p = player(s.lineup[z - 1]);
          const serving = z === 1 && s.server === "ours";
          const isSelected = p.id === selected;
          return (
            <button
              key={z}
              type="button"
              className={
                "court-slot" +
                (isSelected ? " is-selected" : "") +
                (i < 3 ? " is-front" : "")
              }
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => onPlayer(p.id)}
              aria-pressed={isSelected}
              aria-label={`${p.name}, zona ${z}${serving ? ", sacador" : ""}`}
            >
              <span className="court-zone">Z{z}</span>
              <Jersey number={p.number} libero={p.libero} />
              {serving && (
                <span className="court-serve" title="Sacador">
                  <Volleyball size={13} aria-hidden="true" />
                </span>
              )}
              <strong>{p.name}</strong>
              <small>{roleLabels[p.libero ? "libero" : s.roles[z - 1]]}</small>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={s.autoLibero}
        className="lv-setting"
        disabled={disabled || picking}
        onClick={onAutoLibero}
      >
        <span>
          <strong>Líbero automático</strong>
          <small>
            {s.autoLibero
              ? "Entra quando o central perde o saque"
              : "Central permanece em quadra"}
          </small>
        </span>
        <span className="ui-switch" aria-hidden="true">
          <i />
        </span>
      </button>

      {bench.length > 0 && (
        <div className="lv-bench">
          <span className="ui-eyebrow">
            Banco <b>{bench.length}</b>
          </span>
          <div className="bench-row">
            {bench.map((p: Player) => (
              <button
                type="button"
                key={p.id}
                className="bench-chip"
                title={`${p.name} · ${p.positions.join(", ")}`}
                onClick={() => onBench(p.id)}
                disabled={picking}
              >
                <Photo
                  player={p}
                  className={"bench-photo" + (p.libero ? " libero" : "")}
                />
                <span>{p.name.split(" ")[0]}</span>
                {p.libero && <b className="ui-tag">L</b>}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
