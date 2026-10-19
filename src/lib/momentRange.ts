import { roundSeconds } from '@/lib/time'

/** Tempo incluído antes do instante marcado no trecho padrão. */
export const DEFAULT_LEAD_SECONDS = 2
/** Tempo incluído depois do instante marcado no trecho padrão. */
export const DEFAULT_TAIL_SECONDS = 2
/** Duração mínima de um trecho. */
export const MIN_RANGE_SECONDS = 0.5

export interface TimeRange {
  startSeconds: number
  endSeconds: number
}

/**
 * Ajusta um trecho para ficar dentro de `[0, duration]` e ter pelo menos
 * `MIN_RANGE_SECONDS` (quando a duração permite).
 */
export function clampRange(startSeconds: number, endSeconds: number, duration: number | null): TimeRange {
  const max = duration !== null && Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY
  let start = Math.min(Math.max(0, startSeconds), max)
  let end = Math.min(Math.max(0, endSeconds), max)
  if (end < start) [start, end] = [end, start]

  if (end - start < MIN_RANGE_SECONDS) {
    end = Math.min(start + MIN_RANGE_SECONDS, max)
    start = Math.max(0, Math.min(start, end - MIN_RANGE_SECONDS))
  }

  return { startSeconds: roundSeconds(start), endSeconds: roundSeconds(end) }
}

/** Trecho padrão em torno do instante marcado. */
export function defaultRange(timeSeconds: number, duration: number | null): TimeRange {
  return clampRange(timeSeconds - DEFAULT_LEAD_SECONDS, timeSeconds + DEFAULT_TAIL_SECONDS, duration)
}

/** Duração do trecho em segundos. */
export function rangeLength({ startSeconds, endSeconds }: TimeRange): number {
  return Math.max(0, endSeconds - startSeconds)
}

/** Janela de tempo exibida no editor do trecho. */
export interface TimeWindow {
  start: number
  end: number
}

const MIN_VIEW_SECONDS = 10

/** Janela ampliada ao redor do trecho, com folga dos dois lados para arrastar as alças. */
export function computeView({ startSeconds, endSeconds }: TimeRange, duration: number): TimeWindow {
  const padding = Math.max(3, (endSeconds - startSeconds) * 0.4)
  let start = Math.max(0, startSeconds - padding)
  let end = Math.min(duration, endSeconds + padding)
  const minimum = Math.min(MIN_VIEW_SECONDS, duration)
  if (end - start < minimum) {
    start = Math.max(0, Math.min(start, duration - minimum, (startSeconds + endSeconds) / 2 - minimum / 2))
    end = Math.min(duration, start + minimum)
  }
  return { start, end }
}

/** Mantém o instante marcado dentro do trecho (o trecho é a referência do momento). */
export function clampTimeToRange(timeSeconds: number, { startSeconds, endSeconds }: TimeRange): number {
  return Math.min(Math.max(timeSeconds, startSeconds), endSeconds)
}

/** Ordem cronológica dos momentos: pelo início do trecho, depois pelo instante marcado. */
export function compareByRange(
  a: TimeRange & { timeSeconds: number },
  b: TimeRange & { timeSeconds: number },
): number {
  return a.startSeconds - b.startSeconds || a.timeSeconds - b.timeSeconds
}

/** Id do momento cujo trecho contém o instante (o de início mais recente, se houver vários). */
export function findMomentAt<T extends TimeRange & { id: string }>(moments: T[], timeSeconds: number): string | null {
  let found: T | null = null
  for (const moment of moments) {
    if (moment.startSeconds <= timeSeconds && timeSeconds <= moment.endSeconds) {
      if (!found || moment.startSeconds >= found.startSeconds) found = moment
    }
  }
  return found?.id ?? null
}
