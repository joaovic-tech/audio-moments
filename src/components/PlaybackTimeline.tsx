import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Waveform } from '@/components/Waveform'
import { formatTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { WaveformState } from '@/hooks/useWaveform'
import type { ImportantMoment } from '@/types/project'

const KEYBOARD_STEP_SECONDS = 5

interface PlaybackTimelineProps {
  duration: number
  currentTime: number
  waveform: WaveformState
  moments: ImportantMoment[]
  selectedId: string | null
  disabled: boolean
  onSeek: (time: number) => void
  onSelectMoment: (moment: ImportantMoment) => void
}

const percent = (time: number, duration: number) => `${Math.min(100, Math.max(0, (time / duration) * 100))}%`

/** Visão geral do áudio: forma de onda, trechos dos momentos e cursor de reprodução. */
export function PlaybackTimeline({
  duration,
  currentTime,
  waveform,
  moments,
  selectedId,
  disabled,
  onSeek,
  onSelectMoment,
}: PlaybackTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const hasDuration = duration > 0
  const inactive = disabled || !hasDuration

  const timeFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (inactive || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    onSeek(timeFromPointer(event.clientX))
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) onSeek(timeFromPointer(event.clientX))
  }

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (inactive) return
    const keys: Record<string, number> = {
      ArrowLeft: currentTime - KEYBOARD_STEP_SECONDS,
      ArrowDown: currentTime - KEYBOARD_STEP_SECONDS,
      ArrowRight: currentTime + KEYBOARD_STEP_SECONDS,
      ArrowUp: currentTime + KEYBOARD_STEP_SECONDS,
      Home: 0,
      End: duration,
    }
    if (event.key in keys) {
      event.preventDefault()
      onSeek(keys[event.key])
    }
  }

  return (
    <div className="relative pt-4">
      {/* Bandeiras dos momentos: selecionam o trecho para ajuste */}
      {hasDuration && !disabled && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3">
          {moments.map((moment) => (
            <Tooltip key={moment.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'pointer-events-auto absolute top-0 h-3 w-2 -translate-x-1/2 rounded-sm bg-highlight ring-2 ring-card transition-transform hover:scale-125 focus-visible:scale-125 focus-visible:outline-none',
                    moment.id === selectedId && 'scale-125 ring-foreground/60',
                  )}
                  style={{ left: percent(moment.timeSeconds, duration) }}
                  onClick={() => onSelectMoment(moment)}
                  aria-label={`Ajustar trecho de ${moment.name || 'momento sem nome'}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                {formatTime(moment.timeSeconds)} · {moment.name || 'Sem nome'}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      <div
        ref={trackRef}
        role="slider"
        tabIndex={inactive ? -1 : 0}
        aria-label="Posição da reprodução"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
        aria-disabled={inactive || undefined}
        className={cn(
          'relative h-14 touch-none overflow-hidden rounded-lg bg-muted/50 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50',
          inactive ? 'opacity-50' : 'cursor-pointer',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onKeyDown={handleKeyDown}
      >
        {hasDuration && (
          <>
            <Waveform
              data={waveform.status === 'ready' ? waveform.data : null}
              viewStart={0}
              viewEnd={duration}
              playedUntil={currentTime}
              className="absolute inset-0"
            />
            {moments.map((moment) => (
              <div
                key={moment.id}
                className={cn(
                  'pointer-events-none absolute inset-y-0 border-x border-highlight/50 bg-highlight/15',
                  moment.id === selectedId && 'border-x-2 border-highlight bg-highlight/30',
                )}
                style={{
                  left: percent(moment.startSeconds, duration),
                  width: percent(moment.endSeconds - moment.startSeconds, duration),
                }}
              />
            ))}
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
              style={{ left: percent(currentTime, duration) }}
            />
          </>
        )}
        {waveform.status === 'loading' && hasDuration && (
          <span className="absolute right-2 bottom-1 text-[10px] text-muted-foreground">Gerando forma de onda…</span>
        )}
      </div>
    </div>
  )
}
