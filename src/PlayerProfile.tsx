import { useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import {
  type Match,
  type Player,
  type Role,
  roleLabels,
  ratingProfiles,
} from "./model";
import { project, stats } from "./engine";
import { playerCareer } from "./career";
import { playerEvents } from "./assessment";
import { Photo } from "./PlayerPhoto";
import { CriteriaReport } from "./CriteriaReport";
import { CareerPartnerships } from "./SimpleStats";
import { PlayerVideos } from "./PlayerVideos";
export { Photo } from "./PlayerPhoto";

const grade = (value: number | null | undefined) =>
  value == null ? "—" : value.toFixed(1);
export function PlayerProfile({
  match,
  player,
  onChange,
  onBack,
}: {
  match: Match;
  player: Player;
  onChange: (player: Player) => boolean;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const career = playerCareer(
    match,
    player.id,
    roleFilter === "all" ? undefined : roleFilter,
  );
  const current = stats(
    playerEvents(project(match).events, player.id).filter(
      (e) => roleFilter === "all" || e.role === roleFilter,
    ),
    match.weights,
    match.ratingProfiles ?? ratingProfiles,
  );
  const changePhoto = (fields: Partial<NonNullable<Player["photo"]>>) =>
    player.photo &&
    onChange({ ...player, photo: { ...player.photo, ...fields } });
  const upload = async (file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 15 * 1024 * 1024
    ) {
      setError("Use JPG, PNG ou WebP de até 15 MB.");
      return;
    }
    setBusy(true);
    setError("");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(
        1,
        384 / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível preparar a foto.");
      ctx.fillStyle = "#18131d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      if (dataUrl.length > 160000)
        dataUrl = canvas.toDataURL("image/jpeg", 0.5);
      if (dataUrl.length > 160000)
        throw new Error("A imagem ficou muito grande. Escolha outra foto.");
      if (!onChange({ ...player, photo: { dataUrl, x: 50, y: 50, zoom: 1 } }))
        throw new Error(
          "Não foi possível salvar a foto. O perfil anterior foi preservado.",
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível abrir essa imagem.",
      );
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };
  const tone = (v: number | null | undefined) =>
    v == null ? "empty" : v >= 6 ? "good" : v >= 4 ? "medium" : "bad";
  return (
    <div className="pf">
      <button
        type="button"
        className="ui-btn ui-btn--ghost ui-btn--sm pf-back"
        onClick={onBack}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Elenco
      </button>

      <section className="ui-card pf-hero">
        <div className="pf-portrait">
          <Photo player={player} className="pf-photo" />
          <label className="pf-photo-btn" title="Trocar foto">
            <Camera size={16} aria-hidden="true" />
            <span className="sr-only">
              {busy ? "Preparando foto…" : "Escolher foto"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="pf-id">
          <span className="ui-eyebrow">
            #{String(player.number).padStart(2, "0")} · Perfil do jogador
            {player.libero && <span className="ui-tag">Líbero</span>}
          </span>
          <h2>{player.name}</h2>
          <span className="ro-positions">
            {player.positions.map((pos, i) => (
              <i key={pos} className={i === 0 ? "is-main" : ""}>
                {pos}
              </i>
            ))}
          </span>
          <small>
            {career.completed.length}{" "}
            {career.completed.length === 1
              ? "partida concluída"
              : "partidas concluídas"}{" "}
            com ações · {career.rated.length} com nota
          </small>
        </div>
        <div className={"pf-now " + tone(current.rating)}>
          <span className="ui-eyebrow">Nota atual</span>
          <strong>{grade(current.rating)}</strong>
          <small>vs {match.opponent}</small>
          <small>
            {current.sample} · {current.count} ações
          </small>
        </div>
      </section>
      {busy && <p className="ui-note">Preparando foto…</p>}
      {error && (
        <p className="ui-alert" role="alert">
          {error}
        </p>
      )}

      <div className="pf-filter">
        <div
          className="ui-chips"
          role="radiogroup"
          aria-label="Função no histórico"
        >
          {(["all", ...Object.keys(roleLabels)] as (Role | "all")[]).map(
            (role) => (
              <button
                type="button"
                key={role}
                role="radio"
                aria-checked={roleFilter === role}
                onClick={() => setRoleFilter(role)}
              >
                {role === "all" ? "Todas as funções" : roleLabels[role]}
              </button>
            ),
          )}
        </div>
        <p className="ui-note">
          Filtra a partida atual e o histórico pela função exercida em cada
          ação. Jogos antigos sem função aparecem só em Todas as funções.
        </p>
      </div>

      <div className="pf-grid">
        <section className="ui-card">
          <header className="ui-card-head">
            <div>
              <h2>Partida atual</h2>
              <p>Contra {match.opponent}</p>
            </div>
          </header>
          <div className="pf-pair">
            <div className="pulse-metric good">
              <span className="ui-eyebrow">Melhor fundamento</span>
              <strong>{current.best?.label ?? "Sem dados"}</strong>
              <small>{current.reason(current.best)}</small>
            </div>
            <div className="pulse-metric bad">
              <span className="ui-eyebrow">Para evoluir</span>
              <strong>{current.worst?.label ?? "Sem variedade"}</strong>
              <small>{current.reason(current.worst)}</small>
            </div>
          </div>
          {current.list.some((m) => m.count) ? (
            <div className="rp-quality pf-skills">
              {current.list
                .filter((m) => m.count)
                .map((m) => (
                  <div className="rp-quality-row" key={m.skill}>
                    <span>{m.label}</span>
                    <span className="ui-meter" aria-hidden="true">
                      <i style={{ width: `${m.quality * 100}%` }} />
                    </span>
                    <strong>{Math.round(m.quality * 100)}%</strong>
                    <small>
                      {m.count} ações · {m.errors} falhas
                    </small>
                  </div>
                ))}
            </div>
          ) : (
            <p className="ui-empty">
              Nenhuma ação deste jogador nesta partida.
            </p>
          )}
        </section>

        <section className="ui-card">
          <header className="ui-card-head">
            <div>
              <h2>Desempenho histórico</h2>
              <p>Média por partida concluída; jogos sem nota não entram.</p>
            </div>
          </header>
          <div className="pf-tiles">
            {[
              ["Média de notas", grade(career.average)],
              ["Maior nota", grade(career.best?.player?.rating)],
              ["Menor nota", grade(career.worst?.player?.rating)],
              ["Pontos", career.totals.points],
              ["Ações", career.totals.count],
              ["Falhas", career.totals.errors],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <dl className="prep-facts pf-facts">
            <div>
              <dt>Melhor jogo</dt>
              <dd>
                {career.best
                  ? `${career.best.game.opponent} · ${new Date(career.best.game.date).toLocaleDateString("pt-BR")} · ${grade(career.best.player!.rating)}`
                  : "Após concluir uma partida com nota"}
              </dd>
            </div>
            <div>
              <dt>Ponto forte</dt>
              <dd>
                {career.strongest
                  ? `${career.strongest.label} · ${Math.round(career.strongest.quality * 100)}% · ${career.strongest.count} ações${career.strongest.count < 3 ? " · provisório" : ""}`
                  : "Sem ações em partidas concluídas"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <CareerPartnerships match={match} playerId={player.id} />
      <PlayerVideos key={player.id} match={match} playerId={player.id} />
      <CriteriaReport
        events={playerEvents(project(match).events, player.id).filter(
          (e) => roleFilter === "all" || e.role === roleFilter,
        )}
        players={match.players}
        fixedPlayer={player.id}
        title="Técnicas e contexto · partida atual"
      />
      {player.photo && (
        <details className="ui-card pf-photo-edit">
          <summary>
            <span>
              <strong>Enquadramento da foto</strong>
              <small>Ajuste posição e zoom; salva a cada alteração</small>
            </span>
          </summary>
          <div className="pf-sliders">
            {(
              [
                ["Horizontal", "x", 0, 100, 1, "Enquadramento horizontal"],
                ["Vertical", "y", 0, 100, 1, "Enquadramento vertical"],
                ["Zoom", "zoom", 1, 3, 0.05, "Zoom da foto"],
              ] as const
            ).map(([label, key, min, max, step, aria]) => (
              <label key={key} className="pf-slider">
                <span>{label}</span>
                <input
                  aria-label={aria}
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={player.photo![key]}
                  onChange={(e) =>
                    changePhoto({ [key]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
            <div className="fe-preset-actions">
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--sm"
                onClick={() => changePhoto({ x: 50, y: 50, zoom: 1 })}
              >
                Centralizar
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--ghost ui-btn--sm fe-danger"
                onClick={() => onChange({ ...player, photo: undefined })}
              >
                Remover foto
              </button>
            </div>
            <p className="ui-note">
              Foto comprimida no dispositivo e incluída no backup JSON.
            </p>
          </div>
        </details>
      )}

      <section className="ui-card">
        <header className="ui-card-head">
          <div>
            <h2>Jogos concluídos</h2>
            <p>{career.completed.length} no histórico</p>
          </div>
        </header>
        {career.completed.length ? (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Adversário</th>
                  <th scope="col" className="num">
                    Sets
                  </th>
                  <th scope="col" className="num">
                    Nota
                  </th>
                  <th scope="col" className="num">
                    Ações
                  </th>
                  <th scope="col" className="num">
                    Pontos
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...career.completed].reverse().map((row) => (
                  <tr key={row.game.id}>
                    <td>
                      {new Date(row.game.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td>{row.game.opponent}</td>
                    <td className="num">{row.game.sets.join("–")}</td>
                    <td className="num">{grade(row.player!.rating)}</td>
                    <td className="num">{row.player!.count}</td>
                    <td className="num">{row.player!.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ui-empty">
            O histórico começa com as partidas concluídas a partir desta versão.
            Jogos antigos precisam de seus backups.
          </p>
        )}
      </section>
    </div>
  );
}
