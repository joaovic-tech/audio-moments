import type { ImportantMoment } from '@/types/project'

/** Quantidade mínima de momentos para exibir a busca na lista. */
export const MOMENT_SEARCH_MIN_COUNT = 3

/** Normaliza para busca: minúsculas, sem acentos e com espaços simplificados. */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Indica se o momento corresponde à busca, procurando no título e na observação.
 * Todos os termos precisam aparecer (em qualquer ordem), ignorando acentos e maiúsculas.
 */
export function matchesMomentQuery(moment: Pick<ImportantMoment, 'name' | 'observation'>, query: string): boolean {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizeSearchText(`${moment.name} ${moment.observation}`)
  return terms.every((term) => haystack.includes(term))
}
