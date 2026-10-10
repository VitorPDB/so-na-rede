import {
  Activity,
  ArrowRight,
  ClipboardList,
  Flag,
  LayoutDashboard,
  Settings2,
  Plus,
  Users,
  Volleyball,
} from "lucide-react";
import { type Match, type Projection, type Zone, roleLabels } from "./model";
import { Photo } from "./PlayerProfile";
import { formationAt } from "./formation";

export type Page =
  | "live"
  | "prepare"
  | "postgame"
  | "analysis"
  | "report"
  | "history"
  | "roster"
  | "formations"
  | "profile"
  | "settings";
export const areas = [
  {
    id: "live",
    label: "Partida",
    description: "Preparar e registrar",
    icon: Volleyball,
    pages: ["live", "prepare", "postgame"],
  },
  {
    id: "analysis",
    label: "Análise",
    description: "Entender o jogo",
    icon: LayoutDashboard,
    pages: ["analysis", "report", "history"],
  },
  {
    id: "roster",
    label: "Time",
    description: "Jogadores e formações",
    icon: Users,
    pages: ["roster", "formations", "profile"],
  },
  {
    id: "settings",
    label: "Ajustes",
    description: "Preferências e dados",
    icon: Settings2,
    pages: ["settings"],
  },
] as const;
export function areaOf(page: Page) {
  return areas.find((area) =>
    (area.pages as readonly string[]).includes(page),
  )!;
}
export const pageTitles: Record<Page, string> = {
  live: "Jogo ao vivo",
  prepare: "Preparar partida",
  postgame: "Registrar pós-jogo",
  analysis: "Leitura da partida",
  report: "Números do jogo",
  history: "Memória do time",
  roster: "Nosso time",
  formations: "Formações",
  profile: "Perfil do jogador",
  settings: "Ajustes do app",
};
const tabs = [
  { id: "live", label: "Ao vivo", icon: Activity },
  { id: "prepare", label: "Preparação", icon: Flag },
  { id: "postgame", label: "Pós-jogo", icon: ClipboardList },
  { id: "analysis", label: "Visão do jogo", icon: LayoutDashboard },
  { id: "report", label: "Estatísticas", icon: ClipboardList },
  { id: "history", label: "Histórico", icon: ClipboardList },
  { id: "roster", label: "Elenco", icon: Users },
  { id: "formations", label: "Formações", icon: Volleyball },
] as const;
export function WorkspaceTabs({
  page,
  onPage,
}: {
  page: Page;
  onPage: (page: Page) => void;
}) {
  const area = areaOf(page);
  const visible = tabs.filter((tab) =>
    (area.pages as readonly string[]).includes(tab.id),
  );
  if (!visible.length) return null;
  return (
    <nav className="workspace-tabs" aria-label={`Seções de ${area.label}`}>
      {visible.map(({ id, label, icon: Icon }) => (
        <button
          type="button"
          key={id}
          aria-current={
            page === id || (page === "profile" && id === "roster")
              ? "page"
              : undefined
          }
          onClick={() => onPage(id)}
        >
          <Icon size={18} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
export function FormationCourt({
  match,
  lineup,
  roles,
}: {
  match: Match;
  lineup: string[];
  roles: Projection["roles"];
}) {
  return (
    <div className="prep-mini-court" aria-label="Formação nas zonas 1 a 6">
      {([4, 3, 2, 5, 6, 1] as Zone[]).map((zone) => {
        const p = match.players.find((p) => p.id === lineup[zone - 1]);
        return (
          <div key={zone}>
            <span className="court-zone">Z{zone}</span>
            {p && (
              <>
                <Photo player={p} className="an-court-photo" />
                <strong>{p.name}</strong>
                <small>
                  {roleLabels[p.libero ? "libero" : roles[zone - 1]]}
                </small>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function FormationLibrary({
  match,
  state,
  onEdit,
}: {
  match: Match;
  state: Projection;
  onEdit: (id?: string) => void;
}) {
  const saved = match.formations ?? [];
  return (
    <div className="fl">
      <div className="an-toolbar">
        <p className="ro-summary">
          Salve a P1 e escolha P1–P6 ao preparar o set. A função de cada atleta
          acompanha a formação.
        </p>
        <button
          type="button"
          className="ui-btn ui-btn--primary ui-btn--sm"
          onClick={() => onEdit()}
        >
          <Plus size={16} aria-hidden="true" />
          Nova formação
        </button>
      </div>
      <div className="fl-grid">
        <article className="ui-card fl-card is-current">
          <header className="fl-head">
            <div>
              <span className="ui-eyebrow">Em quadra agora</span>
              <h2>Formação do set {state.set}</h2>
            </div>
            <span className="prep-badge">
              P{state.roles.indexOf("setter") + 1 || "—"}
            </span>
          </header>
          <FormationCourt
            match={match}
            lineup={state.lineup}
            roles={state.roles}
          />
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            onClick={() => onEdit()}
          >
            Revisar escalação <ArrowRight size={16} aria-hidden="true" />
          </button>
        </article>
        {saved.map((f) => {
          const formation = formationAt(f.lineup, 1);
          return (
            <article className="ui-card fl-card" key={f.id}>
              <header className="fl-head">
                <div>
                  <span className="ui-eyebrow">Formação salva</span>
                  <h2>{f.name}</h2>
                </div>
                <span className="prep-badge">P1</span>
              </header>
              <FormationCourt match={match} {...formation} />
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--sm"
                onClick={() => onEdit(f.id)}
              >
                Abrir formação <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
          );
        })}
        {!saved.length && (
          <button type="button" className="fl-empty" onClick={() => onEdit()}>
            <Plus size={22} aria-hidden="true" />
            <strong>Salvar a primeira formação</strong>
            <small>Guarde sua P1 para reutilizar em outras partidas.</small>
          </button>
        )}
      </div>
    </div>
  );
}
