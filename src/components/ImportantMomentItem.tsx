import type { ReactNode } from "react";
import {
  Download,
  Loader2,
  MessageSquarePlus,
  Pause,
  Pencil,
  Play,
  Scissors,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ImportantMomentForm,
  MOMENT_NAME_MAX_LENGTH,
  MOMENT_OBSERVATION_MAX_LENGTH,
} from "@/components/ImportantMomentForm";
import { InlineEditableText } from "@/components/InlineEditableText";
import { rangeLength } from "@/lib/momentRange";
import { formatDurationLabel, formatTime, formatTimePrecise } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { ImportantMoment } from "@/types/project";

interface ImportantMomentItemProps {
  moment: ImportantMoment;
  index: number;
  isEditing: boolean;
  isActive: boolean;
  isSelected: boolean;
  isPlayingRange: boolean;
  isDownloading: boolean;
  autoFocus: boolean;
  /** Há áudio disponível (falso durante a gravação). */
  hasAudio: boolean;
  onToggleRange: () => void;
  onAdjust: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onSave: (values: Pick<ImportantMoment, "name" | "observation">) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function IconAction({
  label,
  disabledLabel,
  disabled = false,
  className,
  onClick,
  children,
}: {
  label: string;
  disabledLabel?: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const tooltip = disabled && disabledLabel ? disabledLabel : label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* O span mantém o tooltip (e o title) funcionando com o botão desabilitado. */}
        <span className="inline-flex" title={tooltip}>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function ImportantMomentItem({
  moment,
  index,
  isEditing,
  isActive,
  isSelected,
  isPlayingRange,
  isDownloading,
  autoFocus,
  hasAudio,
  onToggleRange,
  onAdjust,
  onDownload,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: ImportantMomentItemProps) {
  // O botão toca o trecho: mostra onde ele começa (acompanha os ajustes).
  const time = formatTime(moment.startSeconds);
  const displayName = moment.name || "Sem nome";
  const afterRecording = "Disponível após finalizar a gravação";

  return (
    <li
      className={cn(
        "group/item rounded-xl border bg-card p-3 transition-colors",
        // Modo claro: card interno em #f8fafc com borda slate-300, destacado do painel branco.
        "light:border-slate-300 light:bg-slate-50 light:hover:border-slate-400 light:hover:bg-white",
        isActive &&
          !isEditing &&
          "border-highlight/60 bg-highlight/5 light:border-accent-line/60 light:bg-lime-50/60 light:hover:bg-lime-50",
        // Selecionado (trecho em edição): borda 1,5 px verde-lima escuro + fundo lime-50.
        isSelected &&
          !isEditing &&
          "ring-2 ring-highlight/60 ring-inset light:border-accent-line light:bg-lime-50 light:ring-[0.5px] light:ring-accent-line light:hover:bg-lime-50",
        isEditing && "border-ring/60 shadow-sm",
      )}
      aria-current={isActive ? "true" : undefined}
    >
      {isEditing ? (
        <ImportantMomentForm
          moment={moment}
          autoFocus={autoFocus}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        // Layout por container query: no painel estreito do desktop as ações ficam na linha do
        // título e os detalhes ocupam a largura toda abaixo; em cartões muito estreitos
        // (celular) as ações descem para uma barra própria.
        <div className="@container">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1.5 @sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 font-mono tabular-nums"
                    onClick={onToggleRange}
                    disabled={!hasAudio}
                    aria-label={`${isPlayingRange ? "Pausar" : "Ouvir"} trecho de ${displayName}`}
                  >
                    {isPlayingRange ? (
                      <Pause className="fill-current" />
                    ) : (
                      <Play className="fill-current" />
                    )}
                    {time}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {hasAudio
                  ? `Ouvir o trecho a partir de ${formatTimePrecise(moment.startSeconds)} (marcado em ${formatTime(moment.timeSeconds)})`
                  : afterRecording}
              </TooltipContent>
            </Tooltip>

            <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1.5 text-sm leading-tight font-medium">
              <span className="sr-only">Momento {index + 1}: </span>
              {/* Edição rápida: clique no título para renomear. */}
              <InlineEditableText
                value={moment.name}
                label="Nome do momento"
                required
                maxLength={MOMENT_NAME_MAX_LENGTH}
                placeholder="Ex.: Definição do orçamento"
                onCommit={(name) =>
                  onSave({ name, observation: moment.observation })
                }
                className={cn(
                  "min-w-0 wrap-break-word",
                  !moment.name && "text-destructive",
                )}
              >
                {displayName}
              </InlineEditableText>
              {!moment.name && (
                <Badge variant="destructive" className="font-normal">
                  Nome pendente
                </Badge>
              )}
            </div>

            <div className="col-span-2 flex min-w-0 flex-col gap-1 @sm:col-span-2 @sm:col-start-2 @sm:row-start-2">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                <Scissors className="size-3 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">
                  {formatTimePrecise(moment.startSeconds)} →{" "}
                  {formatTimePrecise(moment.endSeconds)}
                </span>
                <span className="whitespace-nowrap">
                  · {formatDurationLabel(rangeLength(moment))}
                </span>
                {/* Sem observação: atalho discreto para adicioná-la. */}
                {!moment.observation && (
                  <InlineEditableText
                    value=""
                    label="Observação"
                    multiline
                    maxLength={MOMENT_OBSERVATION_MAX_LENGTH}
                    placeholder="Detalhes sobre este momento"
                    onCommit={(observation) =>
                      onSave({ name: moment.name, observation })
                    }
                    className="ml-0.5 inline-flex size-5 items-center justify-center text-muted-foreground/80 hover:text-foreground [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/item:opacity-100 [@media(hover:hover)]:group-hover/item:opacity-100"
                    editingClassName="basis-full pt-1 font-sans"
                  >
                    {/* Ícone compacto: cabe na linha do trecho sem criar uma linha a mais. */}
                    <MessageSquarePlus
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  </InlineEditableText>
                )}
              </div>
              {/* Edição rápida: clique na observação para alterá-la. */}
              {moment.observation && (
                <InlineEditableText
                  value={moment.observation}
                  label="Observação"
                  multiline
                  maxLength={MOMENT_OBSERVATION_MAX_LENGTH}
                  placeholder="Detalhes sobre este momento"
                  onCommit={(observation) =>
                    onSave({ name: moment.name, observation })
                  }
                  className="text-sm wrap-break-word whitespace-pre-wrap text-muted-foreground light:text-slate-600"
                >
                  {moment.observation}
                </InlineEditableText>
              )}
            </div>

            <div className="col-span-2 flex items-center justify-end border-t pt-1 @sm:col-span-1 @sm:col-start-3 @sm:row-start-1 @sm:border-0 @sm:pt-0">
              <IconAction
                label="Recortar trecho (ajustar início e fim)"
                disabledLabel={afterRecording}
                disabled={!hasAudio}
                className={cn(
                  isSelected &&
                    "bg-highlight/20 text-highlight-strong light:bg-accent-line light:text-white light:hover:bg-accent-line/90 light:hover:text-white",
                )}
                onClick={onAdjust}
              >
                <Scissors />
              </IconAction>
              <IconAction
                label={
                  isDownloading ? "Preparando trecho…" : "Baixar trecho (WAV)"
                }
                disabledLabel={
                  isDownloading ? "Preparando trecho…" : afterRecording
                }
                disabled={!hasAudio || isDownloading}
                onClick={onDownload}
              >
                {isDownloading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
              </IconAction>
              <IconAction
                label={`Editar nome e observação de ${displayName}`}
                onClick={onEdit}
              >
                <Pencil />
              </IconAction>
              {/* Separador: afasta a ação destrutiva das demais e evita cliques acidentais. */}
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
              <IconAction
                label={`Excluir ${displayName}`}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive dark:hover:bg-destructive/15"
                onClick={onDelete}
              >
                <Trash2 />
              </IconAction>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
