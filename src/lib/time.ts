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

/** Arredonda para milissegundos, evitando ruído de ponto flutuante no JSON. */
export function roundSeconds(seconds: number): number {
  return Math.round(seconds * 1000) / 1000
}
