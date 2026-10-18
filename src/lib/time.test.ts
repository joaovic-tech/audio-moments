import { describe, expect, it } from 'vitest'
import { formatDurationLabel, formatTime, formatTimePrecise, formatTimeShort, roundSeconds } from './time'

describe('formatTime', () => {
  it('formata como HH:MM:SS arredondando para baixo', () => {
    expect(formatTime(0)).toBe('00:00:00')
    expect(formatTime(42.5)).toBe('00:00:42')
    expect(formatTime(128.2)).toBe('00:02:08')
    expect(formatTime(155)).toBe('00:02:35')
    expect(formatTime(3725.9)).toBe('01:02:05')
  })

  it('trata valores inválidos como zero', () => {
    expect(formatTime(Number.NaN)).toBe('00:00:00')
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('00:00:00')
    expect(formatTime(-3)).toBe('00:00:00')
  })

  it('versão curta omite horas zeradas', () => {
    expect(formatTimeShort(155)).toBe('02:35')
    expect(formatTimeShort(3725)).toBe('01:02:05')
  })

  it('arredonda segundos para milissegundos', () => {
    expect(roundSeconds(1.23456)).toBe(1.235)
    expect(roundSeconds(0.1 + 0.2)).toBe(0.3)
  })
})

describe('formatTimePrecise', () => {
  it('mostra décimos de segundo', () => {
    expect(formatTimePrecise(5.24)).toBe('00:00:05.2')
    expect(formatTimePrecise(4.96)).toBe('00:00:05.0')
    expect(formatTimePrecise(3725.55)).toBe('01:02:05.6')
    expect(formatTimePrecise(Number.NaN)).toBe('00:00:00.0')
  })

  it('formata durações curtas', () => {
    expect(formatDurationLabel(14.8)).toBe('14,8 s')
    expect(formatDurationLabel(125)).toBe('2 min 05 s')
  })
})
