/** Formata segundos como `HH:MM:SS` (arredondando para baixo). */
export function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

/** Formato compacto para a interface: omite as horas quando zero (`02:35`). */
export function formatTimeShort(totalSeconds: number): string {
  const full = formatTime(totalSeconds)
  return full.startsWith('00:') ? full.slice(3) : full
}

/** Formato com décimos de segundo para ajustes finos: `00:02:35.4`. */
export function formatTimePrecise(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0
  // Arredonda para o décimo mais próximo antes de separar as partes (evita 00:00:04.10).
  const tenthsTotal = Math.round(safe * 10)
  return `${formatTime(Math.floor(tenthsTotal / 10))}.${tenthsTotal % 10}`
}

/** Duração curta legível: `14,8 s`, `2 min 05 s`. */
export function formatDurationLabel(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  if (safe < 60) return `${safe.toFixed(1).replace('.', ',')} s`
  const minutes = Math.floor(safe / 60)
  const rest = Math.round(safe % 60)
  return `${minutes} min ${String(rest).padStart(2, '0')} s`
}

/** Arredonda para milissegundos, evitando ruído de ponto flutuante no JSON. */
export function roundSeconds(seconds: number): number {
  return Math.round(seconds * 1000) / 1000
}
