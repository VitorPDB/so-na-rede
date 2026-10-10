import { Check, Info, Save, Trash2, Volleyball } from "lucide-react";
import {
  type Match,
  type Player,
  type Role,
  type Side,
  type Zone,
  roleLabels,
} from "../model";
import { Jersey } from "../Jersey";
import { Photo } from "../PlayerProfile";

const ZONES: Zone[] = [4, 3, 2, 5, 6, 1];

export type FormationEditorProps = {
  match: Match;
  draft: { lineup: string[]; roles: Role[] };
  previewP: Zone;
  zone: Zone;
  server: Side;
  presetId: string;
  presetName: string;
  canConfirm: boolean;
  canApplyNow: boolean;
  confirmLabel: string;
  onPreviewP: (p: Zone) => void;
  onZone: (z: Zone) => void;
  onAssign: (playerId: string) => void;
  onServer: (side: Side) => void;
  onPresetSelect: (id: string) => void;
  onPresetName: (name: string) => void;
  onPresetSave: () => void;
  onPresetDelete: () => void;
  onConfirm: () => void;
  presetsOpen?: boolean;
};

/** Editor de formação inicial: rotação P1–P6, escalação por zona, primeiro saque e predefinições. */
export function FormationEditor(props: FormationEditorProps) {
  const { match, draft, previewP, zone } = props;
  const player = (id: string) => match.players.find((p) => p.id === id)!;
  const roster = match.players.filter((p) => !p.libero);
  const formations = match.formations ?? [];
  const inZone = player(draft.lineup[zone - 1]);

  return (
    <div className="fe">
      <section className="fe-court" aria-label="Formação em quadra">
        <div className="fe-toolbar">
          <span className="ui-eyebrow">Rotação inicial</span>
          <div
            className="ui-segmented fe-p"
            role="radiogroup"
            aria-label="Rotação inicial (zona do levantador)"
          >
            {([1, 2, 3, 4, 5, 6] as Zone[]).map((p) => (
              <button
                type="button"
                key={p}
                role="radio"
                aria-checked={previewP === p}
                onClick={() => props.onPreviewP(p)}
              >
                P{p}
              </button>
            ))}
          </div>
        </div>
        <p className="fe-hint">
          Levantador na zona {previewP}. Toque numa zona e escolha quem começa
          nela.
        </p>
        <div className="court-net" aria-hidden="true">
          <span>Rede</span>
        </div>
        <div className="court-grid fe-grid">
          {ZONES.map((z, i) => {
            const p = player(draft.lineup[z - 1]);
            const target = zone === z;
            return (
              <button
                type="button"
                key={z}
                className={"court-slot" + (target ? " is-selected" : "")}
                style={{ "--i": i } as React.CSSProperties}
                aria-pressed={target}
                aria-label={`Zona ${z}: ${p.name}. Toque para trocar`}
                onClick={() => props.onZone(z)}
              >
                <span className="court-zone">Z{z}</span>
                <Jersey number={p.number} libero={p.libero} />
                {z === 1 && props.server === "ours" && (
                  <span className="court-serve" title="Primeiro saque">
                    <Volleyball size={13} aria-hidden="true" />
                  </span>
                )}
                <strong key={p.id}>{p.name}</strong>
                <small>{roleLabels[draft.roles[z - 1]]}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="fe-side">
        <section className="fe-block" aria-labelledby="fe-zone-title">
          <header className="fe-block-head">
            <div>
              <h3 id="fe-zone-title">
                Zona {zone} · {roleLabels[draft.roles[zone - 1]]}
              </h3>
              <p>
                Agora: <b>{inZone.name}</b>. Qualquer jogador pode entrar; se já
                estiver em quadra, os dois trocam.
              </p>
            </div>
          </header>
          <div className="fe-roster">
            {roster.map((p: Player) => {
              const current = draft.lineup.indexOf(p.id) + 1;
              const chosen = draft.lineup[zone - 1] === p.id;
              return (
                <button
                  type="button"

                  key={p.id}
                  className={"fe-player" + (chosen ? " is-chosen" : "")}
                  aria-pressed={chosen}
                  aria-label={`Escalar ${p.name} na zona ${zone}`}
                  onClick={() => props.onAssign(p.id)}
                >
                  <Photo player={p} className="fe-photo" />
                  <span className="fe-player-text">
                    <strong>{p.name}</strong>
                    <small>
                      <span className="fe-where-inline">
                        {current ? "Z" + current : "Banco"} ·{" "}
                      </span>
                      {p.positions.join(" · ")}
                    </small>
                  </span>
                  <span className={"fe-where" + (current ? " on-court" : "")}>
                    {chosen ? (
                      <Check size={14} aria-hidden="true" />
                    ) : current ? (
                      "Z" + current
                    ) : (
                      "Banco"
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="fe-block" aria-labelledby="fe-serve-title">
          <h3 id="fe-serve-title" className="ui-eyebrow">
            Primeiro saque
          </h3>
          <div
            className="ui-segmented fe-serve"
            role="radiogroup"
            aria-label="Primeiro saque"
          >
            {(["ours", "theirs"] as Side[]).map((side) => (
              <button
                type="button"
                key={side}
                role="radio"
                aria-checked={props.server === side}
                onClick={() => props.onServer(side)}
              >
                <Volleyball size={16} aria-hidden="true" />
                <span>
                  {side === "ours"
                    ? match.team
                    : match.opponent || "Adversário"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <details className="fe-block fe-presets" open={props.presetsOpen}>
          <summary>
            <span>
              <strong>Formações salvas</strong>
              <small>
                {formations.length
                  ? `${formations.length} salva${formations.length > 1 ? "s" : ""} · reutilize em outras partidas`
                  : "Guarde esta P1 para reutilizar"}
              </small>
            </span>
          </summary>
          <div className="fe-presets-body">
            <label className="fe-field">
              <span className="ui-eyebrow">Carregar</span>
              <select
                className="ui-select"
                aria-label="Formação salva"
                value={props.presetId}
                onChange={(e) => props.onPresetSelect(e.target.value)}
              >
                <option value="">Formação personalizada</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="fe-field">
              <span className="ui-eyebrow">Nome</span>
              <input
                className="ui-input"
                aria-label="Nome da formação"
                value={props.presetName}
                maxLength={60}
                onChange={(e) => props.onPresetName(e.target.value)}
              />
            </label>
            <div className="fe-preset-actions">
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--sm"
                disabled={!props.presetName.trim()}
                onClick={props.onPresetSave}
              >
                <Save size={16} aria-hidden="true" />
                {props.presetId ? "Atualizar P1" : "Salvar P1"}
                {props.canApplyNow ? " e aplicar" : ""}
              </button>
              {props.presetId && (
                <button
                  type="button"
                  className="ui-btn ui-btn--ghost ui-btn--sm fe-danger"
                  onClick={props.onPresetDelete}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Excluir
                </button>
              )}
            </div>
          </div>
        </details>

        {!props.canConfirm && (
          <p className="fe-locked" role="note">
            <Info size={16} aria-hidden="true" />
            Partida em andamento: a escalação só pode ser confirmada no início
            ou no intervalo entre sets. Você ainda pode salvar formações.
          </p>
        )}
        <button
          type="button"
          className="ui-btn ui-btn--primary fe-confirm"
          disabled={!props.canConfirm}
          onClick={props.onConfirm}
        >
          <Check size={18} aria-hidden="true" />
          {props.confirmLabel}
        </button>
      </div>
    </div>
  );
}
