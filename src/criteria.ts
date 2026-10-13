import {
  type AssessmentCriteria,
  type Skill,
  type SkillEvent,
  resultOf,
} from "./model";
export const passLabels = {
  A: "A · perfeita para levantar",
  B: "B · levantável, exige ajuste",
  C: "C · bola ruim",
  error: "Erro direto",
};
export const setTypeOptions = {
  first: "Primeiro tempo",
  second: "Segundo tempo",
  third: "Terceiro tempo",
  head: "Cabeça",
  china: "China",
  setter_tip: "Largadinha do levantador",
};
export const incomingSetOptions = {
  good: "Bom",
  low: "Baixa",
  short: "Curta",
  high_bad: "Alta · inadequada",
  error: "Erro direto",
};
export const faultOptions = {
  net_touch: "Toque na rede · infração",
  invasion: "Invasão · infração",
  attack_net: "Ataque na rede",
  attack_out: "Ataque para fora",
};
export const criteriaFields: {
  key: keyof AssessmentCriteria;
  label: string;
  hint: string;
  skills: Skill[];
  options: Record<string, string>;
}[] = [
  {
    key: "faultType",
    label: "Erro direto / infração",
    hint: "Selecione quando o erro encerrou o rally",
    skills: ["set", "attack", "block"],
    options: faultOptions,
  },
  {
    key: "blockQuality",
    label: "Qualidade / precisão do bloqueio",
    hint: "Base da nota · responsabilidade individual",
    skills: ["block"],
    options: {
      perfect: "Perfeito",
      error: "Erro direto · toque na rede / infração",
      effective: "Toque efetivo · ficou do lado de lá, fácil",
      simple: "Toque simples · facilitou nossa defesa",
      direction: "Fechou a direção, sem toque",
      used: "Usado / explorado",
      late: "Atrasado",
      absent: "Não bloqueou tendo condição",
      gap: "Buraco / mãos mal posicionadas",
      unrated: "Sem oportunidade real",
    },
  },
  {
    key: "passQuality",
    label: "Qualidade do passe",
    hint: "Base da nota",
    skills: ["defense", "reception"],
    options: passLabels,
  },
  {
    key: "incomingBall",
    label: "Bola recebida",
    hint: "Contexto da dificuldade",
    skills: ["defense"],
    options: {
      strong: "Forte",
      long: "Longa / deslocamento",
      tip: "Largada",
      free: "Bola de graça",
      deflection: "Desvio inesperado",
    },
  },
  {
    key: "receivedServe",
    label: "Saque recebido",
    hint: "Contexto da dificuldade",
    skills: ["reception"],
    options: { underhand: "Por baixo", float: "Flutuante", jump: "Viagem" },
  },
  {
    key: "technique",
    label: "Técnica",
    hint: "Informação técnica · sem bônus por tipo",
    skills: ["defense", "reception", "set"],
    options: {
      touch: "Toque",
      bump: "Manchete",
      "one-hand": "Uma mão",
      emergency: "Recurso de emergência",
    },
  },
  {
    key: "serveType",
    label: "Tipo de saque",
    hint: "Analisa risco e resultado; não soma bônus",
    skills: ["serve"],
    options: {
      underhand: "Por baixo",
      float: "Flutuante",
      jump: "Viagem",
      targeted: "Direcionado",
    },
  },
  {
    key: "gameMoment",
    label: "Momento do jogo",
    hint: "Análise separada da nota",
    skills: ["serve"],
    options: {
      normal: "Normal",
      decisive: "Set point / final equilibrado",
      "after-timeout": "Após pedido de tempo",
      "error-streak": "Sequência de erros",
    },
  },
  {
    key: "incomingSet",
    label: "Qualidade do levantamento",
    hint: "Contextualiza a dificuldade do ataque",
    skills: ["attack"],
    options: {
      A: "A · confortável",
      B: "B · exige ajuste",
      C: "C · ruim / limita o ataque",
      poor: "Ruim",
      ...incomingSetOptions,
    },
  },
  {
    key: "setType",
    label: "Levantamento recebido",
    hint: "Sugere a dificuldade junto com o passe; ajuste manual prevalece",
    skills: ["attack", "set"],
    options: {
      ...setTypeOptions,
      chute: "Chute",
      meter: "Metro",
      stretched: "Esticada",
      high: "Alta",
      half: "Meia-bola",
      quick: "Primeiro tempo",
    },
  },
  {
    key: "attackBlockers",
    label: "Bloqueadores adversários",
    hint: "Quantidade enfrentada · contexto tático",
    skills: ["attack"],
    options: {
      none: "Nenhum · 0",
      single: "Simples · 1",
      double: "Duplo · 2",
      triple: "Triplo · 3",
    },
  },
  {
    key: "attackType",
    label: "Tipo de ataque",
    hint: "A escolha é avaliada pelo resultado",
    skills: ["attack"],
    options: {
      power: "Potência",
      tip: "Largada",
      placed: "Colocado",
      tool: "Exploração do bloqueio",
      quick: "Rápido / primeiro tempo",
      free: "Passou de graça",
    },
  },
  {
    key: "approach",
    label: "Passada / aproximação",
    hint: "Opcional · desconto máximo de 0,25, sem repetir gafe",
    skills: ["attack"],
    options: {
      good: "Boa · tempo e equilíbrio",
      adjusted: "Adaptada à bola",
      poor: "Ruim · erro próprio de aproximação",
    },
  },
  {
    key: "incomingPass",
    label: "Passe recebido",
    hint: "Contextualiza a dificuldade; qualidade entregue é a base",
    skills: ["set"],
    options: {
      A: "A · perfeito para levantar",
      B: "B · exige ajuste",
      C: "C · bola ruim",
    },
  },
  {
    key: "setDirection",
    label: "Direção do levantamento",
    hint: "Informação tática · sem bônus por direção",
    skills: ["set"],
    options: {
      front: "Frente / ponta",
      back: "Costas / saída",
      middle: "Meio",
      backrow: "Fundo",
    },
  },
];
export function criteriaError(
  skill: Skill,
  criteria: unknown,
): string | undefined {
  if (criteria === undefined) return;
  if (!criteria || typeof criteria !== "object" || Array.isArray(criteria))
    return "Critérios do fundamento inválidos.";
  for (const [key, value] of Object.entries(criteria)) {
    if (
      key === "faultType" &&
      ["attack_net", "attack_out"].includes(String(value)) &&
      skill !== "attack"
    )
      return "Erro de ataque é exclusivo do ataque.";
    if (skill === "attack" && key === "setType" && value === "setter_tip")
      return "Registre a largadinha do levantador no próprio levantamento.";
    const field = criteriaFields.find(
      (f) => f.key === key && f.skills.includes(skill),
    );
    if (
      !field ||
      typeof value !== "string" ||
      !Object.hasOwn(field.options, value)
    )
      return "Critério incompatível com o fundamento.";
  }
}
export function criteriaText(criteria: AssessmentCriteria | undefined) {
  return criteriaFields
    .filter((f) => criteria?.[f.key] !== undefined)
    .map((f) => `${f.label}: ${f.options[criteria![f.key]!]}`)
    .join(" · ");
}
export function effectiveDifficulty(event: SkillEvent) {
  const a = event.assessment!;
  if (a.difficultySource === "manual") return a.difficulty;
  if (a.tags.includes("save_extreme")) return "emergency";
  if (
    a.tags.includes("magic") &&
    (a.execution
      ? ["good", "excellent", "point"].includes(a.execution)
      : resultOf(event).quality >= 0.7)
  )
    return "emergency";
  if (a.tags.includes("save_hard") && a.difficulty !== "emergency")
    return "hard";
  if (a.difficulty !== "normal") return a.difficulty;
  const c = a.criteria;
  const incoming =
    event.skill === "set"
      ? c?.incomingPass
      : event.skill === "attack"
        ? c?.incomingSet
        : undefined;
  const selectedType = c?.setType;
  const badIncoming =
    incoming === "C" ||
    ["poor", "low", "short", "high_bad", "error"].includes(incoming ?? "");
  if (
    a.setDifficultyVersion === 1 &&
    selectedType &&
    ["set", "attack"].includes(event.skill) &&
    Object.hasOwn(setTypeOptions, selectedType)
  ) {
    // Initial calibration, not an official volleyball rating. Never add type
    // and ball-quality bonuses twice: use one contextual difficulty tier.
    const ballDifficulty =
      incoming === "A" || incoming === "good" ? 0 : badIncoming ? 2 : 1;
    const typeDifficulty =
      selectedType === "third"
        ? 0
        : selectedType === "second" || selectedType === "setter_tip"
          ? 1
          : 2;
    return (["easy", "normal", "hard"] as const)[
      Math.max(ballDifficulty, typeDifficulty)
    ];
  }
  if (incoming)
    return incoming === "A" || incoming === "good"
      ? "easy"
      : badIncoming
        ? "hard"
        : "normal";
  if (event.skill === "defense") {
    if (c?.incomingBall === "deflection") return "emergency";
    if (c?.incomingBall === "strong" || c?.incomingBall === "long")
      return "hard";
    if (c?.incomingBall === "free") return "easy";
  }
  if (event.skill === "reception") {
    if (c?.receivedServe === "jump") return "hard";
    if (c?.receivedServe === "underhand") return "easy";
  }
  return a.difficulty;
}
