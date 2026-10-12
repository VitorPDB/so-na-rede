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
            Versão 2: avaliação por ação de 0 a 10. Normal é o padrão; a
            quantidade de ações indica a amostra, sem reduzir a nota.
          </p>
        </div>
      </header>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Bola</th>
              <th>Boa execução</th>
              <th>Gafe · continua</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(difficultyLabels).map(([id, label]) => (
              <tr key={id}>
                <td>{label}</td>
                <td>
                  {(
                    assessed({
                      skill: "attack",
                      result: "simple_good",
                      assessment: {
                        version: 2,
                        difficulty: id as Difficulty,
                        tags: [],
                      },
                    }).quality * 10
                  ).toFixed(1)}
                </td>
                <td>
                  {(
                    assessed({
                      skill: "attack",
                      result: "simple_gafe",
                      assessment: {
                        version: 2,
                        difficulty: id as Difficulty,
                        tags: [],
                      },
                    }).quality * 10
                  ).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ui-note">
        Continuidade neutra vale 5. Erro direto vale 0 / 1 / 2 / 3 conforme
        dificuldade; infração confirmada vale 0. Ataque do fundo descreve a
        jogada, com dificuldade ajustável. Salvadas e “tirou da cartola” não
        acumulam bônus.
      </p>
      <p className="ui-note">
        Jogadas coletivas: cada participante recebe avaliação própria. Sem
        responsabilidade fica fora da nota. O ponto coletivo e o crédito do
        finalizador não se multiplicam pelo número de participantes.
      </p>
      <p className="ui-note">
        Registros antigos mantêm a fórmula original. Jogos históricos já
        resumidos também mantêm suas notas. Uma partida com registros das duas
        versões mostra avaliação mista.
      </p>
    </section>
  );
}
