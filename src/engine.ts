import {
  type AuditEntry,
  type Command,
  type Match,
  type Projection,
  type Skill,
  type SkillEvent,
  type Weights,
  resultOf,
  skills,
  ratingProfiles,
  type Role,
  type RoleWeights,
  roleLabels,
  p1Roles,
} from "./model";
import { legacyRoles } from "./formation";
import { withRallyContext } from "./rallyContext";
import { assessed, assessmentError } from "./assessment";
import { captureRatingContext, ratingV2, sampleLabel } from "./ratingV2";

// Zone-indexed clockwise rotation: 2→1→6→5→4→3→2.
export function rotate(lineup: string[]) {
  return [...lineup.slice(1), lineup[0]];
}
export function assignToZone(lineup: string[], zone: number, playerId: string) {
  const next = [...lineup];
  const existing = next.indexOf(playerId);
  if (existing >= 0) next[existing] = next[zone - 1];
  next[zone - 1] = playerId;
  return next;
}
// Older pre-match formations did not persist tactical roles. The confirmed
// 5–1 P1 convention supplies them without rewriting played rallies.
export function openingRoleMigration(match: Match): Match {
  const state = project(match);
  const formation = [...state.active]
    .reverse()
    .find((e) => e.command?.type === "setup")?.command;
  const roles =
    formation?.type === "setup" ? formation.roles : match.initialRoles;
  if (
    roles ||
    state.set !== 1 ||
    state.rally !== 1 ||
    state.events.length ||
    state.libero ||
    state.substitutions
  )
    return match;
  return append(match, {
    type: "setup",
    lineup: [...state.lineup],
    roles: [...p1Roles],
    server: state.server,
  });
}
export function activeEntries(audit: AuditEntry[]) {
  const undone = new Set(
    audit.filter((e) => e.kind === "undo").map((e) => e.target),
  );
  const corrections = new Map<string, AuditEntry>();
  for (const entry of audit)
    if (entry.kind === "correction" && !undone.has(entry.id) && entry.target)
      corrections.set(entry.target, entry);
  return audit
    .filter((e) => e.kind === "action" && !undone.has(e.id))
    .map((e) =>
      corrections.has(e.id)
        ? { ...e, command: corrections.get(e.id)!.command }
        : e,
    );
}
export function project(match: Match): Projection {
  const state: Projection = {
    set: 1,
    rally: 1,
    score: [0, 0],
    sets: [0, 0],
    server: match.initialServer,
    autoLibero: match.initialAutoLibero ?? false,
    rotation: 1,
    lineup: [...match.initialLineup],
    roles: [
      ...(match.initialRoles ??
        legacyRoles(match.initialLineup, match.players)),
    ],
    completed: [],
    setFinished: false,
    finished: false,
    events: [],
    rallies: [],
    markers: [],
    active: activeEntries(match.audit),
    substitutions: 0,
    subPairs: {},
    returned: [],
  };
  const snapshot = () =>
    structuredClone({
      ...state,
      active: [],
      libero: state.libero,
      lastLiberoRally: state.lastLiberoRally,
    });
  let setStart = snapshot();
  let setActions: string[] = [];
  const discarded = new Set<string>();
  const restoreLibero = () => {
    if (!state.libero) return;
    state.lineup = state.lineup.map((id) =>
      id === state.libero!.playerId ? state.libero!.replaced : id,
    );
    state.libero = undefined;
    state.lastLiberoRally = state.rally;
  };
  const point = (winner: "ours" | "theirs", entry: AuditEntry) => {
    if (state.setFinished || state.finished) return;
    const middleLostServe =
      winner === "theirs" &&
      state.server === "ours" &&
      state.roles[0] === "middle";
    state.score[winner === "ours" ? 0 : 1]++;
    const setterZone = state.roles.indexOf("setter") + 1;
    state.rallies.push({
      id: entry.id,
      createdAt: entry.createdAt,
      serving: state.server,
      p: setterZone ? (setterZone as 1 | 2 | 3 | 4 | 5 | 6) : null,
      lineup: [...state.lineup],
      roles: [...state.roles],
      set: state.set,
      rally: state.rally,
      winner,
      score: [...state.score],
      events: state.events.filter(
        (e) => e.set === state.set && e.rally === state.rally,
      ),
    });
    if (winner === "ours" && state.server === "theirs") {
      state.lineup = rotate(state.lineup);
      state.roles = [...state.roles.slice(1), state.roles[0]];
      state.rotation = (state.rotation % 6) + 1;
    }
    state.server = winner;
    state.rally++;
    if (state.libero) {
      const zone = state.lineup.indexOf(state.libero.playerId) + 1;
      if ([2, 3, 4].includes(zone) || (zone === 1 && state.server === "ours"))
        restoreLibero();
    }
    const target = state.set === match.bestOf ? 15 : 25;
    if (
      Math.max(...state.score) >= target &&
      Math.abs(state.score[0] - state.score[1]) >= 2
    ) {
      state.setFinished = true;
      state.sets[winner === "ours" ? 0 : 1]++;
      state.completed.push({ set: state.set, score: [...state.score], winner });
      state.finished = Math.max(...state.sets) >= Math.ceil(match.bestOf / 2);
    }
    const libero = match.players.find((p) => p.libero);
    if (
      middleLostServe &&
      state.autoLibero &&
      !state.libero &&
      !state.setFinished &&
      libero &&
      (state.lastLiberoRally === undefined ||
        state.rally > state.lastLiberoRally)
    ) {
      const replaced = state.lineup[0];
      state.lineup[0] = libero.id;
      state.libero = { playerId: libero.id, replaced };
      state.lastLiberoRally = state.rally;
    }
  };
  for (const entry of state.active) {
    const c = entry.command!;
    if (c.type === "setup" && state.set === 1 && state.rally === 1) {
      state.lineup = [...c.lineup];
      state.roles = [...(c.roles ?? legacyRoles(c.lineup, match.players))];
      state.server = c.server;
      setStart.lineup = [...state.lineup];
      setStart.roles = [...state.roles];
      setStart.server = state.server;
    }
    if (c.type === "nextSet" && state.setFinished && !state.finished) {
      state.set++;
      state.score = [0, 0];
      state.rally = 1;
      state.setFinished = false;
      state.rotation = 1;
      state.lineup = [...c.lineup];
      state.roles = [...(c.roles ?? legacyRoles(c.lineup, match.players))];
      state.server = c.server;
      state.libero = undefined;
      state.substitutions = 0;
      state.subPairs = {};
      state.returned = [];
      state.lastLiberoRally = undefined;
      setStart = snapshot();
      setActions = [];
    }
    if (c.type === "restartSet") {
      for (const id of setActions) discarded.add(id);
      const active = state.active;
      Object.assign(state, structuredClone(setStart), { active });
      setActions = [];
      continue;
    }
    if (state.finished || state.setFinished) continue;
    if (c.type !== "setup" && c.type !== "nextSet") setActions.push(entry.id);
    if (c.type === "timeout" || c.type === "sub") {
      state.markers.push({
        id: entry.id,
        createdAt: entry.createdAt,
        set: state.set,
        rally: state.rally,
        score: [...state.score],
        command: c,
      });
    }
    if (c.type === "autoLibero") {
      state.autoLibero = c.enabled;
      if (!c.enabled && state.libero) restoreLibero();
    }
    if (c.type === "event") {
      state.events.push({
        ...withRallyContext(state, c.event),
        participants: c.event.participants?.map((p) => ({
          ...p,
          role:
            state.libero?.playerId === p.playerId
              ? "libero"
              : state.roles[state.lineup.indexOf(p.playerId)],
        })),
        role:
          state.libero?.playerId === c.event.playerId
            ? "libero"
            : state.roles[state.lineup.indexOf(c.event.playerId ?? "")],
        id: entry.id,
        createdAt: entry.createdAt,
        set: state.set,
        rally: state.rally,
        rotation: state.rotation,
        serving: state.server,
        scoreBefore: [...state.score],
      });
      const winner = c.event.winner ?? resultOf(c.event).winner;
      if (winner) point(winner, entry);
    }
    if (c.type === "point") point(c.winner, entry);
    if (c.type === "sub") {
      const isReturn = state.subPairs[c.incoming] === c.outgoing;
      if (isReturn) state.returned.push(c.incoming);
      else state.subPairs[c.outgoing] = c.incoming;
      state.lineup = state.lineup.map((id) =>
        id === c.outgoing ? c.incoming : id,
      );
      state.substitutions++;
    }
    if (c.type === "libero") {
      if (state.libero) restoreLibero();
      else if (c.playerId && c.replaced) {
        state.lineup = state.lineup.map((id) =>
          id === c.replaced ? c.playerId! : id,
        );
        state.libero = { playerId: c.playerId, replaced: c.replaced };
        state.lastLiberoRally = state.rally;
      }
    }
  }
  state.active = state.active.filter((e) => !discarded.has(e.id));
  return state;
}
export function validate(
  match: Match,
  state: Projection,
  c: Command,
): string | undefined {
  if (c.type === "restartSet") return;
  const validLineup = (ids: string[]) =>
    ids.length === 6 &&
    new Set(ids).size === 6 &&
    ids.every((id) => match.players.some((p) => p.id === id && !p.libero));
  if (c.type === "setup" || c.type === "nextSet") {
    if (
      c.roles &&
      (c.roles.length !== 6 ||
        c.roles.some((r) => r === "libero" || !Object.hasOwn(roleLabels, r)))
    )
      return "Funções da formação inválidas.";
    if (!validLineup(c.lineup))
      return "Selecione seis atletas diferentes, sem líbero, na formação inicial.";
    if (
      c.type === "setup" &&
      (state.rally !== 1 || state.set !== 1 || state.events.length)
    )
      return "A formação inicial só pode ser alterada antes do primeiro rally.";
    if (c.type === "nextSet" && (!state.setFinished || state.finished))
      return "O próximo set fica disponível quando este set terminar.";
    return;
  }
  if (state.finished || state.setFinished)
    return "Set encerrado. Abra o próximo set ou consulte o relatório.";
  const rallyOpen = state.events.some(
    (e) => e.set === state.set && e.rally === state.rally,
  );
  if (c.type === "timeout") {
    if (!["ours", "theirs"].includes(c.side))
      return "Lado do pedido de tempo inválido.";
    if (rallyOpen) return "Encerre o rally antes de pedir tempo.";
    if (
      state.markers.filter(
        (m) =>
          m.set === state.set &&
          m.command.type === "timeout" &&
          m.command.side === c.side,
      ).length >= 2
    )
      return "Limite de dois pedidos de tempo por time neste set atingido.";
    return;
  }
  if (c.type === "autoLibero") {
    if (typeof c.enabled !== "boolean") return "Opção de líbero inválida.";
    if (rallyOpen)
      return "Encerre o rally antes de alterar o líbero automático.";
    if (c.enabled && !match.players.some((p) => p.libero))
      return "Cadastre um líbero antes de ativar.";
    if (
      !c.enabled &&
      state.libero &&
      state.lastLiberoRally !== undefined &&
      state.rally <= state.lastLiberoRally
    )
      return "Complete um rally antes de retirar o líbero.";
    return;
  }
  if ((c.type === "sub" || c.type === "libero") && rallyOpen)
    return "Encerre o rally antes de alterar a formação.";
  if (c.type === "event") {
    const contextError = assessmentError(c.event);
    if (contextError) return contextError;
    if (c.event.participants?.some((p) => !state.lineup.includes(p.playerId)))
      return "Participantes devem estar em quadra.";
    if (
      (c.event.assessment?.group === "double" ||
        c.event.assessment?.group === "triple") &&
      c.event.participants?.some(
        (p) =>
          match.players.find((x) => x.id === p.playerId)?.libero ||
          ![2, 3, 4].includes(state.lineup.indexOf(p.playerId) + 1),
      )
    )
      return "Todos os bloqueadores devem estar na rede (zonas 2, 3 ou 4).";
    if (!skills[c.event.skill]?.results.some((r) => r.id === c.event.result))
      return "Resultado inválido.";
    if (
      c.event.skill !== "opponent" &&
      !state.lineup.includes(c.event.playerId ?? "")
    )
      return "Selecione um atleta que esteja em quadra.";
    if (
      c.event.skill === "attack" &&
      c.event.assessment?.tags.some(
        (t) => t === "attack_pipe" || t === "attack_back_one",
      ) &&
      (match.players.find((p) => p.id === c.event.playerId)?.libero ||
        ![1, 5, 6].includes(state.lineup.indexOf(c.event.playerId!) + 1))
    )
      return "Ataque do fundo deve ser atribuído a um jogador do fundo, sem ser o líbero.";
    for (const item of [
      { playerId: c.event.playerId, ratingContext: c.event.ratingContext },
      ...(c.event.participants ?? []),
    ]) {
      const context = item.ratingContext;
      if (
        context &&
        (context.rotationZone !==
          state.lineup.indexOf(item.playerId ?? "") + 1 ||
          context.role !==
            (state.libero?.playerId === item.playerId
              ? "libero"
              : state.roles[state.lineup.indexOf(item.playerId ?? "")]))
      )
        return "Contexto da ação não corresponde à formação daquele rally.";
    }
    if (
      c.event.skill === "serve" &&
      (state.server !== "ours" || c.event.playerId !== state.lineup[0])
    )
      return "O saque deve ser atribuído ao atleta da zona 1 quando o nosso time saca.";
    if (
      c.event.skill === "block" &&
      !resultOf(c.event).error &&
      ([1, 5, 6].includes(state.lineup.indexOf(c.event.playerId!) + 1) ||
        match.players.find((p) => p.id === c.event.playerId)?.libero)
    )
      return "Bloqueio efetivo deve ser atribuído a um atleta da rede (zonas 2, 3 ou 4).";
  }
  if (c.type === "sub") {
    if (state.substitutions >= 6)
      return "Limite de seis substituições neste set atingido.";
    if (
      !state.lineup.includes(c.outgoing) ||
      state.lineup.includes(c.incoming) ||
      state.libero?.replaced === c.incoming
    )
      return "Escolha um atleta da quadra e um do banco.";
    if (
      match.players.find((p) => p.id === c.incoming)?.libero ||
      match.players.find((p) => p.id === c.outgoing)?.libero
    )
      return "Use a troca de líbero para atletas nessa função.";
    if (
      state.returned.includes(c.outgoing) ||
      state.returned.includes(c.incoming)
    )
      return "O atleta titular já retornou neste set.";
    const paired = Object.entries(state.subPairs).find(
      ([a, b]) =>
        a === c.outgoing ||
        b === c.outgoing ||
        a === c.incoming ||
        b === c.incoming,
    );
    if (paired && !(paired[0] === c.incoming && paired[1] === c.outgoing))
      return "O retorno deve ser feito pelo mesmo par de atletas.";
  }
  if (c.type === "libero") {
    if (state.lastLiberoRally === state.rally)
      return "É necessário um rally completo entre trocas de líbero.";
    if (!state.libero) {
      const zone = state.lineup.indexOf(c.replaced ?? "") + 1;
      if (![1, 5, 6].includes(zone) || (zone === 1 && state.server === "ours"))
        return "O líbero entra somente no fundo e não pode sacar.";
      if (!match.players.some((p) => p.id === c.playerId && p.libero))
        return "Selecione um líbero do elenco.";
    }
  }
}
export function append(match: Match, command: Command): Match {
  if (command.type === "event")
    command = {
      ...command,
      event: captureRatingContext(match, project(match), command.event),
    };
  const s = project(match);
  const error = validate(match, s, command);
  if (error) throw new Error(error);
  return {
    ...match,
    audit: [
      ...match.audit,
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        kind: "action",
        command,
        context: {
          set: s.set,
          rally: s.rally,
          rotation: s.rotation,
          serving: s.server,
        },
      },
    ],
  };
}
export function undo(match: Match): Match {
  const undone = new Set(
    match.audit.filter((e) => e.kind === "undo").map((e) => e.target),
  );
  const last = [...match.audit]
    .reverse()
    .find((e) => e.kind !== "undo" && !undone.has(e.id));
  if (!last) return match;
  return {
    ...match,
    audit: [
      ...match.audit,
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        kind: "undo",
        target: last.id,
        reason: "Desfazer última ação",
      },
    ],
  };
}
export function correct(
  match: Match,
  target: string,
  event: SkillEvent,
  reason: string,
): Match {
  if (!reason.trim()) throw new Error("Descreva o motivo da correção.");
  const active = project(match).active;
  const index = active.findIndex((e) => e.id === target);
  if (index >= 0)
    event = captureRatingContext(
      match,
      project({ ...match, audit: active.slice(0, index) }),
      {
        ...event,
        ratingContext: undefined,
        participants: event.participants?.map((p) => ({
          ...p,
          ratingContext: undefined,
        })),
      },
    );
  if (
    !project(match).active.some(
      (e) => e.id === target && e.command?.type === "event",
    )
  )
    throw new Error("Ação não está ativa.");
  // Revalidate every following action against the corrected match, so a changed
  // side-out cannot silently make future serves/substitutions invalid.
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    kind: "correction",
    target,
    command: { type: "event", event },
    reason,
  };
  const candidate = { ...match, audit: [...match.audit, entry] };
  const replay = { ...match, audit: [] as AuditEntry[] };
  for (const action of activeEntries(candidate.audit)) {
    const error = validate(replay, project(replay), action.command!);
    if (error)
      throw new Error(
        `Correção incompatível com ações posteriores: ${error} Desfaça as ações dependentes primeiro.`,
      );
    replay.audit.push(action);
  }
  return candidate;
}
export interface Metric {
  skill: Skill;
  label: string;
  count: number;
  successes: number;
  errors: number;
  quality: number;
}
export interface StatsResult {
  rating: number | null;
  sample: string;
  provisional: boolean;
  ratingVersion: "v2" | "v3" | "v4" | "mixed" | "legacy";
  list: Metric[];
  best?: Metric;
  worst?: Metric;
  reason: (m?: Metric) => string;
  count: number;
  errors: number;
  points: number;
}
export function metrics(events: SkillEvent[]): Metric[] {
  return (Object.keys(skills) as Skill[])
    .filter((s) => s !== "opponent")
    .map((skill) => {
      const rows = events.filter((e) => e.skill === skill);
      const results = rows.map(assessed);
      return {
        skill,
        label: skills[skill].label,
        count: rows.length,
        successes: results.filter((r) => r.quality >= 0.7).length,
        errors: results.filter((r) => r.error).length,
        quality: rows.length
          ? results.reduce((n, r) => n + r.quality, 0) / rows.length
          : 0,
      };
    });
}
export function stats(
  events: (SkillEvent & { role?: Role })[],
  weights: Weights,
  profiles?: Record<Role, RoleWeights>,
): StatsResult {
  const observed = events.filter(
    (e) => e.skill !== "opponent" && assessed(e).rated,
  );
  const list = metrics(observed);
  const available = list.filter((m) => m.count);
  const groups = [
    ["reception", weights.reception],
    ["attack", weights.attack],
    ["serve", weights.serve],
    ["block", weights.block],
    ["support", weights.support],
  ] as const;
  let total = 0,
    weight = 0;
  for (const [key, w] of groups) {
    const rows = observed.filter((e) =>
      key === "support"
        ? e.skill === "defense" || e.skill === "set"
        : e.skill === key,
    );
    if (!rows.length || w <= 0) continue;
    const quality =
      (rows.reduce((n, e) => n + assessed(e).quality, 0) + 1.5) /
      (rows.length + 3);
    total += quality * w;
    weight += w;
  }
  const errors = observed.filter((e) => assessed(e).error).length;
  const errorPenalty = observed.reduce((n, e) => n + assessed(e).penalty, 0);
  let rating =
    observed.length && weight
      ? Math.max(
          0,
          Math.min(
            10,
            (10 * total) / weight -
              ((weights.errors / 10) * errorPenalty) / observed.length,
          ),
        )
      : null;
  if (profiles && observed.length) {
    // Group by historical role and skill, so substitutions or later role changes
    // cannot rewrite a player's earlier assessment. Normalize observed weights.
    let sum = 0,
      denominator = 0,
      penalties = 0,
      ratedCount = 0;
    for (const role of Object.keys(ratingProfiles) as Role[]) {
      const rows = observed.filter((e) => e.role === role);
      if (!rows.length) continue;
      const profile = profiles[role];
      let roleSum = 0,
        roleWeight = 0;
      for (const skill of [
        "reception",
        "attack",
        "serve",
        "block",
        "defense",
        "set",
      ] as const) {
        const actions = rows.filter((e) => e.skill === skill);
        const w = profile[skill];
        if (!actions.length || w <= 0) continue;
        roleSum +=
          (w * (actions.reduce((n, e) => n + assessed(e).quality, 0) + 1.5)) /
          (actions.length + 3);
        roleWeight += w;
      }
      if (!roleWeight) continue;
      sum += (roleSum / roleWeight) * rows.length;
      denominator += rows.length;
      penalties +=
        (profile.errors / 10) *
        rows.reduce((n, e) => n + assessed(e).penalty, 0);
      ratedCount += rows.length;
    }
    rating = denominator
      ? Math.max(
          0,
          Math.min(10, (10 * sum) / denominator - penalties / ratedCount),
        )
      : null;
  }
  const ranked = [...available].sort(
    (a, b) => b.quality - a.quality || b.count - a.count,
  );
  const version2 = observed.filter((e) => (e.assessment?.version ?? 0) >= 2);
  if (version2.length) {
    const legacy = observed.filter((e) => (e.assessment?.version ?? 0) < 2);
    const current = ratingV2(version2, weights, profiles);
    const old = legacy.length ? stats(legacy, weights, profiles).rating : null;
    rating =
      current === null
        ? old
        : old === null
          ? current
          : (current * version2.length + old * legacy.length) / observed.length;
  }
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const reason = (m?: Metric) =>
    m
      ? `${Math.round(m.quality * 100)}% de qualidade · ${m.count} ações${m.count < 3 ? " · amostra baixa" : ""}`
      : "Sem dados suficientes";
  return {
    rating,
    sample: sampleLabel(observed.length),
    provisional: observed.length > 0 && observed.length < 5,
    ratingVersion: version2.length
      ? version2.length === observed.length
        ? new Set(observed.map((e) => e.assessment?.version)).size > 1
          ? "mixed"
          : observed[0].assessment?.version === 4
            ? "v4"
            : observed[0].assessment?.version === 3
              ? "v3"
              : "v2"
        : "mixed"
      : "legacy",
    list,
    best,
    worst,
    reason,
    count: observed.length,
    errors,
    points: observed.filter((e) => assessed(e).point).length,
  };
}
