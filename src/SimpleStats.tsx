import { SkillIcon } from "./SkillIcon";
import { MomentBrowser } from "./MomentBrowser";
import { useState } from "react";
import { type Match, type RecordedEvent, resultOf } from "./model";
import { matchHighlights } from "./matchHighlights";
import { criterionDistribution } from "./criteriaStats";
import { Photo } from "./PlayerPhoto";
import { project } from "./engine";
import {
  specialMarks,
  videoMoments,
  formatVideoTime,
  type VideoMoment,
} from "./videoMoments";
import { MomentFeed } from "./MomentFeed";

export function SimpleStats({
  match,
  events,
  set = 0,
}: {
  match: Match;
  events: RecordedEvent[];
  set?: number;
}) {
  const data = matchHighlights(events);
  const [selected, select] = useState("");
  const [moment, setMoment] = useState<VideoMoment>();
  const name = (id: string) =>
    match.players.find((p) => p.id === id)?.name ?? id;
  const setterIds = [
    ...new Set(
      events
        .filter((e) => e.skill === "set" && e.playerId)
        .map((e) => e.playerId!),
    ),
  ];
  const setter = setterIds.includes(selected) ? selected : setterIds[0];
  const passes = data.partnerships
    .filter((p) => p.setter === setter)
    .sort((a, b) => b.count - a.count);
  const linked = passes.reduce((n, p) => n + p.count, 0);
  const sets = events.filter((e) => e.skill === "set" && e.playerId === setter);
  const direction = criterionDistribution(sets, "setDirection");
  const rallyState = project(match).rallies.filter(
    (r) => !set || r.set === set,
  );
  const detail = (skill: string) => (
    <details>
      <summary>Ver lances</summary>
      {events
        .filter(
          (e) =>
            e.skill === skill && (e.winner ?? resultOf(e).winner) === "ours",
        )
        .map((e) => (
          <p key={e.id}>
            Set {e.set} · Rally {e.rally} ·{" "}
            {e.playerId ? name(e.playerId) : "Sem jogador"}
            {e.videoTimestampMs !== undefined
              ? ` · Vídeo ${(e.videoTimestampMs / 1000).toFixed(1)} s`
              : ""}
          </p>
        ))}
    </details>
  );
  const pairs = data.pairs.filter((p) => p.points > 0);
  const topPairs = pairs.filter((p) => p.points === pairs[0]?.points);
  const specialCard = (kind: "magic" | "emergency", label: string) => {
    const rows = events.filter((e) => specialMarks(e)[kind]);
    return (
      <article className="ui-card">
        <span>{label}</span>
        <strong className="simple-number">{rows.length}</strong>
        <details>
          <summary>Ver lances</summary>
          {rows.length ? (
            rows.map((e) => (
              <div key={e.id}>
                <p>
                  Set {e.set} · Rally {e.rally} ·{" "}
                  {e.playerId ? name(e.playerId) : "Sem jogador"}
                  {specialMarks(e).magic && specialMarks(e).emergency
                    ? " · Cartola e emergência"
                    : ""}
                </p>
                {e.videoTimestampMs !== undefined ? (
                  <button
                    className="ui-btn"
                    onClick={() => setMoment(videoMoments([e])[0])}
                  >
                    Ver lance · {formatVideoTime(e.videoTimestampMs)}
                  </button>
                ) : (
                  <small>Sem horário de vídeo marcado</small>
                )}
              </div>
            ))
          ) : (
            <p>Nenhum lance registrado neste recorte.</p>
          )}
        </details>
      </article>
    );
  };
  return (
    <section className="simple-stats" aria-label="Resumo de estatísticas">
      <div className="simple-stats-grid">
        {specialCard("magic", "Tirou da cartola")}
        {specialCard("emergency", "Emergência")}
        <article className="ui-card">
          <span>
            <SkillIcon skill="attack" /> Pontos de ataque
          </span>
          <strong className="simple-number">
            {data.scorers.reduce((n, p) => n + p.attacks, 0)}
          </strong>
          {detail("attack")}
        </article>
        <article className="ui-card">
          <span>
            <SkillIcon skill="serve" /> Aces
          </span>
          <strong className="simple-number">
            {data.scorers.reduce((n, p) => n + p.aces, 0)}
          </strong>
          {detail("serve")}
        </article>
        <article className="ui-card">
          <span>
            <SkillIcon skill="block" /> Dupla com mais pontos de bloqueio
          </span>
          {topPairs.length ? (
            topPairs.map((p) => (
              <p key={p.players.join("-")}>
                <b>{p.players.map(name).join(" + ")}</b>
                <br />
                {p.points} pontos · {p.count} bloqueios registrados · {p.useful}{" "}
                toques úteis
              </p>
            ))
          ) : (
            <p>Ainda sem pontos de bloqueio em dupla registrados.</p>
          )}
        </article>
      </div>
      {moment && (
        <MomentFeed
          moments={videoMoments(events)}
          selectedId={moment.id}
          players={match.players}
          onSelect={setMoment}
          onClose={() => setMoment(undefined)}
        />
      )}
      <p className="ui-note">
        Um lance pode aparecer em Cartola e Emergência. Emergência acompanha a
        dificuldade exibida na ficha; estas marcações não alteram as notas.
      </p>
      <p className="ui-note">
        {rallyState.filter((r) => r.events.length > 0).length} de{" "}
        {rallyState.length} rallies encerrados têm fundamentos registrados.{" "}
        Contagens dos fundamentos registrados. Pontos marcados apenas no placar
        não são atribuídos a jogadores. Bloqueios triplos não entram no ranking.
      </p>
      <div className="simple-stats-grid">
        {data.scorers
          .filter((p) => p.attacks || p.aces)
          .sort((a, b) => b.attacks + b.aces - a.attacks - a.aces)
          .map((p) => (
            <article className="ui-card simple-player" key={p.player}>
              {match.players.find((x) => x.id === p.player) && (
                <Photo player={match.players.find((x) => x.id === p.player)!} />
              )}
              <div>
                <b>{name(p.player)}</b>
                <p>
                  {p.attacks} pontos de ataque · {p.aces} aces
                </p>
              </div>
            </article>
          ))}
      </div>
      <article className="ui-card">
        <h2>Distribuição do levantador</h2>
        <div className="an-toolbar">
          {setterIds.map((id) => (
            <button
              className="ui-btn"
              aria-pressed={setter === id}
              key={id}
              onClick={() => select(id)}
            >
              {name(id)}
            </button>
          ))}
        </div>
        {!setter && <p>Registre levantamentos para ver a distribuição.</p>}
        {setter && (
          <>
            <h3>Atacantes mais acionados</h3>
            {passes.length ? (
              passes.map((p) => (
                <p key={p.attacker}>
                  <b>{name(p.attacker)}</b> · {p.count} de {linked} bolas
                  vinculadas ({Math.round((p.count / linked) * 100)}%) ·{" "}
                  {p.points} pontos de ataque
                </p>
              ))
            ) : (
              <p>Sem sequência de levantamento e ataque identificada.</p>
            )}
            <p className="ui-note">
              {linked} de {sets.length} levantamentos têm ataque seguinte
              identificado. Empates mantêm todos os jogadores.
            </p>
            <h3>Direção do levantamento</h3>
            {direction.leaders.length > 0 && (
              <p>
                <b>
                  Mais usada:{" "}
                  {direction.leaders.map((r) => r.label).join(" / ")}
                </b>
              </p>
            )}
            {direction.rows
              .filter((r) => r.count)
              .map((r) => (
                <p key={r.id}>
                  {r.label} · {r.count} ({Math.round(r.percent)}%){" "}
                  <meter min={0} max={100} value={r.percent} />
                </p>
              ))}
            <p className="ui-note">
              Direção informada em {direction.known} de {direction.total}{" "}
              levantamentos.
            </p>
            <p>
              Bolas forçadas / só deu para subir:{" "}
              <b>
                {
                  sets.filter(
                    (e) => e.assessment?.criteria?.ballConstraint === "forced",
                  ).length
                }
              </b>
            </p>
          </>
        )}
      </article>
      <article className="ui-card">
        <h2>Buscar lances por jogador ou dupla</h2>
        <MomentBrowser
          moments={videoMoments(project(match).events)}
          players={match.players}
        />
      </article>
    </section>
  );
}

