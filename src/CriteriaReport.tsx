import { CardSelect } from "./CardSelect";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { FoundationAtlas } from "./FoundationAtlas";
import { type SkillEvent, type Player, type Skill, skills } from "./model";
import {
  analysisParticipations,
  analysisFields,
  criterionDistribution,
  distributionFromCube,
  type PublicCriteriaData,
} from "./criteriaStats";
import { download, csv } from "./storage";
export function CriteriaReport({
  events = [],
  players,
  title = "Como o time joga",
  fixedPlayer,
  period = "Partida atual",
  aggregateData,
}: {
  events?: SkillEvent[];
  players: Pick<Player, "id" | "name" | "number">[];
  title?: string;
  fixedPlayer?: string;
  period?: string;
  aggregateData?: PublicCriteriaData;
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
  const distribution = (key: string) =>
    aggregateData
      ? distributionFromCube(
          id
            ? (aggregateData.players.find((p) => p.id === id)?.data ?? [])
            : aggregateData.team,
          key,
          skill,
        )
      : criterionDistribution(rows, key);
  const data = fields.map((f) => distribution(f.key));
  const skillDistribution = (selected: Skill, key: string) =>
    aggregateData
      ? distributionFromCube(
          id
            ? (aggregateData.players.find((p) => p.id === id)?.data ?? [])
            : aggregateData.team,
          key,
          selected,
        )
      : criterionDistribution(
          rows.filter((e) => e.skill === selected),
          key,
        );
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
            <CardSelect
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
            </CardSelect>
          </label>
        )}
        <label>
          Fundamento
          <CardSelect
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
          </CardSelect>
        </label>
      </div>
      <FoundationAtlas
        key={`${id}-${skill}-${period}`}
        skill={skill}
        distribution={skillDistribution}
        period={period}
      />
    </section>
  );
}
