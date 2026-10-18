const MAX_FILE_NAME_LENGTH = 80
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i

/** Nome padrão do projeto, baseado na data local: `gravacao-2026-10-18`. */
export function defaultProjectName(date: Date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `gravacao-${yyyy}-${mm}-${dd}`
}

/**
 * Converte um nome livre em um nome de arquivo seguro e portável:
 * sem acentos, sem separadores de caminho, minúsculo, com hífens e tamanho limitado.
 * Retorna `fallback` se nada aproveitável restar.
 */
export function toSafeFileName(name: string, fallback: string = defaultProjectName()): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, MAX_FILE_NAME_LENGTH)
    .replace(/[-_]+$/g, '')

  if (!slug || WINDOWS_RESERVED.test(slug)) return fallback
  return slug
}

/** Nome efetivo do projeto: o digitado (sem espaços extras) ou o padrão. */
export function resolveProjectName(name: string): string {
  return name.trim() || defaultProjectName()
}

/** Remove a extensão de um nome de arquivo (`reuniao.mp3` → `reuniao`). */
export function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

/** Extensão em minúsculas sem ponto, ou string vazia. */
export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 && dot < fileName.length - 1 ? fileName.slice(dot + 1).toLowerCase() : ''
}
