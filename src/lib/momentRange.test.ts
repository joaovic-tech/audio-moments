import { describe, expect, it } from 'vitest'
import {
  clampRange,
  clampTimeToRange,
  compareByRange,
  computeView,
  defaultRange,
  findMomentAt,
  MIN_RANGE_SECONDS,
  rangeLength,
} from './momentRange'

describe('defaultRange', () => {
  it('inclui alguns segundos antes e depois do instante marcado', () => {
    expect(defaultRange(42.5, 300)).toEqual({ startSeconds: 40.5, endSeconds: 44.5 })
  })

  it('respeita o início e o fim do áudio', () => {
    expect(defaultRange(1, 300)).toEqual({ startSeconds: 0, endSeconds: 3 })
    expect(defaultRange(299, 300)).toEqual({ startSeconds: 297, endSeconds: 300 })
    expect(defaultRange(1, 1.5)).toEqual({ startSeconds: 0, endSeconds: 1.5 })
  })

  it('não limita o fim quando a duração ainda é desconhecida', () => {
    expect(defaultRange(20, null)).toEqual({ startSeconds: 18, endSeconds: 22 })
  })
})

describe('clampRange', () => {
  it('inverte início e fim trocados e garante a duração mínima', () => {
    expect(clampRange(20, 10, 100)).toEqual({ startSeconds: 10, endSeconds: 20 })
    const tiny = clampRange(10, 10.1, 100)
    expect(rangeLength(tiny)).toBeCloseTo(MIN_RANGE_SECONDS)
  })

  it('mantém a duração mínima no fim do áudio', () => {
    expect(clampRange(99.9, 100, 100)).toEqual({ startSeconds: 99.5, endSeconds: 100 })
  })

  it('limita ao intervalo do áudio', () => {
    expect(clampRange(-5, 500, 120)).toEqual({ startSeconds: 0, endSeconds: 120 })
  })
})

describe('computeView', () => {
  it('mostra o trecho com folga dos dois lados', () => {
    expect(computeView({ startSeconds: 40, endSeconds: 50 }, 300)).toEqual({ start: 36, end: 54 })
  })

  it('garante uma janela mínima de 10 s centrada no trecho', () => {
    expect(computeView({ startSeconds: 40, endSeconds: 41 }, 300)).toEqual({ start: 35.5, end: 45.5 })
    expect(computeView({ startSeconds: 0, endSeconds: 1 }, 300)).toEqual({ start: 0, end: 10 })
    expect(computeView({ startSeconds: 299, endSeconds: 300 }, 300)).toEqual({ start: 290, end: 300 })
  })

  it('não ultrapassa a duração de áudios curtos', () => {
    expect(computeView({ startSeconds: 1, endSeconds: 3 }, 4)).toEqual({ start: 0, end: 4 })
  })
})

describe('relação entre instante marcado e trecho', () => {
  it('mantém o instante dentro do trecho ajustado', () => {
    expect(clampTimeToRange(2.4, { startSeconds: 0.7, endSeconds: 9.7 })).toBe(2.4)
    expect(clampTimeToRange(2.4, { startSeconds: 5, endSeconds: 9 })).toBe(5)
    expect(clampTimeToRange(12, { startSeconds: 5, endSeconds: 9 })).toBe(9)
  })

  it('ordena pelo início do trecho', () => {
    const a = { id: 'a', timeSeconds: 10, startSeconds: 8, endSeconds: 12 }
    const b = { id: 'b', timeSeconds: 20, startSeconds: 2, endSeconds: 25 }
    expect([a, b].sort(compareByRange).map((m) => m.id)).toEqual(['b', 'a'])
  })

  it('encontra o momento em reprodução pelo trecho', () => {
    const moments = [
      { id: 'a', startSeconds: 0, endSeconds: 10 },
      { id: 'b', startSeconds: 5, endSeconds: 8 },
      { id: 'c', startSeconds: 60, endSeconds: 70 },
    ]
    expect(findMomentAt(moments, 3)).toBe('a')
    expect(findMomentAt(moments, 6)).toBe('b')
    expect(findMomentAt(moments, 30)).toBeNull()
    expect(findMomentAt(moments, 70)).toBe('c')
  })
})
