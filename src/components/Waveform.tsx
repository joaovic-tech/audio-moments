import { useEffect, useRef, useState } from 'react'
import type { WaveformData } from '@/services/waveformService'
import { cn } from '@/lib/utils'

interface WaveformProps {
  data: WaveformData | null
  /** Janela de tempo exibida, em segundos. */
  viewStart: number
  viewEnd: number
  /** Até onde a forma de onda é pintada como "já tocada". */
  playedUntil?: number
  className?: string
}

const BAR_WIDTH = 2
const BAR_GAP = 1

function cssColor(element: Element, variable: string, fallback: string) {
  const value = getComputedStyle(element).getPropertyValue(variable).trim()
  return value || fallback
}

/** Desenha a forma de onda de uma janela do áudio em um canvas. */
export function Waveform({ data, viewStart, viewEnd, playedUntil = -1, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.round(width), height: Math.round(height) })
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || size.width === 0) return

    const ratio = window.devicePixelRatio || 1
    canvas.width = size.width * ratio
    canvas.height = size.height * ratio
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, size.width, size.height)

    const span = viewEnd - viewStart
    if (span <= 0) return

    const base = cssColor(canvas, '--waveform', 'rgba(128,128,128,0.45)')
    const played = cssColor(canvas, '--waveform-played', 'rgba(128,128,128,0.9)')
    const middle = size.height / 2
    const step = BAR_WIDTH + BAR_GAP
    const barCount = Math.floor(size.width / step)

    for (let bar = 0; bar < barCount; bar++) {
      const x = bar * step
      const fromTime = viewStart + (x / size.width) * span
      const toTime = viewStart + ((x + step) / size.width) * span

      let amplitude = 0
      if (data) {
        const from = Math.max(0, Math.floor(fromTime * data.peaksPerSecond))
        const to = Math.min(data.peaks.length, Math.max(from + 1, Math.ceil(toTime * data.peaksPerSecond)))
        for (let i = from; i < to; i++) if (data.peaks[i] > amplitude) amplitude = data.peaks[i]
      }

      const height = Math.max(2, amplitude * (size.height - 4))
      context.fillStyle = fromTime < playedUntil ? played : base
      context.beginPath()
      context.roundRect(x, middle - height / 2, BAR_WIDTH, height, 1)
      context.fill()
    }
  }, [data, playedUntil, size, viewEnd, viewStart])

  return <canvas ref={canvasRef} className={cn('block size-full', className)} aria-hidden="true" />
}
