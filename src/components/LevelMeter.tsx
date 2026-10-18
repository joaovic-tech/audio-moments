import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const BAR_COUNT = 32
const SAMPLE_INTERVAL_MS = 60
const IDLE_LEVELS: number[] = Array(BAR_COUNT).fill(0)

interface LevelMeterProps {
  /** Retorna o nível atual entre 0 e 1. */
  getLevel: () => number
  active: boolean
  paused?: boolean
}

/** Visualização simples do nível do microfone nos últimos segundos. */
export function LevelMeter({ getLevel, active, paused = false }: LevelMeterProps) {
  const [levels, setLevels] = useState<number[]>(IDLE_LEVELS)
  const lastSampleRef = useRef(0)
  const [wasActive, setWasActive] = useState(active)

  // Começa um histórico novo a cada gravação.
  if (active !== wasActive) {
    setWasActive(active)
    if (active) setLevels(IDLE_LEVELS)
  }

  useEffect(() => {
    if (!active || paused) return
    let frame = 0
    const loop = (now: number) => {
      if (now - lastSampleRef.current >= SAMPLE_INTERVAL_MS) {
        lastSampleRef.current = now
        const level = getLevel()
        setLevels((previous) => [...previous.slice(1), level])
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [active, paused, getLevel])

  const shown = active ? levels : IDLE_LEVELS

  return (
    <div className="flex h-10 items-center justify-center gap-[3px]" aria-hidden="true">
      {shown.map((level, index) => (
        <span
          key={index}
          className={cn(
            'w-1 rounded-full transition-[height] duration-75',
            active && !paused ? 'bg-recording' : 'bg-muted-foreground/30',
          )}
          style={{ height: `${Math.max(8, Math.round(level * 100))}%` }}
        />
      ))}
    </div>
  )
}
