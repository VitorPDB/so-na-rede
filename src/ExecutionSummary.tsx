import { assessed, difficultyLabels, type Difficulty } from "./assessment";
import { type SkillEvent } from "./model";
export function ExecutionSummary({ events }: { events: SkillEvent[] }) {
  const rows = events.filter(
    (e) => e.skill !== "opponent" && e.assessment && assessed(e).rated,
  );
  if (!rows.length) return null;
  return (
    <section className="ui-card exec">
      <header className="ui-card-head">
        <div>
          <h2>Execução por dificuldade</h2>
          <p>
            Índice ajustado pela dificuldade, separado do placar. Ações
            coletivas contam uma vez nesta visão.
          </p>
        </div>
      </header>
      <div className="exec-grid">
        {Object.entries(difficultyLabels).map(([key, label]) => {
          const group = rows.filter(
            (e) =>
              (e.assessment?.tags.includes("save_extreme")
                ? "emergency"
                : e.assessment?.tags.includes("save_hard") &&
                    e.assessment.difficulty !== "emergency"
                  ? "hard"
                  : e.assessment?.difficulty) === key,
          );
          const value = group.length
            ? Math.round(
                (group.reduce((n, e) => n + assessed(e).quality, 0) /
                  group.length) *
                  100,
              )
            : null;
          return (
            <div key={key} className={"exec-tile is-" + key}>
              <span>{label}</span>
              <strong>{value === null ? "—" : value + "%"}</strong>
              <span className="ui-meter" aria-hidden="true">
                <i style={{ width: `${value ?? 0}%` }} />
              </span>
              <small>
                {group.length} ações ·{" "}
                {group.filter((e) => assessed(e).error).length} falhas
              </small>
            </div>
          );
        })}
      </div>
      <p className="ui-note">
        {events.filter((e) => e.skill !== "opponent" && !e.assessment).length}{" "}
        registros anteriores sem dificuldade mantêm o cálculo original.
      </p>
    </section>
  );
}
export function RatingGuide() {
  return (
    <section className="ui-card st-card" id="settings-guide">
      <header className="ui-card-head">
        <div>
          <h2>Como dificuldade e execução entram na nota</h2>
          <p>
            Normal é o padrão. Valores de uma execução totalmente boa ou errada,
            antes dos pesos por posição e da suavização por amostra.
          </p>
        </div>
      </header>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Bola</th>
              <th>Execução boa</th>
              <th>Execução ruim</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(difficultyLabels).map(([id, label]) => (
              <tr key={id}>
                <td>{label}</td>
                <td>
                  {Math.round(
                    assessed({
                      skill: "attack",
                      result: "simple_good",
                      assessment: {
                        version: 1,
                        difficulty: id as Difficulty,
                        tags: [],
                      },
                    }).quality * 100,
                  )}
                  %
                </td>
                <td>
                  {Math.round(
                    assessed({
                      skill: "attack",
                      result: "simple_gafe",
                      assessment: {
                        version: 1,
                        difficulty: id as Difficulty,
                        tags: [],
                      },
                    }).quality * 100,
                  )}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ui-note">
        50% é a referência neutra. Etiquetas de execução refinam a qualidade.
        Soluções excepcionais têm bônus de até 8 pontos percentuais, sem
        acumular bônus. A nota final continua entre 0 e 10.
      </p>
      <p className="ui-note">
        Jogadas coletivas: cada participante recebe avaliação própria; crédito
        positivo reduzido a 65%. Sem responsabilidade fica fora da nota. O ponto
        coletivo e o crédito do finalizador não se multiplicam pelo número de
        participantes.
      </p>
      <p className="ui-note">
        Registros antigos mantêm a fórmula original. Jogos históricos já
        resumidos também mantêm suas notas.
      </p>
    </section>
  );
}
