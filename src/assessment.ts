import { resultOf, type SkillEvent, type Skill, type Role } from "./model";
import { contextError } from "./ratingV2";
import { criteriaError, criteriaText, effectiveDifficulty } from "./criteria";
export const difficultyLabels = {
  easy: "Fácil",
  normal: "Normal",
  hard: "Difícil",
  emergency: "Emergência",
} as const;
export const responsibilityLabels = {
  correct: "Acertou",
  partial: "Parcial",
  wrong: "Errou",
  none: "Sem responsabilidade",
} as const;
export type Difficulty = keyof typeof difficultyLabels;
export type Responsibility = keyof typeof responsibilityLabels;
export interface Situation {
  id: string;
  label: string;
  skills: Skill[];
  category: string;
  quality?: number;
  adjustment?: number;
}
export const situations: Situation[] = [
  {
    id: "attack_front",
    label: "Ataque da rede",
    skills: ["attack"],
    category: "attack_origin",
  },
  {
    id: "attack_pipe",
    label: "Ataque do fundo · pipe / zona 6",
    skills: ["attack"],
    category: "attack_origin",
  },
  {
    id: "attack_back_one",
    label: "Ataque do fundo · saída / zona 1",
    skills: ["attack"],
    category: "attack_origin",
  },
  {
    id: "rule_fault",
    label: "Infração · invasão / toque ilegal",
    skills: ["serve", "attack", "block", "set", "defense", "reception"],
    category: "execution",
    quality: 0,
  },
  {
    id: "good_pass",
    label: "Boa · ataque organizado",
    skills: ["reception"],
    category: "execution",
    quality: 0.75,
  },
  {
    id: "pressured_attack",
    label: "Pressionou a defesa",
    skills: ["attack"],
    category: "execution",
    quality: 0.75,
  },
  {
    id: "neutral_attack",
    label: "Continuidade sem vantagem",
    skills: ["attack"],
    category: "execution",
    quality: 0.5,
  },
  {
    id: "net_fault",
    label: "Erro de rede / invasão",
    skills: ["serve", "attack", "block", "set"],
    category: "execution",
    quality: 0,
  },
  {
    id: "out_fault",
    label: "Bola para fora",
    skills: ["serve", "attack", "set"],
    category: "execution",
    quality: 0,
  },
  {
    id: "after_timeout",
    label: "Logo após pedido de tempo",
    skills: ["serve"],
    category: "pressure",
  },
  {
    id: "error_streak",
    label: "Em sequência de erros",
    skills: ["serve"],
    category: "pressure",
  },
  {
    id: "body",
    label: "Saque no corpo",
    skills: ["reception"],
    category: "ball",
  },
  {
    id: "power",
    label: "Bola forte",
    skills: ["reception", "defense"],
    category: "ball",
  },
  {
    id: "float",
    label: "Flutuante / mudança de trajetória",
    skills: ["reception"],
    category: "ball",
  },
  {
    id: "short",
    label: "Bola curta / largada",
    skills: ["reception", "defense"],
    category: "ball",
  },
  {
    id: "deep",
    label: "Bola profunda",
    skills: ["reception"],
    category: "ball",
  },
  {
    id: "seam",
    label: "Entre dois jogadores",
    skills: ["reception", "defense"],
    category: "ball",
  },
  {
    id: "deflection",
    label: "Desvio inesperado",
    skills: ["reception", "defense"],
    category: "ball",
  },
  {
    id: "all_options",
    label: "Todas as opções de ataque",
    skills: ["reception", "set"],
    category: "execution",
    quality: 1,
  },
  {
    id: "limited_options",
    label: "Opções limitadas",
    skills: ["reception", "set"],
    category: "execution",
    quality: 0.65,
  },
  {
    id: "high_only",
    label: "Só permite bola alta",
    skills: ["reception"],
    category: "execution",
    quality: 0.4,
  },
  {
    id: "free_ball",
    label: "Devolveu bola de graça",
    skills: ["reception", "defense", "set", "attack"],
    category: "execution",
    quality: 0.3,
  },
  {
    id: "bad_for_setter",
    label: "Colocou levantador em dificuldade",
    skills: ["reception"],
    category: "execution",
    quality: 0.2,
  },
  {
    id: "coverage",
    label: "Cobertura após bloqueio",
    skills: ["defense"],
    category: "ball",
  },
  {
    id: "rescue_partner",
    label: "Recuperou toque de companheiro",
    skills: ["defense", "set"],
    category: "ball",
  },
  {
    id: "reaction",
    label: "Reação muito curta",
    skills: ["defense"],
    category: "ball",
  },
  {
    id: "save_hard",
    label: "Salvada difícil",
    skills: ["defense"],
    category: "special",
    adjustment: 0,
  },
  {
    id: "save_extreme",
    label: "Salvada muito difícil",
    skills: ["defense"],
    category: "special",
    adjustment: 0,
  },
  {
    id: "counterattack",
    label: "Permitiu contra-ataque organizado",
    skills: ["defense"],
    category: "execution",
    quality: 1,
  },
  {
    id: "alive",
    label: "Manteve viva, sem controle",
    skills: ["defense"],
    category: "execution",
    quality: 0.6,
  },
  {
    id: "comfortable",
    label: "Bola confortável",
    skills: ["set", "attack"],
    category: "ball",
  },
  {
    id: "off_net",
    label: "Afastada da rede",
    skills: ["set", "attack"],
    category: "ball",
  },
  {
    id: "low",
    label: "Bola baixa / atrás",
    skills: ["set", "attack"],
    category: "ball",
  },
  {
    id: "tight",
    label: "Colada na rede",
    skills: ["set", "attack"],
    category: "ball",
  },
  {
    id: "running",
    label: "Em corrida / fora de equilíbrio",
    skills: ["set", "attack"],
    category: "ball",
  },
  {
    id: "no_opponent_block",
    label: "Sem bloqueio adversário",
    skills: ["attack"],
    category: "opposition",
  },
  {
    id: "single_opponent",
    label: "Bloqueio adversário simples",
    skills: ["attack"],
    category: "opposition",
  },
  {
    id: "double_opponent",
    label: "Bloqueio adversário duplo",
    skills: ["attack"],
    category: "opposition",
  },
  {
    id: "impassable",
    label: "Impassável · bloqueio bem formado",
    skills: ["attack"],
    category: "opposition",
  },
  {
    id: "forced_tip",
    label: "Forçado a largar",
    skills: ["attack"],
    category: "technique",
  },
  {
    id: "forced_attack",
    label: "Ataque forçado",
    skills: ["attack"],
    category: "technique",
  },
  {
    id: "tool",
    label: "Explorou o bloqueio",
    skills: ["attack"],
    category: "technique",
  },
  {
    id: "space",
    label: "Atacou espaço vazio",
    skills: ["attack"],
    category: "technique",
  },
  {
    id: "recycle",
    label: "Reciclou no bloqueio",
    skills: ["attack"],
    category: "execution",
    quality: 0.75,
  },
  {
    id: "bad_choice",
    label: "Escolha precipitada / previsível",
    skills: ["attack", "set"],
    category: "decision",
    adjustment: -0.08,
  },
  {
    id: "magic",
    label: "Tirou da cartola",
    skills: ["attack", "set", "defense"],
    category: "special",
    adjustment: 0.08,
  },
  {
    id: "touch_simple",
    label: "Toque simples · facilitou nossa defesa",
    skills: ["block"],
    category: "execution",
    quality: 0.55,
  },
  {
    id: "touch_effective",
    label: "Toque efetivo · ficou do lado de lá, fácil",
    skills: ["block"],
    category: "execution",
    quality: 0.8,
  },
  {
    id: "perfect_block",
    label: "Bloqueio perfeito",
    skills: ["block"],
    category: "execution",
    quality: 1,
  },
  {
    id: "block_used",
    label: "Bloqueio usado / explorado",
    skills: ["block"],
    category: "execution",
    quality: 0.4,
  },
  {
    id: "late",
    label: "Bloqueio atrasado",
    skills: ["block"],
    category: "execution",
    quality: 0.15,
  },
  {
    id: "absent",
    label: "Não bloqueou tendo condição",
    skills: ["block"],
    category: "execution",
    quality: 0,
  },
  {
    id: "direction",
    label: "Fechou direção combinada, sem toque",
    skills: ["block"],
    category: "execution",
    quality: 0.7,
  },
  {
    id: "gap",
    label: "Deixou buraco / mão mal posicionada",
    skills: ["block"],
    category: "execution",
    quality: 0.1,
  },
  {
    id: "wrong_jump",
    label: "Saltou na finta",
    skills: ["block"],
    category: "execution",
    quality: 0.15,
  },
  {
    id: "fast_middle",
    label: "Ataque rápido / primeiro tempo",
    skills: ["block"],
    category: "ball",
  },
  {
    id: "long_move",
    label: "Deslocamento longo",
    skills: ["block"],
    category: "ball",
  },
  {
    id: "setter_tip",
    label: "Largadinha do levantador",
    skills: ["set", "attack"],
    category: "technique",
  },
  {
    id: "bump_set",
    label: "Levantamento de manchete",
    skills: ["set"],
    category: "technique",
  },
  {
    id: "forced_up",
    label: "Forçado a jogar para cima",
    skills: ["set"],
    category: "technique",
  },
  {
    id: "created_advantage",
    label: "Criou ataque em vantagem",
    skills: ["set"],
    category: "execution",
    quality: 1,
  },
  {
    id: "attackable",
    label: "Atacável com dificuldade",
    skills: ["set"],
    category: "execution",
    quality: 0.45,
  },
  {
    id: "exposed_attacker",
    label: "Expôs atacante ao bloqueio",
    skills: ["set"],
    category: "execution",
    quality: 0.25,
  },
  {
    id: "ugly_error",
    label: "Erro feio · evitável",
    skills: ["set", "attack", "reception"],
    category: "execution",
    quality: 0,
  },
  {
    id: "target",
    label: "Acertou alvo tático",
    skills: ["serve"],
    category: "execution",
    quality: 0.8,
  },
  {
    id: "out_of_system",
    label: "Tirou adversário do sistema",
    skills: ["serve"],
    category: "execution",
    quality: 1,
  },
  {
    id: "easy_received",
    label: "Facilmente recebido",
    skills: ["serve"],
    category: "execution",
    quality: 0.25,
  },
  {
    id: "communication",
    label: "Falha de comunicação",
    skills: ["reception", "defense", "set", "attack", "block"],
    category: "decision",
    adjustment: -0.05,
  },
  {
    id: "no_cover",
    label: "Falta de cobertura",
    skills: ["defense"],
    category: "decision",
    adjustment: -0.08,
  },
];
export const tagsFor = (skill: Skill) =>
  situations.filter((s) => s.skills.includes(skill));
