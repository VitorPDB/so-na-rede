import { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { skills, type Skill } from "./model";
import { analysisFields, type criterionDistribution } from "./criteriaStats";
import { FoundationCourt } from "./FoundationCourt";
import { ModalDrawer } from "./ModalDrawer";

type Distribution = ReturnType<typeof criterionDistribution>;
type Foundation = Exclude<Skill, "opponent">;
const order: Foundation[] = [
  "attack",
  "serve",
  "reception",
  "set",
  "block",
  "defense",
];
const summaries: Record<Foundation, string[]> = {
  attack: ["attackType", "attackBlockers", "attackDirection"],
  serve: ["serveType", "execution", "difficulty"],
  reception: ["passQuality", "receivedServe", "technique"],
  set: ["technique", "setDirection", "ballConstraint"],
  block: ["group", "blockQuality", "difficulty"],
  defense: ["passQuality", "incomingBall", "technique"],
};
const colors = [
  "var(--c-accent)",
  "var(--c-info)",
  "var(--c-gold)",
  "#8f75b5",
  "#62a18e",
  "#bb7d86",
  "#719bb5",
  "#b39362",
  "#7f8a5b",
  "#af789f",
  "#879197",
];
const label = (d: Distribution) =>
  d.key === "setType"
    ? "Tempo / tipo do levantamento"
    : d.key === "attackBlockers"
      ? "Bloqueio enfrentado"
      : d.key === "approach"
        ? "Passada"
        : d.label;
const leading = (d: Distribution) =>
  d.leaders.length
    ? d.leaders.map((r) => r.label).join(" / ")
    : "Sem informação";

function DistributionChart({ data }: { data: Distribution }) {
  const rows = data.rows
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  let offset = 0;
  const slices = rows.map((r, i) => {
    const start = offset;
    offset += r.percent;
    return `${colors[i % colors.length]} ${start}% ${offset}%`;
  });
  return (
    <section className="fv-distribution" aria-label={label(data)}>
      <h3>{label(data)}</h3>
      <p className="fv-sample">
        {data.known} de {data.total} participações com informação
      </p>
      {data.known ? (
        <>
          <div
            className="fv-pie"
            aria-hidden="true"
            style={{ background: `conic-gradient(${slices.join(",")})` }}
          />
          <ul className="fv-legend">
            {rows.map((r, i) => (
              <li key={r.id}>
                <i
                  style={{ background: colors[i % colors.length] }}
                  aria-hidden="true"
                />
                <div>
                  <span>{r.label}</span>
                  <small>
                    {r.rating === null
                      ? "Sem execuções avaliáveis"
                      : `Nota ${r.rating.toFixed(1)} · ${r.rated} avaliadas`}
                  </small>
                </div>
                <strong>
                  {r.percent.toFixed(0)}%<small>{r.count} registros</small>
                </strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="ui-empty">
          {data.total
            ? "Este detalhe não foi registrado neste recorte."
            : "Nenhuma participação neste recorte."}
        </p>
      )}
      {data.missing > 0 && (
        <p className="fv-sample">
          {data.missing} sem informação, fora das porcentagens.
        </p>
      )}
    </section>
  );
}

export function FoundationAtlas({
  skill,
  distribution,
  period,
}: {
  skill: Skill | "all";
  distribution: (skill: Skill, key: string) => Distribution;
  period: string;
}) {
  const [expanded, setExpanded] = useState<Foundation | null>(null);
  const visible = order.filter((s) => skill === "all" || skill === s);
  const selectedFields = expanded
    ? analysisFields.filter((f) => f.skills.includes(expanded))
    : [];
  const priority = [
    "attackType",
    "attackBlockers",
    "setType",
    "approach",
    "attackDirection",
  ];
  selectedFields.sort(
    (a, b) =>
      (priority.includes(a.key) ? priority.indexOf(a.key) : 99) -
      (priority.includes(b.key) ? priority.indexOf(b.key) : 99),
  );
  return (
    <div className="fv-atlas">
      {visible.map((s) => {
        const sample = distribution(s, "difficulty");
        const block = distribution(
          s,
          s === "attack" ? "attackBlockers" : "group",
        );
        const direction =
          s === "attack"
            ? distribution(s, "attackDirection")
            : s === "set"
              ? distribution(s, "setDirection")
              : null;
        const blockers =
          block.leaders.length === 1
            ? (
                { none: 0, single: 1, double: 2, triple: 3 } as Record<
                  string,
                  number
                >
              )[block.leaders[0].id]
            : undefined;
        const route =
          direction?.leaders.length === 1 ? direction.leaders[0].id : undefined;
        return (
          <section className="fv-section" key={s} aria-label={skills[s].label}>
            <header className="fv-heading">
              <div>
                <h3>{skills[s].label}</h3>
                <p>
                  {sample.total} participações · {period}
                </p>
              </div>
              <button
                className="ui-btn ui-btn--secondary"
                onClick={() => setExpanded(s)}
                aria-label={`Expandir ${skills[s].label}`}
              >
                Expandir <ArrowUpRight size={18} />
              </button>
            </header>
            <div className="fv-layout">
              <FoundationCourt
                skill={s}
                blockers={blockers}
                direction={route}
              />
              <dl className="fv-facts">
                {summaries[s].map((key) => {
                  const d = distribution(s, key);
                  return (
                    <div key={key}>
                      <dt>{label(d)}</dt>
                      <dd>{leading(d)}</dd>
                      <small>
                        {d.known} informadas · {d.missing} sem detalhe
                        {d.leaders.length > 1 ? " · empate" : ""}
                      </small>
                    </div>
                  );
                })}
              </dl>
            </div>
            <p className="fv-note">
              {s === "attack"
                ? "Bloqueio e direção são tendências independentes, não a reconstrução de uma jogada. Sem marcação ou com empate, a quadra não escolhe uma tendência."
                : s === "reception"
                  ? "Trajetória ilustrativa até o levantador; o destino exato da recepção não é coletado. As estatísticas são independentes."
                  : s === "set"
                    ? "A trajetória indica a direção mais registrada, não a posição exata dos jogadores. Sem marcação ou com empate, nenhuma direção é escolhida."
                    : "Ilustração do fundamento. As estatísticas ao lado são calculadas separadamente."}
            </p>
          </section>
        );
      })}
      {expanded && (
        <ModalDrawer
          className="fv-dialog"
          label={`${skills[expanded].label} · estatísticas gerais`}
          onClose={() => setExpanded(null)}
        >
          <header className="fv-modal-heading">
            <div>
              <h2>{skills[expanded].label} · estatísticas gerais</h2>
              <p>{period}</p>
            </div>
            <button
              className="ui-btn"
              aria-label="Fechar estatísticas"
              onClick={() => setExpanded(null)}
            >
              <X size={20} />
              <span>Fechar</span>
            </button>
          </header>
          <p className="fv-explanation">
            <strong>São estatísticas independentes.</strong> Cada gráfico reúne
            as marcações daquele critério. As porcentagens consideram somente os
            registros informados; não representam combinações entre critérios.
          </p>
          <div className="fv-charts">
            {selectedFields.map((f) => (
              <DistributionChart
                key={f.key}
                data={distribution(expanded, f.key)}
              />
            ))}
          </div>
        </ModalDrawer>
      )}
    </div>
  );
}
