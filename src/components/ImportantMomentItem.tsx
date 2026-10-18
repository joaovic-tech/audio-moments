import { Pencil, Play, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ImportantMomentForm } from '@/components/ImportantMomentForm'
import { formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { ImportantMoment } from '@/types/project'

interface ImportantMomentItemProps {
  moment: ImportantMoment
  index: number
  isEditing: boolean
  isActive: boolean
  autoFocus: boolean
  canPlay: boolean
  onPlay: () => void
  onEdit: () => void
  onSave: (values: Pick<ImportantMoment, 'name' | 'observation'>) => void
  onCancel: () => void
  onDelete: () => void
}

export function ImportantMomentItem({
  moment,
  index,
  isEditing,
  isActive,
  autoFocus,
  canPlay,
  onPlay,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: ImportantMomentItemProps) {
  const time = formatTime(moment.timeSeconds)
  const displayName = moment.name || 'Sem nome'

  return (
    <li
      className={cn(
        'rounded-xl border bg-card p-3 transition-colors',
        isActive && !isEditing && 'border-highlight/60 bg-highlight/5',
        isEditing && 'border-ring/60 shadow-sm',
      )}
      aria-current={isActive ? 'true' : undefined}
    >
      {isEditing ? (
        <ImportantMomentForm moment={moment} autoFocus={autoFocus} onSave={onSave} onCancel={onCancel} />
      ) : (
        <div className="flex items-start gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 shrink-0 gap-1.5 font-mono tabular-nums"
                onClick={onPlay}
                disabled={!canPlay}
                aria-label={`Reproduzir a partir de ${time}: ${displayName}`}
              >
                <Play className="fill-current" />
                {time}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canPlay ? 'Ouvir a partir deste instante' : 'Disponível após finalizar a gravação'}
            </TooltipContent>
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
            {moment.observation && (
              <p className="mt-1 text-sm break-words whitespace-pre-wrap text-muted-foreground">
                {moment.observation}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Editar ${displayName}`}>
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={onDelete}
                  aria-label={`Excluir ${displayName}`}
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </li>
  )
}
