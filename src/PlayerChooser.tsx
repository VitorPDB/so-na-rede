import { useEffect, useRef, useState } from "react";
import {
  type Match,
  type Projection,
  type SkillEvent,
  type Role,
  type Zone,
  roleLabels,
  resultOf,
  skills,
} from "./model";
import { Photo } from "./PlayerProfile";
import { AssessmentFields } from "./AssessmentFields";
import { assessmentError } from "./assessment";
export const defaultDefenseMap: Record<Role, 1 | 5 | 6> = {
  outside: 6,
  opposite: 1,
  setter: 1,
  middle: 5,
  libero: 5,
};
export function selectionZone(
  rotationZone: Zone,
  role: Role,
  defense: boolean,
  map = defaultDefenseMap,
): Zone {
  return defense && [1, 5, 6].includes(rotationZone) ? map[role] : rotationZone;
}
export function PlayerChooser({
  match,
  state,
  event,
  correction = false,
  onSelect,
  onClose,
}: {
  match: Match;
  state: Projection;
  event: SkillEvent;
  correction?: boolean;
  onSelect: (id: string, event?: SkillEvent) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(event);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const [view, setView] = useState<"rotation" | "defense">(() => {
    try {
      return localStorage.getItem("so-na-rede:player-view") === "defense"
        ? "defense"
        : "rotation";
    } catch {
      return "rotation";
    }
  });
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = [
          ...(dialog.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),select:not(:disabled),input:not(:disabled),summary",
          ) ?? []),
        ].filter(
          (item) =>
            item.getClientRects().length > 0 &&
            item.getAttribute("aria-disabled") !== "true",
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  const map = match.defenseMap ?? defaultDefenseMap;
  const players = state.lineup.map((id, i) => {
    const p = match.players.find((p) => p.id === id)!;
    const role = p.libero ? "libero" : state.roles[i];
    const rotationZone = (i + 1) as Zone;
    return {
      p,
      role,
      rotationZone,
      displayZone: selectionZone(rotationZone, role, view === "defense", map),
    };
  });
  return (
    <div className="chooser-backdrop">
      <section
        ref={dialog}
        className="player-chooser"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chooser-title"
      >
        <header>
          <div>
            <span className="section-label">
              {correction ? "CORRIGIR ATRIBUIÇÃO" : "QUEM FEZ?"}
            </span>
            <h2 id="chooser-title">
              {skills[current.skill].label} · {resultOf(current).label}
            </h2>
          </div>
          <button
            autoFocus
            className="button secondary"
            aria-label="Fechar seleção de jogador"
            onClick={onClose}
          >
            Cancelar
          </button>
        </header>
        {!correction && (
          <AssessmentFields
            event={current}
            onChange={setCurrent}
            match={match}
            hideChecklist
            hideParticipants
            compact
            eligible={state.lineup}
          />
        )}
        <div
          className="chooser-view"
          role="group"
          aria-label="Visualização dos jogadores"
        >
          <button
            aria-pressed={view === "rotation"}
            onClick={() => {
              setView("rotation");
              try {
                localStorage.setItem("so-na-rede:player-view", "rotation");
              } catch {}
            }}
          >
            Posicionamento em quadra <small>Zona de rotação</small>
          </button>
          <button
            aria-pressed={view === "defense"}
            onClick={() => {
              setView("defense");
              try {
                localStorage.setItem("so-na-rede:player-view", "defense");
              } catch {}
            }}
          >
            Posicionamento de defesa <small>Onde o jogador defende</small>
          </button>
        </div>
        <p className="muted">
          {view === "defense"
            ? "Mapa de defesa configurável. A ordem de rotação permanece a mesma."
            : "Jogadores na ordem da quadra. Selecione quem realizou a ação."}
        </p>
        <div className="net-label">
          <span />
          REDE
          <span />
        </div>
        <div className="chooser-court">
          {([4, 3, 2, 5, 6, 1] as Zone[]).map((z) => (
            <div className="chooser-zone" key={z}>
              <span className="chooser-zone-label">Z{z}</span>
              {players
                .filter((p) => p.displayZone === z)
                .map(({ p, role, rotationZone }) => {
                  const serveOK =
                    current.skill !== "serve" ||
                    (rotationZone === 1 && state.server === "ours");
                  const blockOK =
                    current.skill !== "block" ||
                    (resultOf(current).error &&
                      !["double", "triple"].includes(
                        current.assessment?.group ?? "",
                      )) ||
                    (!p.libero && [2, 3, 4].includes(rotationZone));
                  const attackOK =
                    current.skill !== "attack" ||
                    !current.assessment?.tags.some(
                      (t) => t === "attack_pipe" || t === "attack_back_one",
                    ) ||
                    (!p.libero && [1, 5, 6].includes(rotationZone));
                  return (
                    <button
                      key={p.id}
                      disabled={
                        !serveOK ||
                        !blockOK ||
                        !attackOK ||
                        (!!current.assessment?.group &&
                          !current.participants?.some(
                            (x) => x.playerId === p.id,
                          ) &&
                          (current.participants?.length ?? 0) >=
                            (current.assessment.group === "double"
                              ? 2
                              : current.assessment.group === "triple"
                                ? 3
                                : 6))
                      }
                      aria-label={
                        (correction
                          ? "Corrigir jogador para "
                          : "Registrar ação para ") + p.name
                      }
                      aria-pressed={
                        current.participants?.some(
                          (x) => x.playerId === p.id,
                        ) ?? false
                      }
                      onClick={() => {
                        if (correction || !current.assessment?.group) {
                          onSelect(p.id, current);
                          return;
                        }
                        const members = current.participants ?? [];
                        const next = members.some((x) => x.playerId === p.id)
                          ? members.filter((x) => x.playerId !== p.id)
                          : [
                              ...members,
                              {
                                playerId: p.id,
                                responsibility: "correct" as const,
                              },
                            ];
                        setCurrent({
                          ...current,
                          participants: next,
                          playerId: next.some(
                            (x) => x.playerId === current.playerId,
                          )
                            ? current.playerId
                            : next[0]?.playerId,
                        });
                      }}
                    >
                      <Photo player={p} className="chooser-photo" />
                      <strong>{p.name}</strong>
                      <small>
                        {roleLabels[role]} · rotação Z{rotationZone}
                      </small>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        {!correction && current.assessment?.group && (
          <AssessmentFields
            event={current}
            onChange={setCurrent}
            match={match}
            hideChecklist
            onlyParticipants
            compact
          />
        )}
        {!correction && current.assessment?.group && (
          <div className="group-confirm">
            <p className="muted">
              {assessmentError(current) ??
                `${current.participants?.length} participantes selecionados`}
            </p>
            <button
              className="button"
              disabled={!!assessmentError(current)}
              onClick={() => onSelect(current.playerId!, current)}
            >
              Registrar jogada coletiva
            </button>
          </div>
        )}
        <footer className="muted">
          Sem foto cadastrada, mostramos o número da camisa.{" "}
          {correction
            ? "Resultado, toque e histórico são preservados."
            : "O registro é salvo somente após escolher o jogador."}
        </footer>
      </section>
    </div>
  );
}
