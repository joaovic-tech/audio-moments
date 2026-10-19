import type { Ref } from 'react'
import { AlertCircle, Headphones, Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MomentRangeEditor } from '@/components/MomentRangeEditor'
import { PlaybackTimeline } from '@/components/PlaybackTimeline'
import { formatBytes, formatLabel } from '@/services/audioService'
import { formatTime } from '@/lib/time'
import type { AudioPlayerControls } from '@/hooks/useAudioPlayer'
import type { WaveformState } from '@/hooks/useWaveform'
import type { ImportantMoment, ProjectAudio } from '@/types/project'

const SKIP_SECONDS = 10

interface AudioPlayerProps {
  player: AudioPlayerControls
  audio: ProjectAudio | null
  moments: ImportantMoment[]
  waveform: WaveformState
  isRecording: boolean
  selectedMoment: ImportantMoment | null
  downloadingId: string | null
  onSelectMoment: (moment: ImportantMoment) => void
  onCloseEditor: () => void
  onChangeRange: (moment: ImportantMoment, startSeconds: number, endSeconds: number) => void
  onToggleRange: (moment: ImportantMoment) => void
  onDownloadMoment: (moment: ImportantMoment) => void
  cardRef?: Ref<HTMLDivElement>
}

function audioDescription(audio: ProjectAudio): string {
  const origin =
    audio.source === 'import' ? `Importado de ${audio.originalFileName ?? 'arquivo'}` : 'Gravado neste dispositivo'
  return `${formatLabel(audio.extension)} · ${formatBytes(audio.blob.size)} · ${origin}`
}

/** Reprodução com forma de onda, trechos dos momentos e editor do trecho selecionado. */
export function AudioPlayer({
  player,
  audio,
  moments,
  waveform,
  isRecording,
  selectedMoment,
  downloadingId,
  onSelectMoment,
  onCloseEditor,
  onChangeRange,
  onToggleRange,
  onDownloadMoment,
  cardRef,
}: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, error } = player
  const disabled = !audio

  return (
    <Card ref={cardRef} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="size-4 text-muted-foreground" />
          Reprodução
        </CardTitle>
        <CardDescription>
          {audio
            ? audioDescription(audio)
            : isRecording
              ? 'A reprodução e o ajuste dos trechos ficam disponíveis ao finalizar a gravação.'
              : 'Nenhum áudio carregado. Grave pelo microfone ou importe um projeto.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <PlaybackTimeline
            duration={duration}
            currentTime={currentTime}
            waveform={waveform}
            moments={moments}
            selectedId={selectedMoment?.id ?? null}
            disabled={disabled}
            onSeek={player.seek}
            onSelectMoment={onSelectMoment}
          />

          <div className="flex items-center justify-between font-mono text-xs text-muted-foreground tabular-nums">
            <span aria-label="Tempo atual">{formatTime(currentTime)}</span>
            <span aria-label="Duração total">{formatTime(duration)}</span>
          </div>
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
                className="w-14 font-mono tabular-nums"
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

        {audio && selectedMoment && duration > 0 && (
          <MomentRangeEditor
            key={selectedMoment.id}
            moment={selectedMoment}
            duration={duration}
            waveform={waveform.status === 'ready' ? waveform.data : null}
            currentTime={currentTime}
            isPlayingRange={player.playingRangeKey === selectedMoment.id}
            isDownloading={downloadingId === selectedMoment.id}
            onChangeRange={(start, end) => onChangeRange(selectedMoment, start, end)}
            onSeek={player.seek}
            onToggleRange={() => onToggleRange(selectedMoment)}
            onDownload={() => onDownloadMoment(selectedMoment)}
            onClose={onCloseEditor}
          />
        )}

        {audio && !selectedMoment && moments.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Selecione um momento (bandeira na linha do tempo ou “Ajustar trecho” na lista) para ajustar seu início e fim.
          </p>
        )}

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
