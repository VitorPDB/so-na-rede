import { removeArchivedMatch, restoreArchivedMatch } from "./historyActions";
import { useState } from "react";
import { Plus, Trash2, ChevronDown, Search } from "lucide-react";
import type { Match, ArchivedGame } from "./model";
import { project } from "./engine";
export function CommissionMatches({
  match,
  selected,
  onSelect,
  onChange,
  onNew,
}: {
  match: Match;
  selected: string;
  onSelect: (id: string) => void;
  onChange: (m: Match) => boolean;
  onNew: (details: { opponent: string; date: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [creating, setCreating] = useState(false),
    [opponent, setOpponent] = useState(""),
    [date, setDate] = useState(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }),
    [busy, setBusy] = useState(false),
    [trash, setTrash] = useState<ArchivedGame[]>([]);
  const games = (match.history ?? [])
    .filter((g) => g.id !== match.id)
    .slice()
    .reverse();
  const game = games.find((g) => g.id === selected),
    state = project(match);
  const label = (g: ArchivedGame) =>
    `${g.opponent} · ${new Date(g.date).toLocaleDateString("pt-BR")} · ${g.sets.join(" × ")}`;
  return (
    <section className="commission-matches" aria-label="Selecionar partida">
      <button
        className="ui-btn match-current"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          <small>Partida selecionada</small>
          <strong>
            {match.team} × {game?.opponent ?? match.opponent}
          </strong>
          <small>
            {game
              ? label(game)
              : `Partida atual · ${state.finished ? "Finalizada" : "Em andamento"} · ${state.sets.join(" × ")}`}
          </small>
        </span>
        <ChevronDown size={20} />
      </button>
      {open && (
        <div className="match-options">
          <button
            className="ui-btn ui-btn--primary"
            onClick={() => setCreating(!creating)}
          >
            <Plus size={18} />
            Iniciar nova partida
          </button>
          {creating && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!opponent.trim()) return;
                setBusy(true);
                try {
                  if (await onNew({ opponent: opponent.trim(), date })) {
                    setCreating(false);
                    setOpen(false);
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Adversário
                <input
                  className="ui-input"
                  required
                  maxLength={100}
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                />
              </label>
              <label>
                Data
                <input
                  className="ui-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <p className="ui-note">
                O jogo anterior será preservado no histórico e em uma cópia
                local.
              </p>
              <button className="ui-btn" disabled={busy}>
                {busy ? "Salvando…" : "Criar partida"}
              </button>
              <button
                type="button"
                className="ui-btn"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancelar
              </button>
            </form>
          )}
          <label className="match-search">
            <Search size={18} />
            <input
              className="ui-input"
              aria-label="Buscar partida"
              placeholder="Buscar adversário ou data"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            className="ui-btn match-choice"
            aria-pressed={!selected}
            onClick={() => {
              onSelect("");
              setOpen(false);
            }}
          >
            {match.team} × {match.opponent} · Partida atual
          </button>
          {games
            .filter((g) => label(g).toLowerCase().includes(query.toLowerCase()))
            .map((g) => (
              <div className="match-option" key={g.id}>
                <button
                  className="ui-btn match-choice"
                  aria-pressed={selected === g.id}
                  onClick={() => {
                    onSelect(g.id);
                    setOpen(false);
                  }}
                >
                  <span>
                    {match.team} × {g.opponent}
                    <small>
                      {new Date(g.date).toLocaleDateString("pt-BR")} ·{" "}
                      {g.sets.join(" × ")} ·{" "}
                      {g.finished ? "Finalizada" : "Incompleta"}
                    </small>
                  </span>
                </button>
                <button
                  className="ui-btn"
                  aria-label={`Excluir ${label(g)}`}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Excluir ${label(g)} do histórico da comissão? Você poderá desfazer enquanto esta página estiver aberta. A publicação pública e as cópias de segurança permanecem.`,
                      )
                    )
                      return;
                    if (onChange(removeArchivedMatch(match, g.id))) {
                      setTrash([...trash, g]);
                      if (selected === g.id) onSelect("");
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          {!games.length && (
            <p className="ui-note">
              As partidas anteriores aparecerão aqui após iniciar um novo jogo.
            </p>
          )}
          {games.length > 0 &&
            !games.some((g) =>
              label(g).toLowerCase().includes(query.toLowerCase()),
            ) && (
              <p className="ui-note">
                Nenhuma partida encontrada para essa busca.
              </p>
            )}
          <p className="ui-note">
            A seleção abre o relatório salvo. O jogo atual permanece disponível
            para continuar a marcação.
          </p>
        </div>
      )}
      {trash.length > 0 && (
        <div className="match-undo" role="status">
          <span>Partida removida do histórico da comissão.</span>
          <button
            className="ui-btn"
            onClick={() => {
              const g = trash.at(-1)!;
              if (onChange(restoreArchivedMatch(match, g)))
                setTrash(trash.slice(0, -1));
            }}
          >
            Desfazer exclusão
          </button>
        </div>
      )}
    </section>
  );
}
