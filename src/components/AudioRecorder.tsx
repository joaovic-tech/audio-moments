import type { Ref } from 'react'
import { AlertCircle, Loader2, Mic, Pause } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AudioDropZone } from '@/components/AudioDropZone'
import { LevelMeter } from '@/components/LevelMeter'
import { MarkMomentButton } from '@/components/MarkMomentButton'
import { ProjectNameField } from '@/components/ProjectNameField'
import { RecordingControls } from '@/components/RecordingControls'
import { formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { AudioRecorderControls } from '@/hooks/useAudioRecorder'

interface AudioRecorderProps {
  recorder: AudioRecorderControls
  projectName: string
  onProjectNameChange: (name: string) => void
  exportFileName: string
  hasContent: boolean
  isProcessing: boolean
  isImportingAudio: boolean
  canMark: boolean
  isMarkLocked: boolean
  markHint: string
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
  onMark: () => void
  onImportAudio: (file: File) => void
  markButtonRef?: Ref<HTMLButtonElement>
}

function StatusBadge({ status, isProcessing }: { status: AudioRecorderControls['status']; isProcessing: boolean }) {
  if (status === 'recording') {
    return (
      <Badge className="h-6 gap-1.5 bg-recording/10 px-2.5 text-recording">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-recording opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-recording" />
        </span>
        Gravando
      </Badge>
    )
  }
  if (status === 'paused') {
    return (
      <Badge variant="secondary" className="h-6 px-2.5">
        <Pause />
        Pausado
      </Badge>
    )
  }
  if (status === 'requesting' || isProcessing) {
    return (
      <Badge variant="secondary" className="h-6 px-2.5">
        <Loader2 className="animate-spin" />
        {isProcessing ? 'Processando' : 'Aguardando permissão'}
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge variant="destructive" className="h-6 px-2.5">
        <AlertCircle />
        Erro
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="h-6 px-2.5">
      <Mic />
      Pronto para gravar
    </Badge>
  )
}

/**
 * Gravador, exibido enquanto não há áudio carregado ("modo gravação/vazio"):
 * nome, cronômetro, controles, importação de áudio e o botão de marcação durante a gravação.
 * Com um áudio carregado, a aplicação mostra o `ProjectSummaryCard` compacto no lugar.
 */
export function AudioRecorder({
  recorder,
  projectName,
  onProjectNameChange,
  exportFileName,
  hasContent,
  isProcessing,
  isImportingAudio,
  canMark,
  isMarkLocked,
  markHint,
  onStart,
  onStop,
  onDiscard,
  onMark,
  onImportAudio,
  markButtonRef,
}: AudioRecorderProps) {
  const { status, error, elapsedSeconds, isActive } = recorder
  const isIdle = !isActive && status !== 'requesting' && !isProcessing

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <ProjectNameField value={projectName} onChange={onProjectNameChange} exportFileName={exportFileName} />

        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 px-4 py-6 light:border-slate-300 light:bg-slate-50">
          <StatusBadge status={status} isProcessing={isProcessing} />
          <p
            className={cn(
              'font-mono text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl',
              status !== 'recording' && 'text-muted-foreground',
              // Modo claro: cronômetro em grafite (só a pausa fica esmaecida).
              status !== 'paused' && 'light:text-foreground',
            )}
            role="timer"
            aria-live="off"
            aria-label={`Duração ${formatTime(elapsedSeconds)}`}
          >
            {formatTime(elapsedSeconds)}
          </p>
          <LevelMeter getLevel={recorder.getLevel} active={isActive} paused={status === 'paused'} />
          <RecordingControls
            status={status}
            hasAudio={false}
            hasContent={hasContent}
            isProcessing={isProcessing}
            onStart={onStart}
            onPause={recorder.pause}
            onResume={recorder.resume}
            onStop={onStop}
            onDiscard={onDiscard}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Não foi possível gravar</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {isIdle && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
            <AudioDropZone busy={isImportingAudio} onFile={onImportAudio} />
          </>
        )}

        {isActive && (
          <div className="grid gap-2">
            <MarkMomentButton
              buttonRef={markButtonRef}
              className="h-14 w-full"
              disabled={!canMark}
              locked={isMarkLocked}
              onClick={onMark}
              showShortcut
            >
              Marcar momento importante
            </MarkMomentButton>
            <p className="text-center text-xs text-muted-foreground" aria-live="polite">
              {markHint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
