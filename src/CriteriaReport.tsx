import { useMemo, useState } from "react";
import {
  Hand,
  Target,
  Gauge,
  Download,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import { type SkillEvent, type Player, type Skill, skills } from "./model";
import {
  analysisParticipations,
  analysisFields,
  criterionDistribution,
} from "./criteriaStats";
import { download, csv } from "./storage";
type Distribution = ReturnType<typeof criterionDistribution>;
function DistributionCard({ data }: { data: Distribution }) {
  return (
    <section className="cr-distribution" aria-label={data.label}>
      <header>
        <h3>{data.label}</h3>
        <small>
          {data.known} de {data.total} com informação
        </small>
      </header>
      {data.known ? (
        <>
          <div className="cr-bars">
            {data.rows
              .filter((r) => r.count)
              .sort((a, b) => b.count - a.count)
              .map((r) => (
                <div className="cr-bar-row" key={r.id}>
                  <div>
                    <span>{r.label}</span>
                    <strong>
                      {r.count} <small>· {r.percent.toFixed(0)}%</small>
                    </strong>
                  </div>
                  <span className="ui-meter" aria-hidden="true">
                    <i style={{ width: `${r.percent}%` }} />
                  </span>
                  <small>
                    {r.rating === null
                      ? "Sem execuções avaliáveis"
                      : `Nota média ${r.rating.toFixed(1)}/10 · ${r.rated} avaliadas`}
                  </small>
                </div>
              ))}
          </div>
          <p className="cr-missing">
            {data.missing
              ? `${data.missing} sem informação · não entram nas porcentagens.`
              : "Todas as participações deste fundamento têm informação."}
          </p>
        </>
      ) : (
        <p className="ui-empty">
          {data.total
            ? `${data.total} participações sem este detalhe. Preencha o contexto das ações para analisar.`
            : "Nenhuma participação neste recorte."}
        </p>
      )}
    </section>
  );
}
export function CriteriaReport({
  events,
  players,
  title = "Como o time joga",
  fixedPlayer,
  period = "Partida atual",
}: {
  events: SkillEvent[];
  players: Player[];
  title?: string;
  fixedPlayer?: string;
  period?: string;
}) {
  const [player, setPlayer] = useState("");
  const [skill, setSkill] = useState<Skill | "all">("all");
  const id = fixedPlayer ?? player;
  const rows = useMemo(
    () =>
      analysisParticipations(events, id || undefined).filter(
        (e) => skill === "all" || e.skill === skill,
      ),
    [events, id, skill],
  );
  const fields = analysisFields.filter(
    (f) => skill === "all" || f.skills.includes(skill),
  );
  const data = fields.map((f) => criterionDistribution(rows, f.key));
  const technique = criterionDistribution(
    rows,
    skill === "attack"
      ? "attackType"
      : skill === "serve"
        ? "serveType"
        : skill === "block"
          ? "blockQuality"
          : "technique",
  );
  const passKey =
    skill === "set"
      ? "incomingPass"
      : skill === "attack"
        ? "incomingSet"
        : skill === "serve"
          ? "execution"
          : skill === "block"
            ? "group"
            : "passQuality";
  const pass = criterionDistribution(rows, passKey);
  const difficulty = criterionDistribution(rows, "difficulty");
  const headline = (d: Distribution) =>
    d.leaders.length
      ? d.leaders.map((r) => r.label).join(" / ")
      : "Sem informação";
  const main =
    skill === "all"
      ? data.filter((d) =>
          ["technique", "passQuality", "difficulty"].includes(d.key),
        )
      : data;
  const other =
    skill === "all"
      ? data.filter(
          (d) =>
            !["technique", "passQuality", "difficulty"].includes(d.key) &&
            d.known > 0,
        )
      : [];
  const exportDetails = () => {
    const content = csv([
      [
        "Recorte",
        "Jogador",
        "Fundamento",
        "Critério",
        "Opção",
        "Quantidade",
        "% entre informadas",
        "Nota média",
        "Avaliadas",
        "Informadas",
        "Sem informação",
      ],
      ...data.flatMap((d) =>
        d.rows.map((r) => [
          period,
          id ? players.find((p) => p.id === id)?.name : "Time",
          skill === "all" ? "Todos" : skills[skill].label,
          d.label,
          r.label,
          r.count,
          r.percent.toFixed(2),
          r.rating?.toFixed(2) ?? "",
          r.rated,
          d.known,
          d.missing,
        ]),
      ),
    ]);
    download(
      `criterios-${id || "time"}-${skill}-${period.replace(/[^a-z0-9]+/gi, "-")}.csv`,
      content,
      "text/csv;charset=utf-8",
    );
  };
  return (
    <section className="ui-card cr" aria-label="Estatísticas dos critérios">
      <header className="ui-card-head">
        <div>
          <h2>{title}</h2>
          <p>
            Técnicas, qualidades e contexto das participações registradas neste
            recorte · {period}.
          </p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn--secondary"
          onClick={exportDetails}
        >
          <Download size={17} /> Critérios CSV
        </button>
      </header>
      <div className="cr-filters">
        {!fixedPlayer && (
          <label>
            Quem analisar
            <select
              className="ui-select"
              aria-label="Jogador da análise técnica"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
            >
              <option value="">Time inteiro</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · #{p.number}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Fundamento
          <select
            className="ui-select"
            aria-label="Fundamento da análise técnica"
            value={skill}
            onChange={(e) => setSkill(e.target.value as typeof skill)}
          >
            <option value="all">Todos os fundamentos</option>
            {Object.entries(skills)
              .filter(([s]) => s !== "opponent")
              .map(([s, def]) => (
                <option key={s} value={s}>
                  {def.label}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div className="cr-kpis">
        <div>
          <Hand size={18} />
          <span>
            {skill === "attack"
              ? "Ataque mais usado"
              : skill === "serve"
                ? "Saque mais usado"
                : skill === "block"
                  ? "Bloqueio mais registrado"
                  : "Técnica mais usada"}
          </span>
          <strong>{headline(technique)}</strong>
          <small>
            {technique.known} informadas · {technique.missing} sem detalhe
            {technique.leaders.length > 1 ? " · empate" : ""}
          </small>
        </div>
        <div>
          <Target size={18} />
          <span>{pass.label}</span>
          <strong>
            {pass.known &&
            ["passQuality", "incomingPass", "incomingSet"].includes(passKey)
              ? `A ${pass.rows.find((r) => r.id === "A")!.count} · B ${pass.rows.find((r) => r.id === "B")!.count} · C ${pass.rows.find((r) => r.id === "C")!.count}`
              : headline(pass)}
          </strong>
          <small>
            {passKey === "passQuality"
              ? "Recepção / defesa · erro direto separado"
              : `${pass.known} informadas · ${pass.missing} sem detalhe`}
          </small>
        </div>
        <div>
          <Gauge size={18} />
          <span>Dificuldade mais frequente</span>
          <strong>{headline(difficulty)}</strong>
          <small>
            {rows.length} participações · {difficulty.missing} sem dificuldade
          </small>
        </div>
      </div>
      <p className="ui-note">
        Porcentagens consideram somente detalhes informados. Frequência não
        significa melhor técnica; as notas são médias por ação ajustadas ao
        contexto. No time, jogadas coletivas consideram cada participante
        avaliável uma vez.
      </p>
      <div className="cr-grid">
        {main.map((d) => (
          <DistributionCard key={d.key} data={d} />
        ))}
      </div>
      {other.length > 0 && (
        <details className="cr-more">
          <summary>
            <ChartNoAxesColumnIncreasing size={18} /> Tipos de jogada e detalhes
            por fundamento
          </summary>
          <div className="cr-grid">
            {other.map((d) => (
              <DistributionCard key={d.key} data={d} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
