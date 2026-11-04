import { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { skills, type Skill } from "./model";
import { analysisFields, type criterionDistribution } from "./criteriaStats";
import { StickmanCourt } from "./StickmanCourt";
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
  attack: [
    "attackType",
    "attackDirection",
    "approach",
    "setType",
    "incomingSet",
  ],
  serve: ["serveType", "execution", "difficulty"],
  reception: ["passQuality", "receivedServe", "technique"],
  set: ["setDirection", "incomingSet", "incomingPass", "setType"],
  block: ["group", "blockQuality", "difficulty"],
  defense: ["passQuality", "incomingBall", "technique"],
};
const colors = [
  "#00b8d9",
  "#ff7043",
  "#f5c400",
  "#2684ff",
  "#e83e8c",
  "#00ad7c",
  "#845ef7",
  "#bd7100",
  "#cc3344",
  "#397d75",
  "#777777",
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
  const [mode, setMode] = useState<"pie" | "bars">(
    data.rows.filter((r) => r.count > 0).length <= 4 ? "pie" : "bars",
  );
  const color = (id: string) =>
    colors[data.rows.findIndex((r) => r.id === id) % colors.length];
  const rows = data.rows
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  let offset = 0;
  const slices = rows.map((r) => {
    const start = offset;
    offset += r.percent;
    return `${color(r.id)} ${start}% ${offset}%`;
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
            className="fv-chart-switch"
            role="group"
            aria-label={`Formato: ${label(data)}`}
          >
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              aria-pressed={mode === "pie"}
              onClick={() => setMode("pie")}
            >
              Pizza
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              aria-pressed={mode === "bars"}
              onClick={() => setMode("bars")}
            >
              Barras
            </button>
          </div>
          {mode === "pie" && (
            <div
              className="fv-pie"
              aria-hidden="true"
              style={{ background: `conic-gradient(${slices.join(",")})` }}
            />
          )}
          <ul className="fv-legend">
            {rows.map((r) => (
              <li key={r.id}>
                <i style={{ background: color(r.id) }} aria-hidden="true" />
                <div className="fv-category">
                  <span>{r.label}</span>
                  {mode === "bars" && (
                    <div className="fv-bar-track" aria-hidden="true">
                      <i
                        style={{
                          width: `${r.percent}%`,
                          background: color(r.id),
                        }}
                      />
                    </div>
                  )}
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
    ? analysisFields.filter(
        (f) => f.skills.includes(expanded) && f.key !== "setPlacement",
      )
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
                aria-label={`Ver detalhes de ${skills[s].label}`}
              >
                Ver detalhes <ArrowUpRight size={18} />
              </button>
            </header>
            <div className="fv-layout">
              <StickmanCourt skill={s} blockers={blockers} direction={route} />
              <dl className="fv-facts">
                {(s === "set" || s === "defense" || s === "reception") &&
                  (() => {
                    const d = distribution(
                      s,
                      s === "set" ? "incomingSet" : "passQuality",
                    );
                    const ids =
                      s === "set"
                        ? [
                            "low",
                            "short",
                            "away",
                            "high_bad",
                            "poor",
                            "C",
                            "error",
                          ]
                        : ["C", "error"];
                    const count = d.rows
                      .filter((r) => ids.includes(r.id))
                      .reduce((sum, r) => sum + r.count, 0);
                    return (
                      <div>
                        <dt>
                          {s === "set"
                            ? "Levantamentos ruins ou errados"
                            : s === "defense"
                              ? "Defesas ruins ou erradas"
                              : "Recepções ruins ou erradas"}
                        </dt>
                        <dd>
                          {d.known
                            ? `${Math.round((100 * count) / d.known)}%`
                            : "Sem informação"}
                        </dd>
                        <small>
                          {count} de {d.known} informadas · {d.missing} sem
                          detalhe
                        </small>
                      </div>
                    );
                  })()}
                {summaries[s].map((key) => {
                  const d = distribution(s, key);
                  return (
                    <div key={key}>
                      <dt>{label(d)}</dt>
                      <dd>
                        {leading(d)}
                        {d.leaders.length === 1 && (
                          <strong className="fv-percent">
                            {d.leaders[0].percent.toFixed(0)}%
                          </strong>
                        )}
                      </dd>
                      <small>
                        {d.leaders.length === 1
                          ? `${d.leaders[0].count} de ${d.known}`
                          : `${d.known} informadas`}{" "}
                        · {d.missing} sem detalhe
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
