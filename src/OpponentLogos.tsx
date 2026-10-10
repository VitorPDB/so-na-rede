import { useState } from "react";
import type { Match } from "./model";

export const teamKey = (name: string) => name.trim().toLocaleLowerCase("pt-BR");
export function opponentTeam(match: Match) {
  return match.opponentTeams?.find(
    (team) => teamKey(team.name) === teamKey(match.opponent),
  );
}

export function OpponentLogos({
  match,
  onChange,
}: {
  match: Match;
  onChange: (match: Match) => boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = opponentTeam(match);
  const upload = async (file?: File) => {
    if (!file) return;
    setError("");
    if (!match.opponent.trim()) {
      setError("Preencha o nome do adversário antes de adicionar o logo.");
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 15 * 1024 * 1024
    ) {
      setError("Use PNG, JPG ou WebP de até 15 MB.");
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const scale = Math.min(
        1,
        256 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar o logo.");
      // PNG keeps the original alpha channel; never paint a square behind it.
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const logo = canvas.toDataURL("image/png");
      if (logo.length > 200000)
        throw new Error(
          "A imagem ficou muito grande. Use um logo mais simples.",
        );
      const team = {
        id: current?.id ?? crypto.randomUUID(),
        name: match.opponent.trim(),
        logo,
      };
      const opponentTeams = [
        ...(match.opponentTeams ?? []).filter(
          (t) => teamKey(t.name) !== teamKey(team.name),
        ),
        team,
      ];
      if (!onChange({ ...match, opponentTeams }))
        throw new Error(
          "Não foi possível salvar. O logo anterior foi preservado.",
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível abrir a imagem.",
      );
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };
  return (
    <div className="opponent-logo-settings">
      <label>
        Adversários cadastrados
        <select
          aria-label="Adversário cadastrado"
          value={current?.id ?? ""}
          disabled={busy}
          onChange={(e) => {
            const team = match.opponentTeams?.find(
              (t) => t.id === e.target.value,
            );
            if (team) onChange({ ...match, opponent: team.name });
            else onChange({ ...match, opponent: "" });
          }}
        >
          <option value="">Adversário personalizado</option>
          {(match.opponentTeams ?? []).map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <div className="opponent-logo-editor">
        {current?.logo ? (
          <img
            className="opponent-logo-preview"
            src={current.logo}
            alt={"Logo de " + match.opponent}
          />
        ) : (
          <span className="logo-empty">Sem logo</span>
        )}
        <div>
          <label className="photo-upload">
            {busy
              ? "Preparando logo…"
              : current?.logo
                ? "Trocar logo do adversário"
                : "Adicionar logo do adversário"}
            <input
              aria-label="Imagem do logo do adversário"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {current?.logo && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                onChange({
                  ...match,
                  opponentTeams: match.opponentTeams?.map((team) =>
                    team.id === current.id
                      ? { ...team, logo: undefined }
                      : team,
                  ),
                })
              }
            >
              Remover logo
            </button>
          )}
        </div>
      </div>
      <p className="muted">
        O logo fica associado ao nome do time e pode ser reutilizado nas
        próximas partidas. PNG transparente mantém o escudo sem fundo. Imagens
        com fundo preservam o fundo original.
      </p>
      {error && (
        <p className="profile-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
