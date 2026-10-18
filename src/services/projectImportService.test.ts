import { describe, expect, it } from 'vitest'
import { parseProjectJson } from './projectImportService'

const example = {
  version: 1,
  recordingName: 'Reunião com cliente',
  audioFile: 'audio.webm',
  durationSeconds: 365.4,
  importantMoments: [
    {
      id: 'moment-002',
      timeSeconds: 128.2,
      timeFormatted: '00:02:08',
      name: 'Prazo de entrega',
      observation: '',
    },
    {
      id: 'moment-001',
      timeSeconds: 42.5,
      timeFormatted: '00:00:42',
      name: 'Definição do orçamento',
      observation: 'O cliente mencionou o orçamento disponível.',
    },
  ],
}

const parse = (data: unknown, audioDurationSeconds: number | null = 365.4, audioFileName = 'audio.webm') =>
  parseProjectJson(typeof data === 'string' ? data : JSON.stringify(data), { audioDurationSeconds, audioFileName })

describe('parseProjectJson', () => {
  it('carrega o exemplo do formato e ordena por tempo', () => {
    const result = parse(example)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.recordingName).toBe('Reunião com cliente')
    expect(result.value.warnings).toEqual([])
    expect(result.value.moments.map((m) => m.id)).toEqual(['moment-001', 'moment-002'])
    expect(result.value.moments[0]).toEqual({
      id: 'moment-001',
      timeSeconds: 42.5,
      name: 'Definição do orçamento',
      observation: 'O cliente mencionou o orçamento disponível.',
    })
  })

  it('rejeita JSON com erro de sintaxe', () => {
    const result = parse('{ "version": 1, ')
    expect(result.ok).toBe(false)
  })

  it('rejeita versão desconhecida e campos obrigatórios ausentes', () => {
    const result = parse({ version: 2, importantMoments: [] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((e) => e.includes('Versão'))).toBe(true)
    expect(result.errors.some((e) => e.includes('recordingName'))).toBe(true)
  })

  it('rejeita quando importantMoments não é uma lista', () => {
    expect(parse({ ...example, importantMoments: {} }).ok).toBe(false)
    expect(parse([example]).ok).toBe(false)
  })

  it('ignora marcações sem nome ou com tempo inválido, mantendo as demais', () => {
    const result = parse({
      ...example,
      importantMoments: [
        ...example.importantMoments,
        { id: 'x1', timeSeconds: 10, name: '   ' },
        { id: 'x2', timeSeconds: '10', name: 'Texto' },
        { id: 'x3', timeSeconds: -1, name: 'Negativo' },
        'invalida',
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.moments).toHaveLength(2)
    expect(result.value.warnings).toHaveLength(4)
  })

  it('descarta marcações além da duração do áudio e ajusta as que estão na tolerância', () => {
    const result = parse(
      {
        ...example,
        importantMoments: [
          { id: 'a', timeSeconds: 100.3, name: 'Quase no fim', observation: '' },
          { id: 'b', timeSeconds: 500, name: 'Fora', observation: '' },
        ],
      },
      100,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.moments).toEqual([{ id: 'a', timeSeconds: 100, name: 'Quase no fim', observation: '' }])
    expect(result.value.warnings.some((w) => w.includes('"Fora"'))).toBe(true)
    expect(result.value.warnings.some((w) => w.includes('duração registrada'))).toBe(true)
  })

  it('gera novo id para duplicados e aceita observação ausente', () => {
    const result = parse({
      ...example,
      importantMoments: [
        { id: 'dup', timeSeconds: 1, name: 'A' },
        { id: 'dup', timeSeconds: 2, name: 'B', observation: null },
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [a, b] = result.value.moments
    expect(a.id).toBe('dup')
    expect(b.id).not.toBe('dup')
    expect(b.observation).toBe('')
  })

  it('avisa quando o JSON referencia outro arquivo de áudio', () => {
    const result = parse(example, 365.4, 'outro.mp3')
    expect(result.ok && result.value.warnings.some((w) => w.includes('outro.mp3'))).toBe(true)
  })
})
