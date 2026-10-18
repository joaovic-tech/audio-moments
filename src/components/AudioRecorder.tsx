import type { Ref } from 'react'
import { AlertCircle, Bookmark, CheckCircle2, FileAudio, Loader2, Mic, Pause } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Kbd } from '@/components/Kbd'
import { LevelMeter } from '@/components/LevelMeter'
import { RecordingControls } from '@/components/RecordingControls'
import { defaultProjectName } from '@/lib/fileName'
import { formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { AudioRecorderControls } from '@/hooks/useAudioRecorder'
import type { AudioSource } from '@/types/project'

export const PROJECT_NAME_MAX_LENGTH = 100

interface AudioRecorderProps {
  recorder: AudioRecorderControls
  projectName: string
  onProjectNameChange: (name: string) => void
  exportFileName: string
  audioSource: AudioSource | null
  audioDuration: number | null
  hasContent: boolean
  isProcessing: boolean
  canMark: boolean
  markHint: string
  onStart: () => void
  onStop: () => void
  onDiscard: () => void
  onMark: () => void
  markButtonRef?: Ref<HTMLButtonElement>
}

function StatusBadge({
  status,
  isProcessing,
  audioSource,
}: {
  status: AudioRecorderControls['status']
  isProcessing: boolean
  audioSource: AudioSource | null
}) {
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
  if (audioSource === 'recording') {
    return (
      <Badge variant="secondary" className="h-6 px-2.5">
        <CheckCircle2 />
        Gravação finalizada
      </Badge>
    )
  }
  if (audioSource === 'import') {
    return (
      <Badge variant="secondary" className="h-6 px-2.5">
        <FileAudio />
        Áudio importado
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

/** Painel principal: nome do projeto, estado, cronômetro, controles e botão de marcação. */
export function AudioRecorder({
  recorder,
  projectName,
  onProjectNameChange,
  exportFileName,
  audioSource,
  audioDuration,
  hasContent,
  isProcessing,
  canMark,
  markHint,
  onStart,
  onStop,
  onDiscard,
  onMark,
  markButtonRef,
}: AudioRecorderProps) {
  const { status, error, elapsedSeconds, isActive } = recorder
  const timerValue = isActive || audioDuration === null ? elapsedSeconds : audioDuration

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-2">
          <Label htmlFor="project-name">Nome da gravação</Label>
          <Input
            id="project-name"
            value={projectName}
            maxLength={PROJECT_NAME_MAX_LENGTH}
            placeholder={defaultProjectName()}
            onChange={(event) => onProjectNameChange(event.target.value)}
            aria-describedby="project-name-hint"
            autoComplete="off"
            className="h-10"
          />
          <p id="project-name-hint" className="text-xs text-muted-foreground">
            Usado na exportação: <span className="font-mono text-foreground/80">{exportFileName}</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 px-4 py-6">
          <StatusBadge status={status} isProcessing={isProcessing} audioSource={audioSource} />
          <p
            className={cn(
              'font-mono text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl',
              status === 'paused' && 'text-muted-foreground',
            )}
            role="timer"
            aria-live="off"
            aria-label={`Duração ${formatTime(timerValue)}`}
          >
            {formatTime(timerValue)}
          </p>
          <LevelMeter getLevel={recorder.getLevel} active={isActive} paused={status === 'paused'} />
          <RecordingControls
            status={status}
            hasAudio={audioSource !== null}
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

        <div className="grid gap-2">
          <Button
            ref={markButtonRef}
            size="lg"
            className="h-14 w-full rounded-xl bg-highlight text-base font-semibold text-highlight-foreground shadow-sm hover:bg-highlight/90"
            disabled={!canMark}
            onClick={onMark}
            aria-keyshortcuts="M"
          >
            <Bookmark className="size-5" />
            Marcar momento importante
            <Kbd className="ml-1 hidden sm:inline-flex">M</Kbd>
          </Button>
          <p className="text-center text-xs text-muted-foreground" aria-live="polite">
            {markHint}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
