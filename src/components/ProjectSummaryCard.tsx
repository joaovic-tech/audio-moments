import { AlertTriangle, CheckCircle2, FileAudio, HardDrive, Loader2, Mic, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ProjectNameField } from '@/components/ProjectNameField'
import { formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { PersistenceStatus } from '@/hooks/useProjectPersistence'
import type { AudioSource } from '@/types/project'

interface ProjectSummaryCardProps {
  projectName: string
  onProjectNameChange: (name: string) => void
  exportFileName: string
  audioSource: AudioSource
  durationSeconds: number | null
  persistenceStatus: PersistenceStatus
  onNewRecording: () => void
  onDiscard: () => void
}

function SaveIndicator({ status }: { status: PersistenceStatus }) {
  const content = {
    saving: {
      icon: <Loader2 className="animate-spin" />,
      label: 'Salvando…',
      hint: 'Salvando o projeto neste navegador.',
    },
    saved: {
      icon: <HardDrive />,
      label: 'Salvo neste navegador',
      hint: 'O projeto é salvo automaticamente e reaberto quando você voltar. Exporte o .zip para backup.',
    },
    error: {
      icon: <AlertTriangle />,
      label: 'Não salvo',
      hint: 'Não foi possível salvar automaticamente. Exporte o .zip para não perder o trabalho.',
    },
    unavailable: {
      icon: <AlertTriangle />,
      label: 'Sem salvamento automático',
      hint: 'Este navegador não permite salvar o projeto. Exporte o .zip para guardá-lo.',
    },
  } as const
  if (status === 'idle' || status === 'restoring') return null
  const { icon, label, hint } = content[status]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5',
            (status === 'error' || status === 'unavailable') && 'text-destructive',
          )}
          tabIndex={0}
          role="status"
        >
          {icon}
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{hint}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Cabeçalho compacto do projeto ("modo análise"): substitui o gravador quando já há um áudio,
 * liberando espaço para o player e o editor de trechos.
 */
export function ProjectSummaryCard({
  projectName,
  onProjectNameChange,
  exportFileName,
  audioSource,
  durationSeconds,
  persistenceStatus,
  onNewRecording,
  onDiscard,
}: ProjectSummaryCardProps) {
  return (
    <Card size="sm" className="animate-in duration-300 fade-in">
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <ProjectNameField
            compact
            className="flex-1"
            value={projectName}
            onChange={onProjectNameChange}
            exportFileName={exportFileName}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 flex-1 sm:flex-none" onClick={onNewRecording}>
              <Mic />
              Nova gravação
            </Button>
            <Button
              variant="ghost"
              className="h-9 flex-1 text-muted-foreground light:text-slate-700 hover:bg-destructive/10 hover:text-destructive sm:flex-none"
              onClick={onDiscard}
            >
              <Trash2 />
              Descartar
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <Badge variant="secondary" className="h-6 px-2.5">
            {audioSource === 'import' ? <FileAudio /> : <CheckCircle2 />}
            {audioSource === 'import' ? 'Áudio importado' : 'Gravação finalizada'}
            {durationSeconds !== null && (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  •
                </span>
                <span className="font-mono tabular-nums">{formatTime(durationSeconds)}</span>
              </>
            )}
          </Badge>
          <span className="min-w-0 truncate text-xs text-muted-foreground" title={exportFileName}>
            Exporta como <span className="font-mono text-foreground/80">{exportFileName}</span>
          </span>
          <span className="ml-auto">
            <SaveIndicator status={persistenceStatus} />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
