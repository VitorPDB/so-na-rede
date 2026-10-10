import { resultOf, type SkillEvent, type Skill, type Role } from "./model";
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
    label: "Toque simples",
    skills: ["block"],
    category: "execution",
    quality: 0.55,
  },
  {
    id: "touch_effective",
    label: "Toque efetivo · facilita defesa",
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
    skills: ["set"],
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
  version: 1,
  difficulty: "normal",
  tags: [],
});
export function assessmentError(
  event: SkillEvent,
  allowIncomplete = false,
): string | undefined {
  const a = event.assessment;
  if (a !== undefined) {
    if (
      !a ||
      a.version !== 1 ||
      !Object.hasOwn(difficultyLabels, a.difficulty) ||
      !Array.isArray(a.tags) ||
      a.tags.length > 6
    )
      return "Dificuldade/contexto inválido.";
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
        participants: undefined,
        assessment: {
          ...e.assessment!,
          difficulty: p.difficulty ?? e.assessment!.difficulty,
          tags: primary ? e.assessment!.tags : [],
          responsibility: p.responsibility,
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
    difficultyLabels[e.assessment.difficulty],
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
