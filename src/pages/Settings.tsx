import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Database,
  Download,
  FolderOpen,
  Palette,
  RotateCcw,
  Scale,
  ShieldHalf,
  Sparkles,
  Swords,
  Trophy,
  Wifi,
} from "lucide-react";
import {
  type Match,
  type Role,
  type RoleWeights,
  type Weights,
  ratingProfiles,
  roleLabels,
  skills,
} from "../model";
import { OpponentLogos } from "../OpponentLogos";
import { defaultDefenseMap } from "../PlayerChooser";
import { RatingGuide } from "../ExecutionSummary";
import { type Theme, themes } from "../theme";

const sections = [
  { id: "settings-match", label: "Partida", icon: Swords },
  { id: "settings-appearance", label: "Aparência", icon: Palette },
  { id: "settings-rating", label: "Notas por função", icon: Trophy },
  { id: "settings-collective", label: "Nota coletiva", icon: Scale },
  { id: "settings-defense", label: "Defesa", icon: ShieldHalf },
  { id: "settings-publish", label: "Publicação", icon: Wifi },
  { id: "settings-data", label: "Dados", icon: Database },
];

function Section({
  id,
  title,
  description,
  children,
  tone,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "danger";
}) {
  return (
    <section
      className={"ui-card st-card" + (tone ? " is-" + tone : "")}
      id={id}
      aria-labelledby={id + "-title"}
    >
      <header className="ui-card-head">
        <div>
          <h2 id={id + "-title"}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function WeightRow({
  label,
  value,
  ariaLabel,
  onChange,
}: {
  label: string;
  value: number;
  ariaLabel?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="st-weight">
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <label className="st-weight-input">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="100"
          aria-label={ariaLabel ?? label}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 0 && n <= 100) onChange(n);
          }}
        />
        <span>%</span>
      </label>
    </div>
  );
}

