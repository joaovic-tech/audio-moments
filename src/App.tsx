import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/AppHeader";
import { AudioPlayer } from "@/components/AudioPlayer";
import { AudioRecorder } from "@/components/AudioRecorder";
import { ConfirmDialog, type ConfirmOptions } from "@/components/ConfirmDialog";
import { ImportExportControls } from "@/components/ImportExportControls";
import { ImportProjectDialog } from "@/components/ImportProjectDialog";
import { ImportantMomentList } from "@/components/ImportantMomentList";
import { MarkMomentButton } from "@/components/MarkMomentButton";
import { MOMENT_RANGE_EDITOR_ID } from "@/components/MomentRangeEditor";
import { ProjectSummaryCard } from "@/components/ProjectSummaryCard";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { useIsVisible } from "@/hooks/useIsVisible";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { useWaveform } from "@/hooks/useWaveform";
import { useProject } from "@/hooks/useProject";
import { useProjectPersistence } from "@/hooks/useProjectPersistence";
import { usePwa } from "@/hooks/usePwa";
import { useTheme } from "@/hooks/useTheme";
import { resolveProjectName } from "@/lib/fileName";
import { findMomentAt } from "@/lib/momentRange";
import { formatTime, formatTimePrecise } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  ClipExportError,
  clipFileName,
  exportAudioClip,
} from "@/services/audioClipService";
import { extensionForMimeType, probeAudio } from "@/services/audioService";
import {
  ExportError,
  createProjectExport,
  downloadBlob,
  findIncompleteMoments,
  getExportFileNames,
} from "@/services/projectExportService";
import {
  ImportError,
  prepareImport,
  type ImportPreview,
} from "@/services/projectImportService";
import type { ImportantMoment, RecordingResult } from "@/types/project";