export function visibleTags(skill: Skill, version: number) {
  if (version < 3) return tagsFor(skill);
  return tagsFor(skill).filter((t) => {
    if (t.category === "attack_origin" || t.category === "pressure")
      return false;
    if (t.category === "technique")
      return [
        "setter_tip",
        "forced_tip",
        "forced_attack",
        "forced_up",
      ].includes(t.id);
    if (
      ["reception", "defense", "block"].includes(skill) &&
      t.category === "execution"
    )
      return ["rule_fault", "ugly_error"].includes(t.id);
    if (t.category === "ball")
      return [
        "body",
        "short",
        "deep",
        "seam",
        "deflection",
        "coverage",
        "rescue_partner",
        "reaction",
        "off_net",
        "low",
        "tight",
        "running",
        "fast_middle",
        "long_move",
      ].includes(t.id);
    return true;
  });
}
export function toggleTag(tags: string[], id: string) {
  if (tags.includes(id)) return tags.filter((t) => t !== id);
  const category = situations.find((s) => s.id === id)?.category;
  return [
    ...tags.filter(
      (t) => situations.find((s) => s.id === t)?.category !== category,
    ),
    id,
  ];
}
export const normalAssessment = (): NonNullable<SkillEvent["assessment"]> => ({
  version: 4,
  difficultySource: "context",
  difficulty: "normal",
  tags: [],
});
export function assessmentError(
  event: SkillEvent,
  allowIncomplete = false,
): string | undefined {
  const invalidContext =
    contextError(event.ratingContext) ??
    event.participants?.map((p) => contextError(p.ratingContext)).find(Boolean);
  if (invalidContext) return invalidContext;
  if (event.ratingContext && (event.assessment?.version ?? 0) < 2)
    return "Contexto de nota exige avaliação v2 ou v3.";
  const a = event.assessment;
  if (a !== undefined) {
    if (
      a?.setDifficultyVersion !== undefined &&
      (a.setDifficultyVersion !== 1 ||
        a.version !== 4 ||
        !["set", "attack"].includes(event.skill))
    )
      return "Dificuldade por tipo exige levantamento ou ataque v4.";
    if (
      a?.rallyContext !== undefined &&
      (a.version !== 4 ||
        a.rallyContext !== "auto" ||
        !["set", "attack"].includes(event.skill))
    )
      return "Contexto automático exige levantamento ou ataque ao vivo v4.";
    if (
      a?.setTypeSource !== undefined &&
      (a.setTypeSource !== "rally" ||
        a.rallyContext !== "auto" ||
        event.skill !== "attack")
    )
      return "Origem automática do levantamento inválida.";
    if (
      !a ||
      ![1, 2, 3, 4].includes(a.version) ||
      !Object.hasOwn(difficultyLabels, a.difficulty) ||
      !Array.isArray(a.tags) ||
      a.tags.length > 6
    )
      return "Dificuldade/contexto inválido.";
    if (
      a.execution !== undefined &&
      (a.version < 2 ||
        ![
          "error",
          "poor",
          "neutral",
          "good",
          "excellent",
          "point",
          "unrated",
        ].includes(a.execution))
    )
      return "Avaliação da execução inválida.";
    if (a.criteria !== undefined || a.difficultySource !== undefined) {
      if (
        a.version < 3 ||
        (a.difficultySource !== undefined &&
          !["manual", "context"].includes(a.difficultySource))
      )
        return "Critérios exigem avaliação v3.";
      const error = criteriaError(event.skill, a.criteria);
      if (error) return error;
    }
    if (
      a.execution === "point" &&
      event.winner !== "ours" &&
      resultOf(event)?.winner !== "ours"
    )
      return "Ponto bem executado exige ponto nosso no placar.";
    const categories = new Set<string>();
    for (const id of a.tags) {
      const t = tagsFor(event.skill).find((t) => t.id === id);
      if (!t || categories.has(t.category))
        return "Situações incompatíveis ou duplicadas.";
      categories.add(t.category);
    }
    if (
      a.responsibility !== undefined &&
      !Object.hasOwn(responsibilityLabels, a.responsibility)
    )
      return "Responsabilidade inválida.";
    if (
      a.group !== undefined &&
      !["combination", "double", "triple"].includes(a.group)
    )
      return "Jogada coletiva inválida.";
    if (
      (a.group === "double" || a.group === "triple") &&
      event.skill !== "block"
    )
      return "Duplo/triplo é exclusivo do bloqueio.";
  }
  if (event.participants !== undefined || a?.group) {
    if (!a?.group || !Array.isArray(event.participants))
      return "Informe a jogada coletiva e seus participantes.";
    const p = event.participants;
    if (
      p.some(
        (x) =>
          x?.criteria !== undefined &&
          (a.version < 3 || criteriaError(x.skill ?? event.skill, x.criteria)),
      )
    )
      return "Critérios de participante inválidos.";
    if (p.some((x) => !x || typeof x.playerId !== "string"))
      return "Participante inválido.";
    const size =
      a.group === "double" ? 2 : a.group === "triple" ? 3 : undefined;
    if (
      (size && (p.length > size || (!allowIncomplete && p.length !== size))) ||
      (!size && (p.length > 6 || (!allowIncomplete && p.length < 2))) ||
      new Set(p.map((x) => x.playerId)).size !== p.length ||
      (!allowIncomplete && !p.some((x) => x.playerId === event.playerId))
    )
      return "Selecione os participantes, incluindo o autor principal (mínimo 2).";
    if (
      p.some(
        (x) =>
          !x ||
          typeof x.playerId !== "string" ||
          !Object.hasOwn(responsibilityLabels, x.responsibility) ||
          (x.role !== undefined &&
            !["setter", "outside", "middle", "opposite", "libero"].includes(
              x.role,
            )) ||
          (x.skill !== undefined &&
            ![
              "serve",
              "reception",
              "attack",
              "block",
              "defense",
              "set",
            ].includes(x.skill)),
      )
    )
      return "Participante inválido.";
    if (
      !allowIncomplete &&
      p.some(
        (x) =>
          x.skill &&
          ((x.playerId === event.playerId && x.skill !== event.skill) ||
            ((a.group === "double" || a.group === "triple") &&
              x.skill !== "block")),
      )
    )
      return "O fundamento do finalizador deve corresponder à ação. Duplo/triplo avalia somente bloqueio.";
    if (
      p.some(
        (x) =>
          x.difficulty !== undefined &&
          !Object.hasOwn(difficultyLabels, x.difficulty),
      )
    )
      return "Dificuldade do participante inválida.";
  }
  if (event.skill === "opponent" && (a || event.participants))
    return "Erro adversário não recebe nota individual.";
}
export function assessed(event: SkillEvent) {
  if (event.assessment?.version === 4) return assessedV4(event);
  if (event.assessment?.version === 3) return assessedV3(event);
  if (event.assessment?.version === 2) return assessedV2(event);
  const r = resultOf(event),
    a = event.assessment;
  if (!a)
    return {
      quality: r.quality,
      error: !!r.error,
      penalty: r.error ? 1 : 0,
      point: r.winner === "ours",
      rated: true,
    };
  const responsibility = a.responsibility;
  if (responsibility === "none")
    return {
      quality: 0.5,
      error: false,
      penalty: 0,
      point: false,
      rated: false,
    };
  let q =
    responsibility === "correct"
      ? 1
      : responsibility === "partial"
        ? 0.5
        : responsibility === "wrong"
          ? 0
          : r.quality;
  // The result of a teammate cannot overwrite this participant's execution.
  if (!responsibility) {
    const execution = a.tags
      .map((t) => situations.find((s) => s.id === t))
      .find((t) => t?.quality !== undefined);
    if (execution && !r.error && r.winner !== "ours") q = execution.quality!;
    if (execution && execution.quality! <= 0.25)
      q = Math.min(q, execution.quality!);
  }
  let difficulty = a.difficulty;
  if (a.tags.includes("save_extreme")) difficulty = "emergency";
  else if (a.tags.includes("save_hard") && difficulty !== "emergency")
    difficulty = "hard";
  // Centered contribution: a difficult success is worth more; a difficult error costs less.
  const positive = { easy: 0.55, normal: 0.75, hard: 0.95, emergency: 1.08 }[
    difficulty
  ];
  const negative = { easy: 1.1, normal: 0.9, hard: 0.5, emergency: 0.28 }[
    difficulty
  ];
  let quality = 0.5 + (q - 0.5) * (q >= 0.5 ? positive : negative);
  const adjustments = a.tags.map(
    (id) => situations.find((s) => s.id === id)?.adjustment ?? 0,
  );
  // One bounded bonus/penalty, never stacked rewards for the same execution.
  const bonus = Math.max(0, ...adjustments),
    deduction = Math.min(0, ...adjustments);
  if (q > 0.5) quality += Math.min(0.08, bonus * (q - 0.5) * 2);
  if (responsibility !== "correct") quality += deduction;
  if (a.group && responsibility && quality > 0.5)
    quality = 0.5 + (quality - 0.5) * 0.65;
  return {
    quality: Math.max(0, Math.min(1, quality)),
    error:
      responsibility === "wrong" ||
      (!responsibility && (!!r.error || q <= 0.25)),
    penalty: 0,
    point:
      responsibility !== "wrong" &&
      responsibility !== "partial" &&
      r.winner === "ours" &&
      q > 0.5,
    rated: true,
  };
}
// Independent foundation model. Versions 1–3 keep their original calculations.
export function assessedV4(event: SkillEvent) {
  const a = event.assessment!,
    r = resultOf(event),
    c = a.criteria;
  const empty = {
    quality: 0.5,
    error: false,
    penalty: 0,
    point: false,
    rated: false,
  };
  if (
    event.skill === "opponent" ||
    a.responsibility === "none" ||
    a.execution === "unrated" ||
    (event.skill === "attack" && c?.incomingSet === "error") ||
    c?.blockQuality === "unrated"
  )
    return empty;
  const pass =
    c?.passQuality ??
    (event.result === "simple_A"
      ? "A"
      : event.result === "simple_B"
        ? "B"
        : event.result === "simple_C"
          ? "C"
          : undefined);
  const execution =
    a.execution ??
    (a.responsibility === "wrong"
      ? "poor"
      : a.responsibility === "partial"
        ? "neutral"
        : event.result === "simple_gafe"
          ? "poor"
          : r.error
            ? "error"
            : r.winner === "ours"
              ? "point"
              : "good");
  let value = {
    error: 1,
    poor: 3,
    neutral: 5,
    good: 7.5,
    excellent: 9,
    point: 9.5,
    unrated: 5,
  }[execution];
  if (pass) value = { A: 9, B: 7.5, C: 3, error: 1 }[pass];
  if (
    event.skill === "block" &&
    !c?.blockQuality &&
    !a.responsibility &&
    !a.execution
  )
    value =
      r.error && event.result !== "simple_gafe"
        ? 1
        : r.winner === "ours"
          ? 9.5
          : event.result === "simple_gafe"
            ? 2
            : 8.5;
  if (event.skill === "block" && c?.blockQuality)
    value = {
      perfect: 9.5,
      error: 1,
      effective: 8.5,
      simple: 5.5,
      direction: 7.5,
      used: 4,
      late: 2,
      absent: 1,
      gap: 2.5,
      unrated: 5,
    }[c.blockQuality];
  const error =
    pass === "error" ||
    c?.blockQuality === "error" ||
    (!pass && !c?.blockQuality && execution === "error");
  const difficulty = effectiveDifficulty({
    ...event,
    assessment: { ...a, tags: [] },
  });
  const strength = {
    defense: 1,
    reception: 0.75,
    attack: 1,
    set: 0.75,
    block: 0.5,
    serve: 0.25,
    opponent: 0,
  }[event.skill];
  const offset =
    { easy: -1, normal: 0, hard: 1, emergency: 1.5 }[difficulty] * strength;
  // Neutral execution stays neutral; difficulty cannot turn a gafe into a good action.
  if (value !== 5) value += offset;
  if (c?.blockQuality === "error") value = 0;
  if (value < 5) value = Math.min(4.9, value);
  if (event.skill === "attack" && c?.approach === "poor" && value > 5 && !error)
    value -= 0.25;
  return {
    quality: Math.max(0, Math.min(10, value)) / 10,
    error,
    penalty: 0,
    point:
      (event.winner ?? r.winner) === "ours" &&
      !error &&
      value > 5 &&
      a.responsibility !== "wrong" &&
      a.responsibility !== "partial",
    rated: true,
  };
}
export function assessedV3(event: SkillEvent) {
  const a = event.assessment!,
    c = a.criteria;
  let execution = a.execution;
  const pass =
    c?.passQuality ??
    (event.result === "simple_A"
      ? "A"
      : event.result === "simple_B"
        ? "B"
        : event.result === "simple_C"
          ? "C"
          : undefined);
  if (!execution && pass)
    execution =
      pass === "A"
        ? "excellent"
        : pass === "B"
          ? "good"
          : pass === "C"
            ? "poor"
            : "error";
  if (!execution && c?.blockQuality)
    execution =
      c.blockQuality === "unrated"
        ? "unrated"
        : c.blockQuality === "absent"
          ? "error"
          : ["used", "late", "gap"].includes(c.blockQuality)
            ? "poor"
            : c.blockQuality === "simple"
              ? "neutral"
              : c.blockQuality === "direction"
                ? "good"
                : "excellent";
  const mapped = {
    ...a,
    version: 2 as const,
    execution,
    criteria: undefined,
    difficultySource: undefined,
    tags:
      a.difficultySource === "manual"
        ? a.tags.filter(
            (t) => !["magic", "save_hard", "save_extreme"].includes(t),
          )
        : a.tags,
  };
  const actual = assessedV2({
    ...event,
    assessment: { ...mapped, difficulty: effectiveDifficulty(event) },
  });
  if (!actual.rated || event.skill === "serve") return actual;
  const reference = assessedV2({
    ...event,
    assessment: {
      ...mapped,
      difficulty: "normal",
      tags: a.tags.filter(
        (t) => !["magic", "save_hard", "save_extreme"].includes(t),
      ),
    },
  });
  const factor = {
    defense: 1,
    reception: 0.75,
    attack: 1,
    set: 0.75,
    block: 0.5,
    opponent: 0,
    serve: 0,
  }[event.skill];
  let quality =
    reference.quality + factor * (actual.quality - reference.quality);
  if (event.skill === "block" && c?.blockQuality && !a.execution) {
    if (c.blockQuality === "perfect") quality += 0.05;
    if (c.blockQuality === "used") quality += 0.1;
    if (c.blockQuality === "late") quality -= 0.1;
    if (c.blockQuality === "gap") quality -= 0.05;
  }
  if (
    event.skill === "attack" &&
    c?.approach === "poor" &&
    quality > 0.5 &&
    !actual.error
  )
    quality -= 0.025;
  return { ...actual, quality: Math.max(0, Math.min(1, quality)) };
}
export const executionLabels = {
  error: "Erro direto",
  poor: "Gafe · bola continua",
  neutral: "Continuidade neutra",
  good: "Boa execução",
  excellent: "Excelente execução",
  point: "Ponto bem executado",
  unrated: "Sem possibilidade real / não avaliável",
} as const;
export function assessedV2(event: SkillEvent) {
  const a = event.assessment!,
    r = resultOf(event);
  const empty = {
    quality: 0.5,
    error: false,
    penalty: 0,
    point: false,
    rated: false,
  };
  if (
    a.responsibility === "none" ||
    a.execution === "unrated" ||
    event.skill === "opponent"
  )
    return empty;
  const tags = a.tags.map((id) => situations.find((s) => s.id === id));
  const detail = tags.find((t) => t?.quality !== undefined);
  let execution: keyof typeof executionLabels =
    a.execution ??
    (a.responsibility === "partial"
      ? "neutral"
      : a.responsibility === "wrong"
        ? r.winner === "theirs"
          ? "error"
          : "poor"
        : a.responsibility === "correct"
          ? r.winner === "ours"
            ? "point"
            : "good"
          : event.result === "simple_gafe" ||
              event.result === "bad" ||
              event.result === "-"
            ? "poor"
            : r.error
              ? "error"
              : r.winner === "ours"
                ? "point"
                : event.result === "#"
                  ? "excellent"
                  : event.result === "!" || r.quality === 0.5
                    ? "neutral"
                    : r.quality >= 0.7
                      ? "good"
                      : "poor");
  if (!a.execution && !a.responsibility && detail && execution !== "error") {
    const q = detail.quality!;
    execution =
      q >= 0.95
        ? "excellent"
        : q >= 0.7
          ? "good"
          : q >= 0.45
            ? "neutral"
            : q > 0
              ? "poor"
              : "error";
    if (r.winner === "ours" && q >= 0.7) execution = "point";
  }
  let difficulty = a.difficulty;
  if (
    a.tags.includes("save_extreme") ||
    (a.tags.includes("magic") &&
      ["good", "excellent", "point"].includes(execution))
  )
    difficulty = "emergency";
  else if (a.tags.includes("save_hard") && difficulty !== "emergency")
    difficulty = "hard";
  const table = {
    error: [0, 1, 2, 3],
    poor: [2, 3, 4, 5],
    neutral: [5, 5, 5, 5],
    good: [6.5, 7.5, 8.5, 9],
    excellent: [8, 9, 9.5, 10],
    point: [9, 9, 9.5, 10],
  };
  const index = ["easy", "normal", "hard", "emergency"].indexOf(difficulty);
  let value = table[execution][index];
  if (!a.execution && !a.responsibility && event.skill === "block") {
    if (
      a.tags.includes("touch_effective") ||
      a.tags.includes("perfect_block")
    ) {
      execution = r.winner === "ours" ? "point" : "excellent";
      value = table[execution][index];
      if (a.tags.includes("perfect_block") && execution !== "point")
        value = Math.min(10, value + 0.5);
    }
    if (a.tags.includes("block_used") && execution === "poor")
      value = Math.min(5, value + 1);
    if (a.tags.includes("late") || a.tags.includes("wrong_jump"))
      value = Math.max(0, value - 1);
  }
  if (event.skill === "serve")
    value = {
      error: 0,
      poor: 3.5,
      neutral: 5,
      good: 7,
      excellent: 8.5,
      point: 9,
      unrated: 5,
    }[execution];
  if (
    event.skill === "serve" &&
    a.tags.includes("out_of_system") &&
    execution !== "error"
  )
    value = 8.5;
  if (a.tags.includes("rule_fault")) {
    value = 0;
    execution = "error";
  }
  if (a.tags.includes("ugly_error")) {
    value = 0;
    execution = "error";
  }
  // Special-play tags describe difficulty; they never stack a second reward.
  if (!a.responsibility && execution !== "error") {
    value += Math.max(
      -0.5,
      Math.min(0, ...tags.map((t) => (t?.adjustment ?? 0) * 10)),
    );
  }
  return {
    quality: Math.max(0, Math.min(10, value)) / 10,
    error: execution === "error",
    penalty: 0,
    point:
      r.winner === "ours" &&
      a.responsibility !== "wrong" &&
      a.responsibility !== "partial",
    rated: true,
  };
}
export function playerEvents<T extends SkillEvent & { role?: Role }>(
  events: T[],
  playerId: string,
): T[] {
  return events.flatMap((e) => {
    if (!e.participants) return e.playerId === playerId ? [e] : [];
    const p = e.participants.find((p) => p.playerId === playerId);
    if (!p || p.responsibility === "none") return [];
    const primary = playerId === e.playerId;
    const skill = p.skill ?? e.skill;
    return [
      {
        ...e,
        playerId,
        skill,
        role: p.role ?? e.role,
        ratingContext: p.ratingContext ?? e.ratingContext,
        participants: undefined,
        assessment: {
          ...e.assessment!,
          difficulty: p.difficulty ?? e.assessment!.difficulty,
          ...(e.assessment!.version >= 3
            ? {
                difficultySource: p.difficulty
                  ? ("manual" as const)
                  : e.assessment!.difficultySource,
              }
            : {}),
          tags: primary ? e.assessment!.tags : [],
          responsibility: p.responsibility,
          execution: primary ? e.assessment!.execution : undefined,
          criteria: p.criteria
            ? { ...(primary ? e.assessment!.criteria : {}), ...p.criteria }
            : primary
              ? e.assessment!.criteria
              : undefined,
        },
        ...(!primary
          ? {
              result:
                "simple_" + (p.responsibility === "wrong" ? "gafe" : "good"),
              winner: undefined,
            }
          : {}),
      },
    ];
  });
}
export function assessmentText(e: SkillEvent) {
  if (!e.assessment) return "Registro anterior · sem contexto";
  return [
    criteriaText(e.assessment.criteria),
    e.assessment.execution
      ? executionLabels[e.assessment.execution]
      : undefined,
    difficultyLabels[
      e.assessment.version >= 3
        ? effectiveDifficulty(e)
        : e.assessment.difficulty
    ],
    e.assessment.responsibility
      ? responsibilityLabels[e.assessment.responsibility]
      : undefined,
    ...e.assessment.tags.map(
      (id) => situations.find((t) => t.id === id)?.label,
    ),
    e.assessment.group === "combination"
      ? "Jogada ensaiada"
      : e.assessment.group === "double"
        ? "Bloqueio duplo"
        : e.assessment.group === "triple"
          ? "Bloqueio triplo"
          : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}
