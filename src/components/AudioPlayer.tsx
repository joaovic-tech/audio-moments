import { AlertCircle, Headphones, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatBytes, formatLabel } from '@/services/audioService'
import { formatTime } from '@/lib/time'
import type { AudioPlayerControls } from '@/hooks/useAudioPlayer'
import type { ImportantMoment, ProjectAudio } from '@/types/project'

const SKIP_SECONDS = 10

interface AudioPlayerProps {
  player: AudioPlayerControls
  audio: ProjectAudio | null
  moments: ImportantMoment[]
  isRecording: boolean
}

function audioDescription(audio: ProjectAudio): string {
  const origin =
    audio.source === 'import' ? `Importado de ${audio.originalFileName ?? 'arquivo'}` : 'Gravado neste dispositivo'
  return `${formatLabel(audio.extension)} · ${formatBytes(audio.blob.size)} · ${origin}`
}

/** Controles de reprodução com linha do tempo navegável e marcadores dos momentos. */
export function AudioPlayer({ player, audio, moments, isRecording }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, error } = player
  const disabled = !audio
  const progressMax = duration > 0 ? duration : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="size-4 text-muted-foreground" />
          Reprodução
        </CardTitle>
        <CardDescription>
          {audio
            ? audioDescription(audio)
            : isRecording
              ? 'A reprodução fica disponível ao finalizar a gravação.'
              : 'Nenhum áudio carregado. Grave pelo microfone ou importe um projeto.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative pt-4">
          {/* Marcadores dos momentos sobre a linha do tempo */}
          {audio && duration > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-3">
              {moments.map((moment) => (
                <Tooltip key={moment.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="pointer-events-auto absolute top-0 h-3 w-2 -translate-x-1/2 rounded-sm bg-highlight ring-2 ring-card transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-none"
                      style={{ left: `${Math.min(100, (moment.timeSeconds / duration) * 100)}%` }}
                      onClick={() => player.playFrom(moment.timeSeconds)}
                      aria-label={`Ir para ${moment.name || 'momento sem nome'} em ${formatTime(moment.timeSeconds)}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatTime(moment.timeSeconds)} · {moment.name || 'Sem nome'}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
          <Slider
            value={[Math.min(currentTime, progressMax)]}
            min={0}
            max={progressMax}
            step={0.1}
            disabled={disabled || duration <= 0}
            onValueChange={([value]) => player.seek(value)}
            aria-label="Posição da reprodução"
            className="py-2"
          />
        </div>

        <div className="flex items-center justify-between font-mono text-xs text-muted-foreground tabular-nums">
          <span aria-label="Tempo atual">{formatTime(currentTime)}</span>
          <span aria-label="Duração total">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                disabled={disabled}
                onClick={() => player.skip(-SKIP_SECONDS)}
                aria-label={`Voltar ${SKIP_SECONDS} segundos`}
              >
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voltar {SKIP_SECONDS} s</TooltipContent>
          </Tooltip>

          <Button
            size="icon-lg"
            className="size-14 rounded-full"
            disabled={disabled}
            onClick={player.toggle}
            aria-label={isPlaying ? 'Pausar reprodução' : 'Reproduzir'}
          >
            {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="ml-0.5 size-6 fill-current" />}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                disabled={disabled}
                onClick={() => player.skip(SKIP_SECONDS)}
                aria-label={`Avançar ${SKIP_SECONDS} segundos`}
              >
                <RotateCw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Avançar {SKIP_SECONDS} s</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 w-14 font-mono tabular-nums"
                disabled={disabled}
                onClick={player.cycleRate}
                aria-label={`Velocidade de reprodução: ${player.playbackRate}x`}
              >
                {player.playbackRate}x
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alterar velocidade</TooltipContent>
          </Tooltip>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
