import { CardSelect } from "./CardSelect";
import { initialAssessment } from "./actionQuality";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  ShieldCheck,
  Trophy,
  Undo2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  type AuditEntry,
  type Command,
  type Match,
  type Player,
  type Side,
  type Skill,
  type SkillEvent,
  type Zone,
  roleLabels,
  ratingProfiles,
  newMatch,
  resultOf,
  skills,
} from "./model";
import {
  activeEntries,
  append,
  assignToZone,
  correct,
  project,
  stats,
  undo,
  openingRoleMigration,
} from "./engine";
import { PlayerChooser } from "./PlayerChooser";
import { Analysis } from "./AnalysisView";
import { Photo, PlayerProfile } from "./PlayerProfile";
import { archiveGame } from "./career";
import { formationAt, toP1 } from "./formation";
import {
  csv,
  download,
  loadMatch,
  parseMatch,
  saveMatch,
  recoveryNotice,
} from "./storage";
import { CloudPanel, usePublication } from "./CloudPanel";
import { PostGameView } from "./PostGameView";
import {
  playerEvents,
  assessmentText,
  difficultyLabels,
  responsibilityLabels,
} from "./assessment";
import { AssessmentFields } from "./AssessmentFields";
import {
  type Page,
  areas,
  areaOf,
  pageTitles,
  WorkspaceTabs,
  FormationLibrary,
} from "./Workspace";
import { Scoreboard, MiniScore } from "./live/Scoreboard";
import { Preparation } from "./prep/Preparation";
import { Report } from "./pages/Report";
import { Roster } from "./pages/Roster";
import { Settings } from "./pages/Settings";
import { FormationEditor } from "./prep/FormationEditor";
import { CourtCard } from "./live/CourtCard";
import { ActionPanel } from "./live/ActionPanel";
import { MatchHistory } from "./MatchHistory";
import { TeamPulse, RecentActions } from "./live/Insights";
import { type Theme, THEME_KEY, applyTheme, readTheme } from "./theme";
import { useOpponentColor } from "./opponentColor";
import { opponentTeam } from "./OpponentLogos";

const number = (n: number) => String(n).padStart(2, "0");
function initial() {
  let recovered: Match | undefined;
  try {
    const saved = loadMatch();
    const match = saved ? openingRoleMigration(saved) : newMatch();
    recovered = match;
    saveMatch(match, saved);
    return { match, error: "" };
  } catch (e) {
    return { match: recovered ?? newMatch(), error: String(e) };
  }
}
function Avatar({
  player,
  small = false,
}: {
  player: Player;
  small?: boolean;
}) {
  if (player.photo)
    return (
      <Photo
        player={player}
        className={small ? "stat-photo small" : "stat-photo"}
      />
    );
  return (
    <span
      className={`avatar ${small ? "small" : ""} ${player.libero ? "libero" : ""}`}
    >
      {number(player.number)}
    </span>
  );
}