export function CareerPartnerships({
  match,
  playerId,
}: {
  match: Match;
  playerId: string;
}) {
  const state = project(match);
  const games = [
    ...(match.history ?? []).filter((g) => g.finished && g.id !== match.id),
    ...(state.finished
      ? [{ partnerships: matchHighlights(state.events).partnerships }]
      : []),
  ];
  const rows = new Map<string, number>();
  for (const g of games)
    for (const p of g.partnerships ?? [])
      if (p.setter === playerId)
        rows.set(p.attacker, (rows.get(p.attacker) ?? 0) + p.count);
  const total = [...rows.values()].reduce((a, b) => a + b, 0);
  return (
    <article className="ui-card">
      <h2>Atacantes mais acionados na carreira</h2>
      {total ? (
        [...rows]
          .sort((a, b) => b[1] - a[1])
          .map(([id, count]) => (
            <p key={id}>
              <b>{match.players.find((p) => p.id === id)?.name ?? id}</b> ·{" "}
              {count} bolas ({Math.round((count / total) * 100)}%)
            </p>
          ))
      ) : (
        <p>Ainda sem parcerias salvas em partidas encerradas.</p>
      )}
      <p className="ui-note">
        {games.filter((g) => g.partnerships !== undefined).length} de{" "}
        {games.length} partidas encerradas possuem dados de parcerias.
        Históricos anteriores sem vínculo não entram no cálculo.
      </p>
    </article>
  );
}
