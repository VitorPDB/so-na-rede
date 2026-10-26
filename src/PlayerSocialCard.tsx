import { useEffect, useState } from "react";
import { cloud } from "./cloud";
import { SocialCardExport } from "./SocialCardExport";
import { validSocialCardData, type SocialCardData } from "./socialCardData";
export function PlayerSocialCard({
  token,
  matchId,
}: {
  token: string;
  matchId: string;
}) {
  const [data, setData] = useState<SocialCardData>(),
    [error, setError] = useState(""),
    [request, setRequest] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setData(undefined);
    setError("");
    setRequest(0);
  }, [token, matchId]);
  useEffect(() => {
    if (!request || !cloud) return;
    let active = true;
    setBusy(true);
    setError("");
    void cloud
      .rpc("player_social_card", { token, game_id: matchId })
      .then(({ data, error }) => {
        if (!active) return;
        setBusy(false);
        if (error)
          setError(
            "Card indisponível. Entre novamente ou peça à comissão para ativar a atualização.",
          );
        else if (!data)
          setError(
            "A comissão precisa republicar esta partida para gerar seu card.",
          );
        else if (!validSocialCardData(data))
          setError("Dados do card inválidos. Solicite uma nova publicação.");
        else setData(data);
      });
    return () => {
      active = false;
    };
  }, [token, matchId, request]);
  return (
    <section aria-label="Compartilhar minha partida">
      {data ? (
        <SocialCardExport data={data} />
      ) : (
        <button
          className="ui-btn"
          disabled={busy}
          onClick={() => setRequest(request + 1)}
        >
          {busy ? "Carregando card…" : "Meu card para compartilhar"}
        </button>
      )}
      {error && <p role="status">{error}</p>}
    </section>
  );
}