export default function App() {
  const [boot] = useState(initial);
  const [match, setMatch] = useState(boot.match);
  const publication = usePublication(match);
  useOpponentColor(opponentTeam(match)?.logo);
  const [storageError, setStorageError] = useState(boot.error);
  const [readBlocked, setReadBlocked] = useState(Boolean(boot.error));
  const [page, setPage] = useState<Page>("live");
  const [editingRoster, setEditingRoster] = useState(false);
  const [profileId, setProfileId] = useState(match.players[0].id);
  const [selected, setSelected] = useState(match.initialLineup[0]);
  const [panel, setPanel] = useState<"sub" | "history" | "formation">();
  useEffect(() => {
    setPanel(undefined);
    window.scrollTo(0, 0);
  }, [page]);
  const [feedback, setFeedback] = useState<
    | {
        message: string;
        side?: Side;
        undoable?: boolean;
        id?: number;
      }
    | undefined
  >(recoveryNotice ? { message: recoveryNotice } : undefined);
  const scoreRef = useRef<HTMLDivElement>(null);
  const [scoreVisible, setScoreVisible] = useState(true);
  useEffect(() => {
    const node = scoreRef.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScoreVisible(entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [page]);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(false);
  const [vibrate, setVibrate] = useState(false);
  const [reportSet, setReportSet] = useState(0);
  const [editing, setEditing] = useState<string>();
  const [editResult, setEditResult] = useState("");
  const [editPlayer, setEditPlayer] = useState("");
  const [editReason, setEditReason] = useState("");
  const [subIn, setSubIn] = useState("");
  const [lineupDraft, setLineupDraft] = useState([...match.initialLineup]);
  const [presetName, setPresetName] = useState("Formação principal");
  const [presetId, setPresetId] = useState("");
  const [previewP, setPreviewP] = useState<Zone>(1);
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      setFeedback({
        message: "Tema aplicado, mas não foi possível salvar a preferência.",
      });
    }
  }, [theme]);
  const [formationZone, setFormationZone] = useState<Zone>(1);
  const [pendingAction, setPendingAction] = useState<SkillEvent>();
  useEffect(() => {
    setPendingAction(undefined);
    setQuickCorrection(undefined);
  }, [page, match.id]);
  const [quickCorrection, setQuickCorrection] = useState<string>();
  const [editDetails, setEditDetails] = useState<SkillEvent>();
  const [serverDraft, setServerDraft] = useState<Side>(match.initialServer);
  const s = project(match);
  const canApplyFormation = s.set === 1 && s.rally === 1 && !s.events.length;
  const showProfile = (id: string) => {
    setProfileId(id);
    setPage("profile");
  };
  const draft = formationAt(lineupDraft, previewP);
  const player = (id: string) => match.players.find((p) => p.id === id)!;
  const selectedPlayer = player(selected) ?? match.players[0];
  const teamStats = stats(s.events, match.weights);
  const playerStats = match.players
    .map((p) => ({
      player: p,
      ...stats(
        playerEvents(s.events, p.id),
        match.weights,
        match.ratingProfiles ?? ratingProfiles,
      ),
    }))
    .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  const highlight =
    playerStats.find((p) => p.count >= 5) ??
    playerStats.find((p) => p.count > 0);
  const recent = s.active
    .filter((e) => e.command?.type === "event" || e.command?.type === "point")
    .slice(-3)
    .reverse();
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => setOfflineReady(true));
    }
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () => setFeedback(undefined),
      feedback.undoable ? 4500 : 3200,
    );
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    if (!s.lineup.includes(selected)) setSelected(s.lineup[0]);
  }, [s.lineup.join(","), selected]);
  const commit = (next: Match, replace = false) => {
    if (readBlocked && !replace) {
      setFeedback({
        message:
          "Há um erro nos dados salvos. Exporte a cópia local antes de continuar.",
      });
      return false;
    }
    try {
      saveMatch(next, replace ? undefined : match);
      void navigator.storage?.persist?.().catch(() => {});
      setMatch(next);
      setStorageError("");
      setReadBlocked(false);
      return true;
    } catch (e) {
      setStorageError(
        e instanceof Error && e.message.includes("outra aba")
          ? e.message
          : "Não foi possível salvar. Exporte o JSON para proteger seus dados.",
      );
      return false;
    }
  };
  const act = (command: Command, message?: string) => {
    try {
      const next = append(match, command);
      if (!commit(next)) return false;
      const after = project(next);
      const winner =
        command.type === "point"
          ? command.winner
          : command.type === "event"
            ? (command.event.winner ?? resultOf(command.event).winner)
            : undefined;
      if (winner) {
        if (vibrate && winner === "theirs") navigator.vibrate?.(60);
      }
      setFeedback({
        message: after.finished
          ? "Partida encerrada. Relatório completo disponível."
          : after.setFinished
            ? `Set ${after.set} encerrado!`
            : message
              ? `${message} · salvo`
              : winner === "ours"
                ? "Ponto nosso!"
                : winner === "theirs"
                  ? "Ponto deles"
                  : "Ação registrada",
        side: winner,
        undoable:
          !after.finished &&
          (command.type === "event" || command.type === "point"),
        id: Date.now(),
      });
      if (after.finished) setPage("report");
      return true;
    } catch (e) {
      setFeedback({ message: (e as Error).message });
      return false;
    }
  };
  const record = (key: Skill, result: string) => {
    const event: SkillEvent = {
      skill: key,
      result,
      assessment:
        key === "opponent" ? undefined : initialAssessment(key, result),
    };

    if (key === "opponent") {
      act({ type: "event", event });
      return;
    }
    setPendingAction(event);
  };
  const assignAction = (playerId: string, details?: SkillEvent) => {
    if (!pendingAction) return;
    const event: SkillEvent = {
      ...(details ?? pendingAction),
      playerId,
      zone:
        (details ?? pendingAction).zone ??
        ((s.lineup.indexOf(playerId) + 1) as Zone),
    };
    const result = resultOf(event);
    if (
      !act(
        { type: "event", event },
        `${skills[event.skill].label} · ${result.label} · ${player(playerId).name}`,
      )
    )
      return;
    setSelected(playerId);
    setPendingAction(undefined);
  };
  const correctionEntry = quickCorrection
    ? activeEntries(match.audit).find((e) => e.id === quickCorrection)
    : undefined;
  const correctionEvent =
    correctionEntry?.command?.type === "event"
      ? correctionEntry.command.event
      : undefined;
  const correctionState = correctionEntry
    ? project({
        ...match,
        audit: activeEntries(match.audit).slice(
          0,
          activeEntries(match.audit).findIndex((e) => e.id === quickCorrection),
        ),
      })
    : undefined;
  const correctPlayer = (playerId: string) => {
    if (!quickCorrection || !correctionEvent) return;
    try {
      const reason = `Jogador corrigido de ${player(correctionEvent.playerId!).name} para ${player(playerId).name}.`;
      if (
        commit(
          correct(
            match,
            quickCorrection,
            {
              ...correctionEvent,
              playerId,
              participants: correctionEvent.participants?.some(
                (p) => p.playerId === playerId,
              )
                ? correctionEvent.participants
                : correctionEvent.participants?.map((p) =>
                    p.playerId === correctionEvent.playerId
                      ? { ...p, playerId }
                      : p,
                  ),
            },
            reason,
          ),
        )
      ) {
        setQuickCorrection(undefined);
        setFeedback({ message: reason });
      }
    } catch (e) {
      setFeedback({ message: (e as Error).message });
    }
  };
  const exportJson = () =>
    download(
      `so-na-rede-${match.id.slice(0, 8)}.json`,
      JSON.stringify(
        {
          ...match,
          projection: s,
          report: { team: teamStats, players: playerStats },
        },
        null,
        2,
      ),
      "application/json",
    );
  const exportCsv = () => {
    download(
      "so-na-rede-eventos.csv",
      csv([
        [
          "id",
          "data",
          "set",
          "rally",
          "toque",
          "jogador",
          "camisa",
          "funcao",
          "fundamento",
          "resultado",
          "zona",
          "rotacao",
          "saque",
          "video_ms",
          "contexto",
          "participantes",
        ],
        ...s.events.map((e) => [
          e.id,
          e.createdAt,
          e.set,
          e.rally,
          e.touch,
          e.playerId ? player(e.playerId).name : "Adversário",
          e.playerId ? player(e.playerId).number : "",
          e.role ? roleLabels[e.role] : "",
          skills[e.skill].label,
          resultOf(e).label,
          e.zone,
          e.rotation,
          e.serving,
          e.videoTimestampMs,
          assessmentText(e),
          e.participants
            ?.map(
              (p) =>
                `${player(p.playerId).name}: ${p.role ? roleLabels[p.role] : ""}, ${p.skill ? skills[p.skill].label : skills[e.skill].label}, ${p.difficulty ? difficultyLabels[p.difficulty] : "conforme jogada"}, ${responsibilityLabels[p.responsibility]}`,
            )
            .join(" | "),
        ]),
      ]),
      "text/csv;charset=utf-8",
    );
  };
  const exportReport = () =>
    download(
      "so-na-rede-relatorio.csv",
      csv([
        [
          "escopo",
          "nome",
          "nota",
          "acoes",
          "pontos",
          "erros",
          "melhor",
          "motivo_melhor",
          "pior",
          "motivo_pior",
        ],
        [
          "time",
          match.team,
          teamStats.rating?.toFixed(1),
          teamStats.count,
          teamStats.points,
          teamStats.errors,
          teamStats.best?.label,
          teamStats.reason(teamStats.best),
          teamStats.worst?.label,
          teamStats.reason(teamStats.worst),
        ],
        ...playerStats.map((p) => [
          "atleta",
          p.player.name,
          p.rating?.toFixed(1),
          p.count,
          p.points,
          p.errors,
          p.best?.label,
          p.reason(p.best),
          p.worst?.label,
          p.reason(p.worst),
        ]),
      ]),
      "text/csv;charset=utf-8",
    );
  const initFormationDraft = (keepCurrentP = false) => {
    const currentP = Math.max(1, s.roles.indexOf("setter") + 1) as Zone;
    setFormationZone(keepCurrentP ? currentP : 1);
    setPreviewP(keepCurrentP ? currentP : 1);
    setPresetId("");
    setLineupDraft(
      toP1(
        s.lineup.map((id) =>
          id === s.libero?.playerId ? s.libero.replaced : id,
        ),
        Math.max(1, s.roles.indexOf("setter") + 1),
      ),
    );
    const lastFormation = [...s.active]
      .reverse()
      .find(
        (e) => e.command?.type === "setup" || e.command?.type === "nextSet",
      )?.command;
    const firstServer =
      lastFormation?.type === "setup" || lastFormation?.type === "nextSet"
        ? lastFormation.server
        : match.initialServer;
    setServerDraft(
      s.setFinished
        ? s.set + 1 === match.bestOf
          ? "ours"
          : firstServer === "ours"
            ? "theirs"
            : "ours"
        : firstServer,
    );
  };
  const [presetsOpen, setPresetsOpen] = useState(false);
  const openFormation = (fromLibrary = false) => {
    initFormationDraft();
    setPresetsOpen(fromLibrary === true);
    setPanel("formation");
  };
  const selectPreset = (id: string) => {
    const preset = match.formations?.find((f) => f.id === id);
    setPresetId(id);
    if (preset) {
      setLineupDraft([...preset.lineup]);
      setPresetName(preset.name);
      setPreviewP(1);
    }
  };
  const savePreset = () => {
    const id = presetId || crypto.randomUUID();
    const formation = { id, name: presetName.trim(), lineup: [...lineupDraft] };
    const saved = {
      ...match,
      formations: [
        ...(match.formations ?? []).filter((f) => f.id !== id),
        formation,
      ],
    };
    const next = canApplyFormation
      ? append(saved, {
          type: "setup",
          lineup: draft.lineup,
          roles: draft.roles,
          server: serverDraft,
        })
      : saved;
    if (commit(next)) {
      setPresetId(id);
      setFeedback({
        message: canApplyFormation
          ? "P1 salva e formação aplicada ao vivo."
          : "P1 salva para a próxima formação.",
      });
    }
  };
  const deletePreset = () => {
    if (
      commit({
        ...match,
        formations: (match.formations ?? []).filter((f) => f.id !== presetId),
      })
    )
      setPresetId("");
  };
  const assignFormation = (playerId: string) =>
    setLineupDraft((ids) =>
      toP1(
        assignToZone(
          formationAt(ids, previewP).lineup,
          formationZone,
          playerId,
        ),
        previewP,
      ),
    );
  const canConfirmFormation =
    (s.set === 1 && s.rally === 1 && !s.events.length) ||
    (s.setFinished && !s.finished);
  const confirmFormation = (after?: () => void) => {
    try {
      const next = append(match, {
        type: s.setFinished ? "nextSet" : "setup",
        lineup: draft.lineup,
        roles: draft.roles,
        server: serverDraft,
      });
      if (commit(next)) {
        setPanel(undefined);
        setFeedback({ message: "Formação confirmada. Bom jogo!" });
        after?.();
      }
    } catch (e) {
      setFeedback({ message: (e as Error).message });
    }
  };
  const label = (entry: AuditEntry) => {
    const c = entry.command;
    if (c?.type === "restartSet")
      return "Set reiniciado · estatísticas do set removidas";
    if (entry.kind === "correction" && c?.type === "event")
      return `Correção · ${c.event.playerId ? player(c.event.playerId)?.name : "Adversário"} · ${skills[c.event.skill].label} · ${resultOf(c.event).label} · Motivo: ${entry.reason}`;
    if (!c)
      return `${entry.kind === "undo" ? "Desfeito" : "Corrigido"} · ${entry.reason ?? ""}`;
    if (c.type === "event")
      return `${c.event.playerId ? player(c.event.playerId)?.name : "Adversário"} · ${skills[c.event.skill].label} · ${resultOf(c.event).label}${c.event.assessment ? " · " + assessmentText(c.event) : ""}${c.event.participants ? " · " + c.event.participants.map((p) => player(p.playerId).name + ": " + responsibilityLabels[p.responsibility]).join(", ") : ""}`;
    if (c.type === "timeout")
      return `Pedido de tempo ${c.side === "ours" ? "nosso" : "deles"}`;
    if (c.type === "point")
      return c.winner === "ours"
        ? "Ponto nosso · sem fundamento"
        : "Ponto deles · sem fundamento";
    if (c.type === "sub")
      return `${player(c.outgoing).name} → ${player(c.incoming).name}`;
    if (c.type === "autoLibero")
      return `Líbero automático ${c.enabled ? "ativado" : "desativado"}`;
    if (c.type === "libero")
      return c.playerId
        ? `Líbero entra · ${player(c.playerId).name}`
        : "Líbero sai";
    return c.type === "nextSet"
      ? "Novo set · formação confirmada"
      : "Formação inicial confirmada";
  };
  const importBackup = async (file: File) => {
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Backup excede o limite de 25 MB.");
      const data = parseMatch(await file.text());
      if (
        window.confirm(
          "Substituir o jogo atual por este backup? Exporte o atual antes, se necessário.",
        )
      )
        commit(data, true);
    } catch {
      setFeedback({ message: "Backup inválido. O jogo atual foi preservado." });
    }
  };
  const startNewMatch = () => {
    if (
      !window.confirm(
        "Iniciar nova partida? O resumo deste jogo será preservado no histórico. Elenco, fotos, formações e pesos serão mantidos.",
      )
    )
      return;
    const lastFormation = [...s.active]
      .reverse()
      .find(
        (e) => e.command?.type === "setup" || e.command?.type === "nextSet",
      )?.command;
    const starting =
      lastFormation?.type === "setup" || lastFormation?.type === "nextSet"
        ? lastFormation
        : { lineup: match.initialLineup, roles: match.initialRoles };
    const next = {
      ...newMatch(),
      players: match.players,
      team: match.team,
      opponent: match.opponent,
      opponentTeams: match.opponentTeams,
      bestOf: match.bestOf,
      initialLineup: starting.lineup,
      initialRoles: starting.roles,
      initialAutoLibero: s.autoLibero,
      defenseMap: match.defenseMap,
      formations: match.formations,
      ratingProfiles: match.ratingProfiles,
      middleCoverage: match.middleCoverage,
      middleBackrowWeights: match.middleBackrowWeights,
      weights: match.weights,
      history: archiveGame(match),
      postGameDraft: match.postGameDraft,
      detailedDraft: match.detailedDraft,
    };
    if (commit(next)) {
      setPage("live");
      setReportSet(0);
    }
  };
  const restartSet = () => {
    if (
      !window.confirm(
        `Reiniciar apenas o set ${s.set}? O placar volta a 0–0 e as ações e notas deste set saem das estatísticas. Os sets anteriores serão mantidos. A formação e o saque voltam ao início deste set. Você pode desfazer.`,
      )
    )
      return;
    if (
      act(
        { type: "restartSet" },
        `Set ${s.set} reiniciado. Notas recalculadas sem as ações deste set.`,
      )
    ) {
      setPendingAction(undefined);
      setQuickCorrection(undefined);
      setEditing(undefined);
      setPanel(undefined);
      setReportSet(0);
      setPage("live");
    }
  };
  const isDisabled = s.setFinished || s.finished;
  const canUndo = s.active.length > 0;
  const doUndo = () => {
    if (!canUndo) return;
    const next = undo(match);
    if (commit(next)) {
      setPendingAction(undefined);
      setFeedback({ message: "Última ação desfeita. Histórico preservado." });
    }
  };
  const openSubs = (incoming = "") => {
    setPanel("sub");
    setSubIn(incoming);
  };
  const showUndo = page === "live" || page === "analysis";
  const area = areaOf(page);
  return (
    <div className={`shell rebrand page-${page}`}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      {publication.enabled && (
        <div className="cloud-status" role="status">
          {publication.status}
        </div>
      )}
      <aside className="rail" aria-label="Navegação">
        <a
          className="rail-brand"
          aria-label="Só na Rede — início"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("live");
          }}
        >
          <img src="/team-logo-transparent.png" alt="" />
          <span>
            Só na Rede<small>Dentro do jogo</small>
          </span>
        </a>
        <nav className="rail-nav" aria-label="Navegação principal">
          {areas.map((item) => {
            const current = area.id === item.id;
            return (
              <button
                type="button"
                key={item.id}
                className="rail-item"
                aria-label={item.label}
                aria-current={current ? "page" : undefined}
                onClick={() => setPage(item.id)}
              >
                <item.icon size={20} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="rail-foot">
          <span className={"rail-status " + (storageError ? "is-error" : "")}>
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              <strong>
                {storageError ? "Falha ao salvar" : "Salvo neste dispositivo"}
              </strong>
              <small>
                {!online
                  ? "Sem conexão"
                  : offlineReady
                    ? "Offline pronto"
                    : "Preparando offline"}
              </small>
            </span>
          </span>
          {showUndo && (
            <button
              type="button"
              className="ui-btn ui-btn--secondary rail-undo"
              disabled={!canUndo}
              onClick={doUndo}
            >
              <Undo2 size={18} aria-hidden="true" />
              Desfazer
            </button>
          )}
        </div>
      </aside>
      <nav className="tabbar" aria-label="Navegação principal">
        {areas.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-current={area.id === item.id ? "page" : undefined}
            onClick={() => setPage(item.id)}
          >
            <item.icon size={22} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {showUndo && (
        <button
          type="button"
          className="fab-undo"
          disabled={!canUndo}
          onClick={doUndo}
          aria-label="Desfazer última ação"
        >
          <Undo2 size={20} aria-hidden="true" />
          <span>Desfazer</span>
        </button>
      )}
      <main className="shell-main" id="conteudo">
        <header className="appbar">
          <div className="appbar-title">
            <span className="ui-eyebrow">
              Só na Rede <span aria-hidden="true">/</span> {area.label}
            </span>
            <h1>
              {page === "profile"
                ? (player(profileId)?.name ?? "Perfil do jogador")
                : pageTitles[page]}
            </h1>
          </div>
          <WorkspaceTabs page={page} onPage={setPage} />
          <div className="appbar-actions">
            <span
              className={
                "conn-pill " +
                (!online ? "is-off" : offlineReady ? "is-ready" : "")
              }
              title={
                !online
                  ? "Sem conexão"
                  : offlineReady
                    ? "Offline pronto"
                    : "Preparando offline"
              }
            >
              {online ? (
                <Wifi size={15} aria-hidden="true" />
              ) : (
                <WifiOff size={15} aria-hidden="true" />
              )}
              <span>
                {!online
                  ? "Sem conexão"
                  : offlineReady
                    ? "Offline pronto"
                    : "Preparando offline"}
              </span>
            </span>
          </div>
        </header>
        {storageError && (
          <div className="ui-alert" role="alert">
            <span>{storageError}</span>
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--sm"
              onClick={() =>
                download(
                  "copia-local.json",
                  localStorage.getItem("so-na-rede:match:v1") ?? "{}",
                  "application/json",
                )
              }
            >
              Exportar cópia local
            </button>
          </div>
        )}
        {page === "live" && (
          <div className="lv">
            <div ref={scoreRef}>
              <Scoreboard
                match={match}
                state={s}
                busy={!!pendingAction}
                onTimeout={(side) =>
                  act(
                    { type: "timeout", side },
                    `Pedido de tempo ${side === "ours" ? "nosso" : "deles"} registrado`,
                  )
                }
              />
            </div>
            <MiniScore match={match} state={s} visible={!scoreVisible} />
            {s.setFinished && (
              <div className="set-banner" role="status">
                <Trophy size={22} aria-hidden="true" />
                <span>
                  {s.finished
                    ? "Partida concluída. Todas as estatísticas estão disponíveis."
                    : `Set ${s.set} encerrado em ${s.score.join("–")}. Confirme a formação do próximo set.`}
                </span>
                <button
                  type="button"
                  className="ui-btn ui-btn--primary"
                  onClick={() =>
                    s.finished ? setPage("report") : openFormation()
                  }
                >
                  {s.finished ? "Ver relatório" : "Preparar próximo set"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="lv-grid">
              <CourtCard
                match={match}
                state={s}
                selected={selected}
                picking={!!pendingAction}
                disabled={isDisabled}
                onPlayer={(id) => {
                  if (pendingAction) assignAction(id);
                  else {
                    setSelected(id);
                  }
                }}
                onSubs={() => openSubs()}
                onBench={(id) => openSubs(id)}
                onAutoLibero={() =>
                  act(
                    { type: "autoLibero", enabled: !s.autoLibero },
                    s.autoLibero
                      ? "Líbero automático desativado"
                      : "Líbero automático ativado",
                  )
                }
              />
              <ActionPanel
                state={s}
                disabled={isDisabled}
                onRecord={record}
                onPoint={(winner) => act({ type: "point", winner })}
              />
              <TeamPulse
                team={teamStats}
                highlight={highlight}
                onStats={() => setPage("report")}
              />
              <RecentActions
                state={s}
                recent={recent}
                label={label}
                playerName={(id) => player(id)?.name ?? ""}
                onHistory={() => setPanel("history")}
                onCorrect={setQuickCorrection}
                onFormation={openFormation}
              />
            </div>
          </div>
        )}
        {page === "prepare" && (
          <Preparation
            match={match}
            state={s}
            offlineReady={offlineReady}
            onChange={commit}
            onPrepareDraft={() => initFormationDraft(true)}
            onStart={() => setPage("live")}
            renderFormation={(onDone) => (
              <FormationEditor
                match={match}
                draft={draft}
                previewP={previewP}
                zone={formationZone}
                server={serverDraft}
                presetId={presetId}
                presetName={presetName}
                canConfirm={canConfirmFormation}
                canApplyNow={canApplyFormation}
                confirmLabel={
                  s.setFinished
                    ? `Confirmar formação do set ${s.set + 1}`
                    : "Confirmar formação e saque"
                }
                onPreviewP={(p) => {
                  setPreviewP(p);
                  setFormationZone(p);
                }}
                onZone={setFormationZone}
                onAssign={assignFormation}
                onServer={setServerDraft}
                onPresetSelect={selectPreset}
                onPresetName={setPresetName}
                onPresetSave={savePreset}
                onPresetDelete={deletePreset}
                onConfirm={() => confirmFormation(onDone)}
              />
            )}
          />
        )}
        {page === "formations" && (
          <FormationLibrary
            match={match}
            state={s}
            onEdit={(id) => {
              openFormation(true);
              const preset = match.formations?.find((f) => f.id === id);
              if (preset) {
                setPresetId(preset.id);
                setPresetName(preset.name);
                setLineupDraft([...preset.lineup]);
                setPreviewP(1);
              }
            }}
          />
        )}
        {page === "analysis" && (
          <>
            <Analysis
              match={match}
              onProfile={showProfile}
              onTimeout={(side) =>
                act(
                  { type: "timeout", side },
                  `Pedido de tempo ${side === "ours" ? "nosso" : "deles"} registrado`,
                )
              }
            />
          </>
        )}
        {page === "report" && (
          <Report
            match={match}
            set={reportSet}
            onSet={setReportSet}
            onExportSummary={exportReport}
            onExportEvents={exportCsv}
            onProfile={showProfile}
          />
        )}
        {page === "history" && (
          <MatchHistory match={match} onChange={(next) => commit(next)} />
        )}
        {page === "roster" && (
          <Roster
            match={match}
            stats={playerStats}
            editing={editingRoster}
            onEditing={setEditingRoster}
            onProfile={showProfile}
            onChange={commit}
          />
        )}
        {page === "profile" && (
          <PlayerProfile
            key={profileId}
            match={match}
            player={player(profileId) ?? match.players[0]}
            onBack={() => setPage("roster")}
            onChange={(updated) =>
              commit({
                ...match,
                players: match.players.map((p) =>
                  p.id === updated.id ? updated : p,
                ),
              })
            }
          />
        )}
        {page === "postgame" && (
          <PostGameView
            match={match}
            onChange={commit}
            onApplied={() => {
              setPage("analysis");
              setReportSet(0);
              setPanel(undefined);
              setPendingAction(undefined);
            }}
          />
        )}
        {page === "settings" && (
          <Settings
            match={match}
            theme={theme}
            vibrate={vibrate}
            currentSet={s.set}
            canRestartSet={
              !(
                s.rally === 1 &&
                !s.events.some((e) => e.set === s.set) &&
                !s.markers.some((m) => m.set === s.set) &&
                !s.substitutions &&
                !s.libero
              )
            }
            cloudPanel={<CloudPanel publication={publication} />}
            onChange={commit}
            onTheme={setTheme}
            onVibrate={setVibrate}
            onFormation={openFormation}
            onExport={exportJson}
            onImport={importBackup}
            onNewMatch={startNewMatch}
            onRestartSet={restartSet}
          />
        )}
        {panel && (
          <div
            className="drawer-scrim"
            onClick={() => setPanel(undefined)}
            aria-hidden="true"
          />
        )}
        {panel && (
          <section
            className={
              "panel drawer" + (panel === "formation" ? " drawer--wide" : "")
            }
            role="dialog"
            aria-modal="true"
            aria-label={
              panel === "sub"
                ? "Substituições e líbero"
                : panel === "history"
                  ? "Histórico e auditoria"
                  : "Formação"
            }
            onKeyDown={(e) => e.key === "Escape" && setPanel(undefined)}
          >
            <div className="panel-top">
              <div>
                <span className="eyebrow">CONTROLE DA PARTIDA</span>
                <h2>
                  {panel === "sub"
                    ? "Substituições e líbero"
                    : panel === "history"
                      ? "Histórico e auditoria"
                      : s.setFinished
                        ? `Formação do set ${s.set + 1}`
                        : "Formação inicial"}
                </h2>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Fechar painel"
                onClick={() => setPanel(undefined)}
              >
                <X />
              </button>
            </div>
            {panel === "sub" && (
              <>
                <p className="muted">
                  Sai: <strong>{selectedPlayer.name}</strong> · zona{" "}
                  {s.lineup.indexOf(selected) + 1}. Selecione quem entra.
                </p>
                <div className="sub-options">
                  {match.players
                    .filter(
                      (p) =>
                        !s.lineup.includes(p.id) && p.id !== s.libero?.replaced,
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        className={subIn === p.id ? "chosen" : ""}
                        onClick={() => setSubIn(p.id)}
                      >
                        <Avatar player={p} />
                        <span>
                          {p.name}
                          <small>{p.positions.join(" · ")}</small>
                        </span>
                      </button>
                    ))}
                </div>
                <button
                  className="button primary"
                  disabled={!subIn || isDisabled}
                  onClick={() => {
                    const p = player(subIn);
                    act(
                      p.libero
                        ? { type: "libero", playerId: p.id, replaced: selected }
                        : { type: "sub", incoming: p.id, outgoing: selected },
                      "Troca registrada",
                    );
                  }}
                >
                  Confirmar entrada <ArrowLeftRight size={18} />
                </button>
                {s.libero && (
                  <button
                    className="button secondary"
                    disabled={isDisabled}
                    onClick={() =>
                      act(
                        { type: "libero" },
                        "Líbero saiu; atleta original voltou",
                      )
                    }
                  >
                    Retirar líbero · volta {player(s.libero.replaced).name}
                  </button>
                )}
                <p className="muted">
                  {s.substitutions}/6 substituições no set. Trocas de líbero são
                  separadas. Para trocar outro jogador, feche o painel e
                  selecione-o na quadra.
                </p>
              </>
            )}
            {panel === "formation" && (
              <FormationEditor
                match={match}
                draft={draft}
                previewP={previewP}
                zone={formationZone}
                server={serverDraft}
                presetId={presetId}
                presetName={presetName}
                canConfirm={canConfirmFormation}
                canApplyNow={canApplyFormation}
                confirmLabel={
                  s.setFinished
                    ? `Confirmar formação do set ${s.set + 1}`
                    : "Confirmar formação e saque"
                }
                onPreviewP={(p) => {
                  setPreviewP(p);
                  setFormationZone(p);
                }}
                onZone={setFormationZone}
                onAssign={assignFormation}
                onServer={setServerDraft}
                onPresetSelect={selectPreset}
                onPresetName={setPresetName}
                onPresetSave={savePreset}
                onPresetDelete={deletePreset}
                onConfirm={() => confirmFormation()}
                presetsOpen={presetsOpen}
              />
            )}
            {panel === "history" && (
              <>
                <p className="muted">
                  Correções preservam o original. Uma mudança de ponto recalcula
                  também as rotações e os sets.
                </p>
                <div className="audit-list">
                  {[...match.audit].reverse().map((e) => {
                    const active = s.active.find((x) => x.id === e.id);
                    const activeEvent =
                      active?.command?.type === "event"
                        ? active.command.event
                        : undefined;
                    return (
                      <div className="audit-row" key={e.id}>
                        <small>
                          {e.context
                            ? `S${e.context.set} · R${e.context.rally}`
                            : "AUDITORIA"}{" "}
                          · {new Date(e.createdAt).toLocaleTimeString("pt-BR")}
                        </small>
                        <p>{label(e)}</p>
                        {active?.command?.type === "event" && (
                          <button
                            className="button secondary"
                            onClick={() => {
                              setEditing(e.id);
                              setEditDetails(activeEvent);
                              setEditPlayer(
                                active.command!.type === "event"
                                  ? (activeEvent!.playerId ?? "")
                                  : "",
                              );
                              setEditResult(
                                active.command!.type === "event"
                                  ? activeEvent!.result
                                  : "",
                              );
                              setEditReason("");
                            }}
                          >
                            Corrigir
                          </button>
                        )}
                        {editing === e.id &&
                          active?.command?.type === "event" && (
                            <div className="correction-form">
                              <label>
                                JOGADOR
                                <CardSelect
                                  value={editPlayer}
                                  onChange={(ev) =>
                                    setEditPlayer(ev.target.value)
                                  }
                                  disabled={activeEvent!.skill === "opponent"}
                                >
                                  <option value="">Adversário</option>
                                  {match.players.map((p) => (
                                    <option value={p.id} key={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </CardSelect>
                              </label>
                              <label>
                                RESULTADO
                                <CardSelect
                                  value={editResult}
                                  onChange={(ev) => {
                                    setEditResult(ev.target.value);
                                    if (
                                      editDetails?.assessment?.version === 4
                                    ) {
                                      const criteria = {
                                        ...editDetails.assessment.criteria,
                                      };
                                      delete criteria.passQuality;
                                      delete criteria.blockQuality;
                                      setEditDetails({
                                        ...editDetails,
                                        result: ev.target.value,
                                        assessment: {
                                          ...editDetails.assessment,
                                          execution: undefined,
                                          criteria,
                                        },
                                      });
                                    }
                                  }}
                                >
                                  {skills[activeEvent!.skill].results.map(
                                    (r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.label}
                                      </option>
                                    ),
                                  )}
                                </CardSelect>
                              </label>
                              <label>
                                MOTIVO
                                <input
                                  value={editReason}
                                  onChange={(ev) =>
                                    setEditReason(ev.target.value)
                                  }
                                  placeholder="Ex.: jogador atribuído incorretamente"
                                />
                              </label>
                              {editDetails && (
                                <AssessmentFields
                                  event={{
                                    ...editDetails,
                                    result: editResult,
                                    playerId: editPlayer || undefined,
                                  }}
                                  onChange={(event) => {
                                    setEditDetails(event);
                                    setEditResult(event.result);
                                    setEditPlayer(event.playerId ?? "");
                                  }}
                                  match={match}
                                />
                              )}
                              <button
                                className="button primary"
                                onClick={() => {
                                  try {
                                    if (
                                      commit(
                                        correct(
                                          match,
                                          e.id,
                                          {
                                            ...activeEvent!,
                                            ...editDetails,
                                            result: editResult,
                                            playerId: editPlayer || undefined,
                                            winner: undefined,
                                          },
                                          editReason,
                                        ),
                                      )
                                    ) {
                                      setEditing(undefined);
                                      setFeedback({
                                        message: "Correção salva na auditoria.",
                                      });
                                    }
                                  } catch (err) {
                                    setFeedback({
                                      message: (err as Error).message,
                                    });
                                  }
                                }}
                              >
                                Salvar correção
                              </button>
                            </div>
                          )}
                      </div>
                    );
                  })}
                  {!match.audit.length && (
                    <p className="muted">Nenhuma ação registrada.</p>
                  )}
                </div>
              </>
            )}
          </section>
        )}
        {pendingAction && (
          <PlayerChooser
            match={match}
            state={s}
            event={pendingAction}
            onSelect={assignAction}
            onClose={() => setPendingAction(undefined)}
          />
        )}
        {correctionEvent && correctionState && (
          <PlayerChooser
            match={match}
            state={correctionState}
            event={correctionEvent}
            correction
            onSelect={correctPlayer}
            onClose={() => setQuickCorrection(undefined)}
          />
        )}
        {feedback && (
          <div
            key={feedback.id ?? feedback.message}
            className={`snackbar ${feedback.side ?? ""}`}
            role="status"
            aria-live="polite"
          >
            <span className="snackbar-icon" aria-hidden="true">
              {feedback.side === "ours" ? (
                <Check size={18} />
              ) : feedback.side === "theirs" ? (
                <X size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
            </span>
            <span className="snackbar-text">{feedback.message}</span>
            {feedback.undoable && canUndo && (
              <button
                type="button"
                className="snackbar-action"
                onClick={doUndo}
              >
                Desfazer
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
