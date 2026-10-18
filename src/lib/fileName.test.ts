import { describe, expect, it } from 'vitest'
import { defaultProjectName, getExtension, resolveProjectName, stripExtension, toSafeFileName } from './fileName'

describe('defaultProjectName', () => {
  it('usa a data local no formato gravacao-AAAA-MM-DD', () => {
    expect(defaultProjectName(new Date(2026, 9, 18, 15, 30))).toBe('gravacao-2026-10-18')
    expect(defaultProjectName(new Date(2026, 0, 5))).toBe('gravacao-2026-01-05')
  })
})

describe('toSafeFileName', () => {
  it('remove acentos, espaços e caracteres especiais', () => {
    expect(toSafeFileName('Reunião com cliente')).toBe('reuniao-com-cliente')
    expect(toSafeFileName('  Equipe: Q4 / Planejamento!  ')).toBe('equipe-q4-planejamento')
  })

  it('impede travessia de diretórios e nomes reservados', () => {
    expect(toSafeFileName('../../etc/passwd')).toBe('etc-passwd')
    expect(toSafeFileName('CON', 'fallback')).toBe('fallback')
    expect(toSafeFileName('...', 'fallback')).toBe('fallback')
    expect(toSafeFileName('🎙️', 'fallback')).toBe('fallback')
  })

  it('limita o tamanho do nome', () => {
    const result = toSafeFileName('a'.repeat(200))
    expect(result.length).toBeLessThanOrEqual(80)
  })
})

describe('auxiliares', () => {
  it('resolve o nome do projeto com fallback', () => {
    expect(resolveProjectName('  Minha reunião ')).toBe('Minha reunião')
    expect(resolveProjectName('   ')).toMatch(/^gravacao-\d{4}-\d{2}-\d{2}$/)
  })

  it('manipula extensões', () => {
    expect(getExtension('audio.WEBM')).toBe('webm')
    expect(getExtension('sem-extensao')).toBe('')
    expect(getExtension('.oculto')).toBe('')
    expect(stripExtension('reuniao.final.mp3')).toBe('reuniao.final')
  })
})
