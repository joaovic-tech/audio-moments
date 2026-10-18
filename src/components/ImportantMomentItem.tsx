import type { ReactNode } from 'react'
import { Download, Loader2, Pause, Pencil, Play, Scissors, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ImportantMomentForm } from '@/components/ImportantMomentForm'
import { rangeLength } from '@/lib/momentRange'
import { formatDurationLabel, formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { ImportantMoment } from '@/types/project'

interface ImportantMomentItemProps {
  moment: ImportantMoment
  index: number
  isEditing: boolean
  isActive: boolean
  isSelected: boolean
  isPlayingRange: boolean
  isDownloading: boolean
  autoFocus: boolean
  /** Há áudio disponível (falso durante a gravação). */
  hasAudio: boolean
  onToggleRange: () => void
  onAdjust: () => void
  onDownload: () => void
  onEdit: () => void
  onSave: (values: Pick<ImportantMoment, 'name' | 'observation'>) => void
  onCancel: () => void
  onDelete: () => void
}

function IconAction({
  label,
  disabledLabel,
  disabled = false,
  className,
  onClick,
  children,
}: {
  label: string
  disabledLabel?: string
  disabled?: boolean
  className?: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
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
      <TooltipContent>{disabled && disabledLabel ? disabledLabel : label}</TooltipContent>
    </Tooltip>
  )
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
  const time = formatTime(moment.timeSeconds)
  const displayName = moment.name || 'Sem nome'
  const afterRecording = 'Disponível após finalizar a gravação'

  return (
    <li
      className={cn(
        'rounded-xl border bg-card p-3 transition-colors',
        isActive && !isEditing && 'border-highlight/60 bg-highlight/5',
        isSelected && !isEditing && 'ring-2 ring-highlight/60',
        isEditing && 'border-ring/60 shadow-sm',
      )}
      aria-current={isActive ? 'true' : undefined}
    >
      {isEditing ? (
        <ImportantMomentForm moment={moment} autoFocus={autoFocus} onSave={onSave} onCancel={onCancel} />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 font-mono tabular-nums"
                    onClick={onToggleRange}
                    disabled={!hasAudio}
                    aria-label={`${isPlayingRange ? 'Pausar' : 'Ouvir'} trecho de ${displayName}`}
                  >
                    {isPlayingRange ? <Pause className="fill-current" /> : <Play className="fill-current" />}
                    {time}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{hasAudio ? 'Ouvir o trecho deste momento' : afterRecording}</TooltipContent>
            </Tooltip>

            <div className="min-w-0 flex-1 pt-1">
              <p className="flex flex-wrap items-center gap-2 text-sm leading-tight font-medium">
                <span className="sr-only">Momento {index + 1}: </span>
                <span className={cn('break-words', !moment.name && 'text-destructive')}>{displayName}</span>
                {!moment.name && (
                  <Badge variant="destructive" className="font-normal">
                    Nome pendente
                  </Badge>
                )}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                <Scissors className="mr-1 inline size-3 align-[-1px]" aria-hidden="true" />
                {formatTime(moment.startSeconds)} → {formatTime(moment.endSeconds)} ·{' '}
                {formatDurationLabel(rangeLength(moment))}
              </p>
              {moment.observation && (
                <p className="mt-1 text-sm break-words whitespace-pre-wrap text-muted-foreground">
                  {moment.observation}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end border-t pt-1 sm:border-0 sm:pt-0">
            <IconAction
              label="Ajustar trecho"
              disabledLabel={afterRecording}
              disabled={!hasAudio}
              className={cn(isSelected && 'bg-highlight/20 text-highlight-strong')}
              onClick={onAdjust}
            >
              <Scissors />
            </IconAction>
            <IconAction
              label={isDownloading ? 'Preparando trecho…' : 'Baixar trecho'}
              disabledLabel={isDownloading ? 'Preparando trecho…' : afterRecording}
              disabled={!hasAudio || isDownloading}
              onClick={onDownload}
            >
              {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
            </IconAction>
            <IconAction label={`Editar ${displayName}`} onClick={onEdit}>
              <Pencil />
            </IconAction>
            <IconAction
              label={`Excluir ${displayName}`}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 />
            </IconAction>
          </div>
        </div>
      )}
    </li>
  )
}