/** Tempo em que o botão de marcação fica bloqueado após cada clique. */
const MARK_COOLDOWN_MS = 2000;

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export default function App() {
  const {
    project,
    hasContent,
    setName,
    clearContent,
    setRecordedAudio,
    loadImported,
    restore,
    addMoment,
    updateMoment,
    updateMomentRange,
    deleteMoment,
    markSaved,
  } = useProject();
  const { theme, toggleTheme } = useTheme();
  const { audio, moments } = project;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImportingAudio, setIsImportingAudio] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [editingIds, setEditingIds] = useState<ReadonlySet<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isMarkLocked, setIsMarkLocked] = useState(false);
  const markLockTimerRef = useRef<number | null>(null);

  /* ---------- Salvamento automático (IndexedDB) ---------- */

  const persistence = useProjectPersistence({
    project,
    onRestore: (stored) => {
      restore(
        stored.audio,
        stored.name,
        stored.moments,
        stored.hasUnsavedChanges,
      );
      toast.success("Projeto restaurado", {
        description: `${resolveProjectName(stored.name)} · ${pluralize(stored.moments.length, "marcação", "marcações")}. Salvo automaticamente neste navegador.`,
      });
    },
    onError: (error) => {
      toast.error("Salvamento automático indisponível", {
        description: `${error.message} Exporte o .zip para não perder o trabalho.`,
        duration: 10_000,
      });
    },
  });

  const handleRecordingComplete = useCallback(
    async ({ blob, mimeType, elapsedSeconds }: RecordingResult) => {
      setIsProcessing(true);
      let durationSeconds: number | null = null;
      try {
        ({ durationSeconds } = await probeAudio(blob));
      } catch {
        // Mantém a duração medida pelo cronômetro.
      }
      setRecordedAudio({
        blob,
        mimeType,
        extension: extensionForMimeType(mimeType),
        source: "recording",
        durationSeconds:
          durationSeconds !== null && Number.isFinite(durationSeconds)
            ? durationSeconds
            : elapsedSeconds,
      });
      setIsProcessing(false);
      toast.success("Gravação finalizada", {
        description: "Ouça o áudio, revise as marcações e exporte o projeto.",
      });
    },
    [setRecordedAudio],
  );

  const recorder = useAudioRecorder({
    onComplete: handleRecordingComplete,
    onInterrupted: (message) => toast.warning(message),
  });

  const audioUrl = useObjectUrl(audio?.blob ?? null);
  const player = useAudioPlayer(audioUrl, audio?.durationSeconds ?? null);
  const {
    audioRef,
    currentTime: playbackTime,
    duration: playbackDuration,
  } = player;
  const waveform = useWaveform(
    audio?.blob ?? null,
    audio?.durationSeconds ?? null,
  );
  const selectedMoment =
    moments.find((moment) => moment.id === selectedMomentId) ?? null;

  const isRecorderBusy =
    recorder.isActive || recorder.status === "requesting" || isProcessing;

  /* ---------- Modo offline (PWA) ---------- */

  const pwa = usePwa();
  const { offlineReady, dismissOfflineReady, needRefresh, dismissUpdate, update } = pwa;
  // A atualização recarrega a página: nunca no meio de uma gravação.
  const isRecorderBusyRef = useRef(isRecorderBusy);
  useEffect(() => {
    isRecorderBusyRef.current = isRecorderBusy;
  }, [isRecorderBusy]);

  useEffect(() => {
    if (!offlineReady) return;
    toast.success("Pronto para usar sem internet", {
      description:
        "O app foi guardado neste navegador e abre mesmo offline.",
    });
    dismissOfflineReady();
  }, [offlineReady, dismissOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    const toastId = toast("Nova versão disponível", {
      description:
        "Atualize para usar as novidades. Seu projeto salvo continua aqui.",
      duration: Infinity,
      action: {
        label: "Atualizar",
        onClick: (event) => {
          if (isRecorderBusyRef.current) {
            event.preventDefault(); // mantém o aviso aberto
            toast.warning("Finalize a gravação antes de atualizar.");
            return;
          }
          void update();
        },
      },
      onDismiss: dismissUpdate,
    });
    return () => {
      toast.dismiss(toastId);
    };
  }, [needRefresh, dismissUpdate, update]);
  const canMark = recorder.isActive || (audio !== null && !isProcessing);

  // O projeto é salvo automaticamente; o aviso ao fechar fica para o que ainda não foi salvo:
  // uma gravação em andamento (ou sendo processada) ou um navegador sem salvamento automático.
  const cannotPersist =
    persistence.status === "unavailable" || persistence.status === "error";
  useBeforeUnload(
    recorder.isActive ||
      recorder.status === "requesting" ||
      isProcessing ||
      (cannotPersist && project.hasUnsavedChanges),
  );

  /* ---------- Gravação ---------- */

  const startRecording = useCallback(() => {
    const begin = () => {
      player.pause();
      clearContent();
      setEditingIds(new Set());
      setSelectedMomentId(null);
      void recorder.start();
    };
    if (!hasContent) {
      begin();
      return;
    }
    setConfirm({
      title: "Iniciar uma nova gravação?",
      description: `O áudio atual${moments.length ? ` e ${pluralize(moments.length, "marcação", "marcações")}` : ""} serão descartados. ${
        project.hasUnsavedChanges
          ? "Há alterações que ainda não foram exportadas."
          : ""
      }`,
      confirmLabel: "Descartar e gravar",
      destructive: true,
      onConfirm: begin,
    });
  }, [
    clearContent,
    hasContent,
    moments.length,
    player,
    project.hasUnsavedChanges,
    recorder,
  ]);

  const discardRecording = useCallback(() => {
    setConfirm({
      title: recorder.isActive
        ? "Descartar a gravação em andamento?"
        : "Descartar o projeto atual?",
      description: `O áudio${moments.length ? ` e ${pluralize(moments.length, "marcação", "marcações")}` : ""} serão excluídos deste navegador. Esta ação não pode ser desfeita.`,
      confirmLabel: "Descartar",
      destructive: true,
      onConfirm: () => {
        player.pause();
        recorder.reset();
        clearContent();
        // Remove também o projeto salvo neste navegador.
        persistence.clear();
        setEditingIds(new Set());
        setSelectedMomentId(null);
        toast("Projeto descartado");
      },
    });
  }, [clearContent, moments.length, persistence, player, recorder]);

  /* ---------- Marcações ---------- */

  // Libera o temporizador do bloqueio se o componente for desmontado.
  useEffect(
    () => () => {
      if (markLockTimerRef.current !== null)
        window.clearTimeout(markLockTimerRef.current);
    },
    [],
  );

  const markMoment = useCallback(() => {
    if (!canMark || isMarkLocked) return;
    const isRecordingNow = recorder.isActive;
    const time = isRecordingNow
      ? recorder.getElapsedSeconds()
      : player.getCurrentTime();
    // Durante a gravação a duração final ainda é desconhecida; o trecho é ajustado ao finalizar.
    const duration = isRecordingNow
      ? null
      : playbackDuration || audio?.durationSeconds || null;
    const id = addMoment(time, duration);
    // Só registra o instante: não abre o formulário nem move o foco. No celular, focar o
    // campo de nome abria o teclado e rolava a tela, atrapalhando quem está entrevistando.
    // Nome e observação são preenchidos depois, com calma, direto na lista.
    if (!isRecordingNow) setSelectedMomentId(id);

    // Evita marcações duplicadas por cliques repetidos.
    setIsMarkLocked(true);
    markLockTimerRef.current = window.setTimeout(() => {
      markLockTimerRef.current = null;
      setIsMarkLocked(false);
    }, MARK_COOLDOWN_MS);

    toast(`Momento marcado em ${formatTime(time)}`, {
      description: "Dê um nome e uma observação depois, na lista de momentos.",
    });
  }, [
    addMoment,
    audio,
    canMark,
    isMarkLocked,
    playbackDuration,
    player,
    recorder,
  ]);

  const stopEditing = useCallback((id: string) => {
    setEditingIds((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }, []);

  const handleSaveMoment = useCallback(
    (
      moment: ImportantMoment,
      values: Pick<ImportantMoment, "name" | "observation">,
    ) => {
      updateMoment(moment.id, values);
      stopEditing(moment.id);
    },
    [stopEditing, updateMoment],
  );

  const handleCancelMoment = useCallback(
    (moment: ImportantMoment) => {
      stopEditing(moment.id);
      // Uma marcação recém-criada que nunca recebeu nome é descartada ao cancelar.
      if (!moment.name) {
        deleteMoment(moment.id);
        setSelectedMomentId((current) =>
          current === moment.id ? null : current,
        );
      }
    },
    [deleteMoment, stopEditing],
  );

  const handleDeleteMoment = useCallback(
    (moment: ImportantMoment) => {
      setConfirm({
        title: "Excluir marcação?",
        description: `"${moment.name || "Sem nome"}" (trecho ${formatTimePrecise(moment.startSeconds)} → ${formatTimePrecise(moment.endSeconds)}) será removida da lista.`,
        confirmLabel: "Excluir",
        destructive: true,
        onConfirm: () => {
          deleteMoment(moment.id);
          stopEditing(moment.id);
          setSelectedMomentId((current) =>
            current === moment.id ? null : current,
          );
          toast("Marcação excluída");
        },
      });
    },
    [deleteMoment, stopEditing],
  );

  const handleEditMoment = useCallback((moment: ImportantMoment) => {
    setEditingIds((previous) => new Set(previous).add(moment.id));
    setFocusId(moment.id);
  }, []);

  /* ---------- Trechos dos momentos ---------- */

  const handleAdjustMoment = useCallback((moment: ImportantMoment) => {
    setSelectedMomentId(moment.id);
    // Em telas pequenas o player fica acima da lista: leva o usuário até o editor
    // (no desktop ele já está visível na coluna fixa e nada rola).
    requestAnimationFrame(() => {
      const editor = document.getElementById(MOMENT_RANGE_EDITOR_ID);
      if (!editor) return;
      const rect = editor.getBoundingClientRect();
      if (rect.top < 64 || rect.bottom > window.innerHeight) {
        editor.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, []);

  const handleChangeRange = useCallback(
    (moment: ImportantMoment, startSeconds: number, endSeconds: number) => {
      updateMomentRange(
        moment.id,
        startSeconds,
        endSeconds,
        playbackDuration || audio?.durationSeconds || null,
      );
    },
    [audio, playbackDuration, updateMomentRange],
  );

  const handleToggleRange = useCallback(
    (moment: ImportantMoment) =>
      player.toggleRange(moment.startSeconds, moment.endSeconds, moment.id),
    [player],
  );

  const handleDownloadMoment = useCallback(
    async (moment: ImportantMoment) => {
      if (!audio || downloadingId) return;
      setDownloadingId(moment.id);
      try {
        const clip = await exportAudioClip(
          audio.blob,
          moment.startSeconds,
          moment.endSeconds,
        );
        const { base } = getExportFileNames(project);
        const fileName = clipFileName(base, moment.name, moment.startSeconds);
        downloadBlob(clip, fileName);
        toast.success("Trecho baixado", {
          description: `${fileName}. Os trechos são salvos em WAV, pois cortar o formato original exigiria recodificá-lo.`,
        });
      } catch (error) {
        toast.error(
          error instanceof ClipExportError
            ? error.message
            : "Não foi possível baixar o trecho.",
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [audio, downloadingId, project],
  );

  const activeId = useMemo(() => {
    if (!audio || playbackTime <= 0) return null;
    // Destaca o momento cujo trecho contém a posição atual.
    return findMomentAt(moments, playbackTime);
  }, [audio, moments, playbackTime]);

  /* ---------- Importação e exportação ---------- */

  const applyImport = useCallback(
    (preview: ImportPreview) => {
      player.pause();
      recorder.reset();
      loadImported(preview.audio, preview.projectName, preview.moments);
      setEditingIds(new Set());
      setSelectedMomentId(null);
      setIsImportOpen(false);
      toast.success("Projeto importado", {
        description: preview.moments.length
          ? `${pluralize(preview.moments.length, "marcação carregada", "marcações carregadas")}.`
          : "Áudio pronto para reprodução e novas marcações.",
      });
    },
    [loadImported, player, recorder],
  );

  const handleImport = useCallback(
    (preview: ImportPreview) => {
      if (!hasContent) {
        applyImport(preview);
        return;
      }
      setConfirm({
        title: "Substituir o projeto atual?",
        description: project.hasUnsavedChanges
          ? "O projeto aberto tem alterações que ainda não foram exportadas e elas serão perdidas."
          : "O áudio e as marcações abertos serão substituídos pelo projeto importado.",
        confirmLabel: "Substituir",
        destructive: project.hasUnsavedChanges,
        onConfirm: () => applyImport(preview),
      });
    },
    [applyImport, hasContent, project.hasUnsavedChanges],
  );

  /** Abre um áudio (ou .zip) escolhido na área de importação do estado vazio. */
  const importAudioFile = useCallback(
    async (file: File) => {
      setIsImportingAudio(true);
      try {
        const preview = await prepareImport({ highlightFile: file });
        preview.warnings.forEach((warning) => toast.warning(warning));
        if (preview.jsonErrors) {
          toast.warning("Marcações não carregadas", {
            description:
              "O JSON do .zip é inválido. O áudio foi aberto sem marcações.",
          });
        }
        handleImport(preview);
      } catch (error) {
        toast.error("Não foi possível abrir o arquivo", {
          description:
            error instanceof ImportError
              ? error.message
              : "Não foi possível ler o arquivo selecionado.",
        });
      } finally {
        setIsImportingAudio(false);
      }
    },
    [handleImport],
  );

  const handleExport = useCallback(async () => {
    const incomplete = findIncompleteMoments(moments);
    if (incomplete.length > 0) {
      setEditingIds(
        (previous) =>
          new Set([...previous, ...incomplete.map((moment) => moment.id)]),
      );
      setFocusId(incomplete[0].id);
    }
    setIsExporting(true);
    try {
      const result = await createProjectExport(project);
      downloadBlob(result.blob, result.fileName);
      markSaved();
      toast.success(
        result.kind === "zip" ? "Projeto exportado" : "Áudio exportado",
        {
          description:
            result.kind === "zip"
              ? `${result.fileName} com o áudio e ${pluralize(moments.length, "marcação", "marcações")}.`
              : `${result.fileName} (sem marcações, apenas o áudio).`,
        },
      );
      const pendingEdits = moments.filter(
        (moment) => editingIds.has(moment.id) && moment.name,
      );
      if (pendingEdits.length > 0) {
        toast.warning("Há edições não salvas", {
          description:
            "Alterações em formulários abertos não foram incluídas. Salve-as e exporte novamente.",
        });
      }
    } catch (error) {
      toast.error(
        error instanceof ExportError
          ? error.message
          : "Não foi possível exportar o projeto.",
      );
    } finally {
      setIsExporting(false);
    }
  }, [editingIds, markSaved, moments, project]);

  const { audioFileName, zipFileName } = getExportFileNames(project);
  const exportFileName =
    moments.length > 0
      ? zipFileName
      : audio
        ? audioFileName
        : `${zipFileName} ou áudio`;
  const canExport = audio !== null && !isRecorderBusy;
  /** "Modo análise": há um áudio pronto para ouvir, marcar e recortar. */
  const isAnalysisMode = audio !== null;
  const exportHint = !audio
    ? "Grave ou importe um áudio para exportar."
    : isRecorderBusy
      ? "Aguarde o fim da gravação."
      : moments.length > 0
        ? `Baixa ${zipFileName} com o áudio e o JSON das marcações.`
        : `Sem marcações: baixa apenas ${audioFileName}.`;

  const markHint = recorder.isActive
    ? recorder.status === "paused"
      ? "Gravação pausada: a marcação usará o ponto em que a gravação será retomada."
      : "Registra o instante atual da gravação sem interrompê-la."
    : audio
      ? `Marca a posição atual da reprodução (${formatTime(playbackTime)}).`
      : "Inicie uma gravação ou importe um áudio para marcar momentos.";

  /* ---------- Atalho de teclado e barra fixa no celular ---------- */

  const [markButtonRef, isMarkButtonVisible] =
    useIsVisible<HTMLButtonElement>();
  const isModalOpen = confirm !== null || isImportOpen;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "m" || event.repeat) return;
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isModalOpen ||
        isTypingTarget(event.target)
      )
        return;
      event.preventDefault();
      markMoment();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, markMoment]);

  const showFloatingMark = recorder.isActive && !isMarkButtonVisible;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn("flex min-h-dvh flex-col", showFloatingMark && "pb-20")}
      >
        <AppHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          canInstall={pwa.canInstall}
          onInstall={() => void pwa.install()}
          actions={
            <ImportExportControls
              canImport={!isRecorderBusy}
              canExport={canExport}
              isExporting={isExporting}
              exportHint={exportHint}
              onImport={() => setIsImportOpen(true)}
              onExport={() => void handleExport()}
            />
          }
        />

        {/*
          Desktop: duas colunas fixas (sticky) abaixo do cabeçalho. A da esquerda concentra
          gravação/reprodução/editor; a da direita tem altura da viewport e rolagem própria.
          Celular: as colunas são empilhadas e a página rola normalmente.
        */}
        <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 px-4 py-5 sm:gap-6 sm:px-6 lg:grid-cols-12 lg:items-start lg:py-6">
          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20 lg:col-span-7">
            {isAnalysisMode ? (
              <>
                <ProjectSummaryCard
                  projectName={project.name}
                  onProjectNameChange={setName}
                  exportFileName={exportFileName}
                  audioSource={audio.source}
                  durationSeconds={playbackDuration || audio.durationSeconds}
                  persistenceStatus={persistence.status}
                  onNewRecording={startRecording}
                  onDiscard={discardRecording}
                />
                <AudioPlayer
                  player={player}
                  audio={audio}
                  moments={moments}
                  waveform={waveform}
                  selectedMoment={selectedMoment}
                  downloadingId={downloadingId}
                  onSelectMoment={(moment) => setSelectedMomentId(moment.id)}
                  onCloseEditor={() => setSelectedMomentId(null)}
                  onChangeRange={handleChangeRange}
                  onToggleRange={handleToggleRange}
                  onDownloadMoment={(moment) =>
                    void handleDownloadMoment(moment)
                  }
                  markAction={
                    <div className="grid gap-1.5">
                      <MarkMomentButton
                        buttonRef={markButtonRef}
                        className="h-12 w-full"
                        disabled={!canMark}
                        locked={isMarkLocked}
                        onClick={markMoment}
                        showShortcut
                      >
                        Marcar momento importante
                      </MarkMomentButton>
                      <p className="text-center text-xs text-muted-foreground tabular-nums">
                        {markHint}
                      </p>
                    </div>
                  }
                />
              </>
            ) : (
              <AudioRecorder
                recorder={recorder}
                projectName={project.name}
                onProjectNameChange={setName}
                exportFileName={exportFileName}
                hasContent={hasContent}
                isProcessing={isProcessing}
                isImportingAudio={isImportingAudio}
                canMark={canMark}
                isMarkLocked={isMarkLocked}
                markHint={markHint}
                onStart={startRecording}
                onStop={recorder.stop}
                onDiscard={discardRecording}
                onMark={markMoment}
                onImportAudio={(file) => void importAudioFile(file)}
                markButtonRef={markButtonRef}
              />
            )}
          </div>

          <ImportantMomentList
            className="lg:sticky lg:top-20 lg:col-span-5 lg:max-h-[calc(100dvh-7rem)]"
            moments={moments}
            editingIds={editingIds}
            focusId={focusId}
            activeId={activeId}
            selectedId={selectedMomentId}
            playingRangeId={player.playingRangeKey}
            downloadingId={downloadingId}
            hasAudio={audio !== null}
            onToggleRange={handleToggleRange}
            onAdjust={handleAdjustMoment}
            onDownload={(moment) => void handleDownloadMoment(moment)}
            onEdit={handleEditMoment}
            onSave={handleSaveMoment}
            onCancel={handleCancelMoment}
            onDelete={handleDeleteMoment}
          />
        </main>

        <footer className="flex w-full items-center justify-center gap-2 border-t px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <ShieldCheck className="size-4 shrink-0" />
          <p className="max-w-3xl">
            Tudo é processado localmente: nenhum áudio é enviado para
            servidores, e depois do primeiro acesso o app funciona mesmo sem
            internet. Seu projeto atual fica salvo automaticamente neste
            navegador — exporte o .zip para fazer backup ou transferir.
          </p>
        </footer>

        {showFloatingMark && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <MarkMomentButton
              className="mx-auto flex h-12 w-full max-w-md"
              disabled={!canMark}
              locked={isMarkLocked}
              onClick={markMoment}
            >
              Marcar momento · {formatTime(recorder.elapsedSeconds)}
            </MarkMomentButton>
          </div>
        )}
      </div>

      {/* Elemento de áudio único, controlado por useAudioPlayer. */}
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        preload="metadata"
        className="hidden"
      />

      <ImportProjectDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImport={handleImport}
      />
      <ConfirmDialog options={confirm} onClose={() => setConfirm(null)} />
      <Toaster theme={theme} position="top-center" richColors closeButton />
    </TooltipProvider>
  );
}
