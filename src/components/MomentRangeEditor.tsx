import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ArrowLeftToLine, ArrowRightToLine, Download, Loader2, Pause, Play, Scissors, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Waveform } from '@/components/Waveform'
import { computeView, MIN_RANGE_SECONDS, rangeLength, type TimeRange, type TimeWindow } from '@/lib/momentRange'
import { formatDurationLabel, formatTime, formatTimePrecise } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { WaveformData } from '@/services/waveformService'
import type { ImportantMoment } from '@/types/project'

const FINE_STEP_SECONDS = 0.1
const COARSE_STEP_SECONDS = 1

type Handle = 'start' | 'end'

interface MomentRangeEditorProps {
  moment: ImportantMoment
  duration: number
  waveform: WaveformData | null
  currentTime: number
  isPlayingRange: boolean
  isDownloading: boolean
  onChangeRange: (startSeconds: number, endSeconds: number) => void
  onSeek: (time: number) => void
  onToggleRange: () => void
  onDownload: () => void
  onClose: () => void
}

/**
 * Editor do trecho de um momento, no estilo de editores de áudio: forma de onda ampliada
 * e alças arrastáveis para o início e o fim (também ajustáveis pelo teclado).
 */
export function MomentRangeEditor({
  moment,
  duration,
  waveform,
  currentTime,
  isPlayingRange,
  isDownloading,
  onChangeRange,
  onSeek,
  onToggleRange,
  onDownload,
  onClose,
}: MomentRangeEditorProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<TimeWindow>(() => computeView(moment, duration))
  const [dragging, setDragging] = useState<Handle | null>(null)
  const lastRangeRef = useRef<TimeRange>(moment)

  const { startSeconds, endSeconds } = moment
  const span = view.end - view.start
  const toPercent = (time: number) => `${Math.min(100, Math.max(0, ((time - view.start) / span) * 100))}%`

  const timeFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return view.start
    return view.start + Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * span
  }

  /** Aplica um novo trecho e reenquadra a janela se ele sair da área visível. */
  const applyRange = (range: TimeRange, refit: boolean) => {
    lastRangeRef.current = range
    onChangeRange(range.startSeconds, range.endSeconds)
    if (refit && (range.startSeconds < view.start || range.endSeconds > view.end)) {
      setView(computeView(range, duration))
    }
  }

  const moveHandle = (handle: Handle, rawTime: number, refit: boolean) => {
    // Ajuste em passos de 0,1 s: mantém os valores exibidos coerentes em toda a interface.
    const time = Math.round(rawTime * 10) / 10
    const range =
      handle === 'start'
        ? { startSeconds: Math.max(0, Math.min(time, endSeconds - MIN_RANGE_SECONDS)), endSeconds }
        : { startSeconds, endSeconds: Math.min(duration, Math.max(time, startSeconds + MIN_RANGE_SECONDS)) }
    applyRange(range, refit)
  }

  const handlePointerDown = (handle: Handle) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    lastRangeRef.current = moment
    setDragging(handle)
  }

  const handlePointerMove = (handle: Handle) => (event: PointerEvent<HTMLDivElement>) => {
    if (dragging !== handle) return
    moveHandle(handle, timeFromPointer(event.clientX), false)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!dragging) return
    setDragging(null)
    // Reenquadra ao soltar, para permitir continuar arrastando além da janela atual.
    setView(computeView(lastRangeRef.current, duration))
  }

  const handleKeyDown = (handle: Handle) => (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? COARSE_STEP_SECONDS : FINE_STEP_SECONDS
    const current = handle === 'start' ? startSeconds : endSeconds
    const targets: Record<string, number> = {
      ArrowLeft: current - step,
      ArrowDown: current - step,
      ArrowRight: current + step,
      ArrowUp: current + step,
      Home: handle === 'start' ? 0 : startSeconds + MIN_RANGE_SECONDS,
      End: handle === 'start' ? endSeconds - MIN_RANGE_SECONDS : duration,
    }
    if (!(event.key in targets)) return
    event.preventDefault()
    moveHandle(handle, targets[event.key], true)
  }

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    onSeek(timeFromPointer(event.clientX))
  }

  const canSetStart = currentTime < endSeconds - MIN_RANGE_SECONDS
  const canSetEnd = currentTime > startSeconds + MIN_RANGE_SECONDS && currentTime <= duration
  const momentName = moment.name || 'momento sem nome'

  const handleClassName =
    'absolute inset-y-0 z-10 flex w-3 cursor-ew-resize touch-none items-center justify-center bg-highlight outline-none select-none after:absolute after:-inset-x-3 after:inset-y-0 focus-visible:ring-3 focus-visible:ring-ring/60'

  const renderHandle = (handle: Handle) => {
    const isStart = handle === 'start'
    const time = isStart ? startSeconds : endSeconds
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-label={isStart ? 'Início do trecho' : 'Fim do trecho'}
        aria-valuemin={isStart ? 0 : startSeconds + MIN_RANGE_SECONDS}
        aria-valuemax={isStart ? endSeconds - MIN_RANGE_SECONDS : duration}
        aria-valuenow={Number(time.toFixed(1))}
        aria-valuetext={formatTimePrecise(time)}
        className={cn(
          handleClassName,
          isStart ? 'rounded-l-md' : 'rounded-r-md -translate-x-full',
          dragging === handle && 'bg-highlight-strong',
        )}
        style={{ left: toPercent(time) }}
        onPointerDown={handlePointerDown(handle)}
        onPointerMove={handlePointerMove(handle)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown(handle)}
      >
        <span className="flex gap-0.5" aria-hidden="true">
          <span className="h-4 w-px rounded-full bg-highlight-foreground/60" />
          <span className="h-4 w-px rounded-full bg-highlight-foreground/60" />
        </span>
      </div>
    )
  }

  return (
    <section className="grid gap-3 rounded-xl border bg-muted/20 p-3" aria-label={`Ajustar trecho de ${momentName}`}>
      <div className="flex items-center gap-2">
        <Scissors className="size-4 shrink-0 text-highlight-strong" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          Trecho de <span className="text-highlight-strong">{momentName}</span>
        </p>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar ajuste do trecho">
          <X />
        </Button>
      </div>

      <div>
        <div
          ref={trackRef}
          className="relative h-20 cursor-pointer touch-none overflow-hidden rounded-lg bg-background select-none"
          onPointerDown={handleTrackPointerDown}
        >
          <Waveform
            data={waveform}
            viewStart={view.start}
            viewEnd={view.end}
            playedUntil={currentTime}
            className="absolute inset-0"
          />
          {/* Áreas fora do trecho escurecidas */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-background/70"
            style={{ width: toPercent(startSeconds) }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 bg-background/70"
            style={{ left: toPercent(endSeconds) }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 border-y-2 border-highlight bg-highlight/10"
            style={{ left: toPercent(startSeconds), right: `calc(100% - ${toPercent(endSeconds)})` }}
          />
          {currentTime >= view.start && currentTime <= view.end && (
            <div
              className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 bg-foreground"
              style={{ left: toPercent(currentTime) }}
            />
          )}
          {renderHandle('start')}
          {renderHandle('end')}
        </div>
        <div className="mt-1 flex justify-between gap-3 font-mono text-[11px] text-muted-foreground tabular-nums">
          <span>{formatTime(view.start)}</span>
          <span className="hidden truncate font-sans md:inline">Arraste as alças ou use as setas (Shift = 1 s)</span>
          <span>{formatTime(view.end)}</span>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Início', formatTimePrecise(startSeconds)],
          ['Fim', formatTimePrecise(endSeconds)],
          ['Duração', formatDurationLabel(rangeLength(moment))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-background px-2 py-1.5">
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="font-mono text-xs font-medium tabular-nums sm:text-sm">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                disabled={!canSetStart}
                onClick={() => moveHandle('start', currentTime, true)}
              >
                <ArrowLeftToLine />
                Início aqui
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Usar a posição atual ({formatTimePrecise(currentTime)}) como início</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                disabled={!canSetEnd}
                onClick={() => moveHandle('end', currentTime, true)}
              >
                <ArrowRightToLine />
                Fim aqui
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Usar a posição atual ({formatTimePrecise(currentTime)}) como fim</TooltipContent>
        </Tooltip>

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={onToggleRange}>
            {isPlayingRange ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            {isPlayingRange ? 'Pausar' : 'Ouvir trecho'}
          </Button>
          <Button size="sm" onClick={onDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
            Baixar trecho
          </Button>
        </div>
      </div>
    </section>
  )
}
