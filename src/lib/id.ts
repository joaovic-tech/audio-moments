/** Gera um identificador único para uma marcação. */
export function createMomentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `moment-${crypto.randomUUID()}`
  }
  return `moment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
