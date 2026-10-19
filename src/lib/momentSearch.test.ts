import { describe, expect, it } from 'vitest'
import { matchesMomentQuery, normalizeSearchText } from './momentSearch'

const moment = { name: 'Definição do orçamento', observation: 'Cliente aprovou a verba de marketing' }

describe('normalizeSearchText', () => {
  it('remove acentos, maiúsculas e espaços extras', () => {
    expect(normalizeSearchText('  Definição   do ORÇAMENTO ')).toBe('definicao do orcamento')
  })
})

describe('matchesMomentQuery', () => {
  it('aceita busca vazia', () => {
    expect(matchesMomentQuery(moment, '   ')).toBe(true)
  })

  it('procura no título ignorando acentos e maiúsculas', () => {
    expect(matchesMomentQuery(moment, 'orcamento')).toBe(true)
    expect(matchesMomentQuery(moment, 'DEFINICAO')).toBe(true)
  })

  it('procura na observação', () => {
    expect(matchesMomentQuery(moment, 'verba')).toBe(true)
  })

  it('exige todos os termos, em qualquer ordem', () => {
    expect(matchesMomentQuery(moment, 'marketing orçamento')).toBe(true)
    expect(matchesMomentQuery(moment, 'orçamento prazo')).toBe(false)
  })
})
