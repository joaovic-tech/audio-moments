import { describe, expect, it } from 'vitest'
import { STORAGE_SCHEMA_VERSION, parseStoredMoments, parseStoredProject } from './projectStorageService'

const moment = {
  id: 'moment-1',
  timeSeconds: 12,
  startSeconds: 10,
  endSeconds: 14,
  name: 'Orçamento',
  observation: 'Aprovado',
}

const audioRecord = (data: Blob | ArrayBuffer = new Blob(['abc'], { type: 'audio/mpeg' })) => ({
  schema: STORAGE_SCHEMA_VERSION,
  id: 'audio-1',
  data,
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  source: 'import',
  originalFileName: 'reuniao.mp3',
  durationSeconds: 246,
})

const stateRecord = (overrides: Record<string, unknown> = {}) => ({
  schema: STORAGE_SCHEMA_VERSION,
  savedAt: 0,
  audioId: 'audio-1',
  name: 'Reunião',
  moments: [moment],
  hasUnsavedChanges: true,
  ...overrides,
})

describe('parseStoredMoments', () => {
  it('descarta marcações malformadas', () => {
    const result = parseStoredMoments([
      moment,
      { ...moment, id: '' },
      { ...moment, startSeconds: 20 },
      { ...moment, timeSeconds: -1 },
      'texto',
      { ...moment, id: 'moment-2', name: 42 },
    ])
    expect(result.map((item) => item.id)).toEqual(['moment-1', 'moment-2'])
    expect(result[1].name).toBe('')
  })

  it('retorna lista vazia para valores que não são arrays', () => {
    expect(parseStoredMoments(undefined)).toEqual([])
  })
})

describe('parseStoredProject', () => {
  it('restaura áudio, nome e marcações', () => {
    const project = parseStoredProject(audioRecord(), stateRecord())
    expect(project).not.toBeNull()
    expect(project?.audio).toMatchObject({ extension: 'mp3', source: 'import', durationSeconds: 246 })
    expect(project?.audio.originalFileName).toBe('reuniao.mp3')
    expect(project?.name).toBe('Reunião')
    expect(project?.moments).toEqual([moment])
    expect(project?.hasUnsavedChanges).toBe(true)
  })

  it('aceita o áudio salvo como ArrayBuffer', async () => {
    const buffer = new TextEncoder().encode('abc').buffer
    const project = parseStoredProject(audioRecord(buffer), stateRecord())
    expect(project?.audio.blob.type).toBe('audio/mpeg')
    expect(await project?.audio.blob.text()).toBe('abc')
  })

  it('ignora o estado de outro áudio, mas mantém o áudio', () => {
    const project = parseStoredProject(audioRecord(), stateRecord({ audioId: 'outro' }))
    expect(project?.moments).toEqual([])
    expect(project?.name).toBe('')
  })

  it('não restaura sem áudio válido', () => {
    expect(parseStoredProject(undefined, stateRecord())).toBeNull()
    expect(parseStoredProject({ ...audioRecord(), schema: 999 }, stateRecord())).toBeNull()
    expect(parseStoredProject(audioRecord(new Blob([])), stateRecord())).toBeNull()
  })
})