export function Settings({
  match,
  theme,
  vibrate,
  canRestartSet,
  currentSet,
  cloudPanel,
  onChange,
  onTheme,
  onVibrate,
  onFormation,
  onExport,
  onImport,
  onNewMatch,
  onRestartSet,
}: {
  match: Match;
  theme: Theme;
  vibrate: boolean;
  canRestartSet: boolean;
  currentSet: number;
  cloudPanel: ReactNode;
  onChange: (match: Match) => boolean;
  onTheme: (theme: Theme) => void;
  onVibrate: (value: boolean) => void;
  onFormation: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNewMatch: () => void;
  onRestartSet: () => void;
}) {
  const [role, setRole] = useState<Role>("setter");
  const profiles = match.ratingProfiles ?? ratingProfiles;
  const defense = match.defenseMap ?? defaultDefenseMap;
  const formatLocked = match.audit.length > 0;
  const roleTotal = Object.entries(profiles[role])
    .filter(([k]) => k !== "errors")
    .reduce((n, [, v]) => n + v, 0);

  return (
    <div className="st">
      <nav className="st-nav" aria-label="Seções dos ajustes">
        {sections.map(({ id, label, icon: Icon }) => (
          <a key={id} href={"#" + id}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </a>
        ))}
      </nav>

      <div className="st-sections">
        <Section
          id="settings-match"
          title="Partida"
          description="Times, escudo e formato. Salvo a cada alteração."
        >
          <div className="prep-fields">
            <label className="fe-field">
              <span className="ui-eyebrow">Nosso time</span>
              <input
                className="ui-input"
                value={match.team}
                onChange={(e) => onChange({ ...match, team: e.target.value })}
              />
            </label>
            <label className="fe-field">
              <span className="ui-eyebrow">Adversário</span>
              <input
                className="ui-input"
                value={match.opponent}
                onChange={(e) =>
                  onChange({ ...match, opponent: e.target.value })
                }
              />
            </label>
          </div>
          <div className="fe-field">
            <span className="ui-eyebrow">Formato</span>
            <div
              className="ui-segmented prep-format"
              role="radiogroup"
              aria-label="Formato da partida"
            >
              {([5, 3] as const).map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={match.bestOf === n}
                  disabled={formatLocked}
                  onClick={() => onChange({ ...match, bestOf: n })}
                >
                  Melhor de {n}
                </button>
              ))}
            </div>
            <small className="prep-help">
              Sets até 25, decisivo até 15, sempre com diferença de 2.
              {formatLocked ? " Travado após o primeiro registro." : ""}
            </small>
          </div>
          <div className="prep-logos">
            <span className="ui-eyebrow">Escudo do adversário</span>
            <OpponentLogos match={match} onChange={onChange} />
          </div>
          <div className="st-rows">
            <button type="button" className="st-row" onClick={onFormation}>
              <span>
                <strong>Formação e primeiro saque</strong>
                <small>Escalação inicial, P1–P6 e quem saca</small>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={vibrate}
              className="st-row"
              onClick={() => onVibrate(!vibrate)}
            >
              <span>
                <strong>Vibrar no ponto deles</strong>
                <small>
                  Feedback tátil ao registrar erro ou ponto adversário
                </small>
              </span>
              <span className="ui-switch" aria-hidden="true">
                <i />
              </span>
            </button>
          </div>
        </Section>

        <Section
          id="settings-appearance"
          title="Aparência"
          description="O tema fica salvo neste dispositivo."
        >
          <div className="theme-picker" role="radiogroup" aria-label="Tema">
            {themes.map((t) => (
              <button
                type="button"
                key={t.id}
                role="radio"
                aria-checked={theme === t.id}
                className={"theme-option theme-" + t.id}
                onClick={() => onTheme(t.id)}
              >
                <span className="theme-swatch" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <strong>{t.label}</strong>
                  <small>{t.hint}</small>
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section
          id="settings-rating"
          title="Notas por função"
          description="A função vem da formação, não do cadastro. Fundamentos sem ações não entram na nota."
        >
          <div
            className="ui-chips st-roles"
            role="radiogroup"
            aria-label="Função para configurar nota"
          >
            {(Object.keys(roleLabels) as Role[]).map((r) => (
              <button
                type="button"
                key={r}
                role="radio"
                aria-checked={role === r}
                onClick={() => setRole(r)}
              >
                {roleLabels[r]}
              </button>
            ))}
          </div>
          <div className="st-weights" key={role}>
            {(
              Object.entries(profiles[role]) as [keyof RoleWeights, number][]
            ).map(([key, value]) => (
              <WeightRow
                key={key}
                label={
                  key === "errors"
                    ? "Penalidade extra · registros antigos"
                    : skills[key].label
                }
                ariaLabel={"Peso " + roleLabels[role] + " " + key}
                value={value}
                onChange={(n) =>
                  onChange({
                    ...match,
                    ratingProfiles: {
                      ...profiles,
                      [role]: { ...profiles[role], [key]: n },
                    },
                  })
                }
              />
            ))}
          </div>
          <p className="ui-note">
            Soma dos fundamentos: <b>{roleTotal}%</b>. Os pesos são normalizados
            entre os fundamentos observados, então a soma não precisa ser 100.
          </p>
        </Section>

        <Section
          id="settings-collective"
          title="Pesos da nota coletiva"
          description="Nos novos registros, dificuldade e execução já incluem o custo do erro; a penalidade extra vale só para registros antigos."
        >
          <div className="st-weights">
            {(Object.entries(match.weights) as [keyof Weights, number][]).map(
              ([key, value]) => (
                <WeightRow
                  key={key}
                  label={
                    key === "support"
                      ? "Defesa + levantamento"
                      : key === "errors"
                        ? "Penalidade extra · registros antigos"
                        : skills[key].label
                  }
                  value={value}
                  onChange={(n) =>
                    onChange({
                      ...match,
                      weights: { ...match.weights, [key]: n },
                    })
                  }
                />
              ),
            )}
          </div>
          <p className="ui-note">
            Amostras pequenas usam 3 ações neutras como referência. A nota apoia
            a análise técnica; não substitui a avaliação do treinador.
          </p>
        </Section>

        <RatingGuide />

        <Section
          id="settings-defense"
          title="Posicionamento de defesa"
          description="Onde cada função do fundo aparece no seletor de jogador. Jogadores da rede ficam nas zonas 2–4. Não altera a rotação."
        >
          <div className="st-defense">
            {(Object.keys(roleLabels) as Role[]).map((r) => (
              <div className="st-defense-row" key={r}>
                <span>{roleLabels[r]}</span>
                <div
                  className="ui-segmented ui-segmented--compact"
                  role="radiogroup"
                  aria-label={"Zona de defesa: " + roleLabels[r]}
                >
                  {([1, 5, 6] as const).map((z) => (
                    <button
                      type="button"
                      key={z}
                      role="radio"
                      aria-checked={defense[r] === z}
                      onClick={() =>
                        onChange({
                          ...match,
                          defenseMap: { ...defense, [r]: z },
                        })
                      }
                    >
                      Z{z}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div id="settings-publish">{cloudPanel}</div>

        <Section
          id="settings-data"
          title="Dados e continuidade"
          description="Este jogo fica salvo neste navegador. Exporte o JSON para preservar a auditoria e transferir uma cópia."
        >
          <div className="st-data">
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              aria-label="Exportar JSON"
              onClick={onExport}
            >
              <Download size={18} aria-hidden="true" />
              Exportar backup JSON
            </button>
            <label className="ui-btn ui-btn--secondary st-file">
              <FolderOpen size={18} aria-hidden="true" />
              Restaurar backup JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImport(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="st-danger">
            <span className="ui-eyebrow">Ações com confirmação</span>
            <button type="button" className="st-row" onClick={onNewMatch}>
              <Sparkles size={18} aria-hidden="true" />
              <span>
                <strong>Nova partida</strong>
                <small>
                  O resumo deste jogo vai para o histórico. Elenco, fotos,
                  formações e pesos são mantidos.
                </small>
              </span>
            </button>
            <button
              type="button"
              className="st-row"
              disabled={!canRestartSet}
              onClick={onRestartSet}
            >
              <RotateCcw size={18} aria-hidden="true" />
              <span>
                <strong>Reiniciar apenas o set {currentSet}</strong>
                <small>
                  Placar volta a 0–0 e as ações do set saem das estatísticas.
                  Sets anteriores ficam. Dá para desfazer.
                </small>
              </span>
            </button>
          </div>
          <p className="ui-note">
            Instalação no Android: abra a versão publicada em HTTPS e use o menu
            do Chrome → Instalar app. O modo offline fica pronto após o primeiro
            acesso.
          </p>
        </Section>
      </div>
    </div>
  );
}
