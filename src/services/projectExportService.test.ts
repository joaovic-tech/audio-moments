import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import type { Project } from '@/types/project'
import { buildProjectFile, createProjectExport, ExportError, MOMENTS_FILE_NAME } from './projectExportService'
import { parseProjectJson } from './projectImportService'

const audioBytes = new Uint8Array(Array.from({ length: 2048 }, (_, i) => i % 256))

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    name: 'Reunião de equipe',
    audio: {
      blob: new Blob([audioBytes], { type: 'audio/webm;codecs=opus' }),
      mimeType: 'audio/webm;codecs=opus',
      extension: 'webm',
      source: 'recording',
      durationSeconds: 300.25,
    },
    moments: [],
    hasUnsavedChanges: true,
    ...overrides,
  }
}

describe('createProjectExport', () => {
  it('sem marcações exporta somente o áudio original', async () => {
    const project = makeProject()
    const result = await createProjectExport(project)
    expect(result.kind).toBe('audio')
    expect(result.fileName).toBe('reuniao-de-equipe.webm')
    expect(result.blob).toBe(project.audio?.blob)
  })

  it('com marcações exporta um ZIP com o áudio intacto e o JSON', async () => {
    const project = makeProject({
      moments: [
        { id: 'moment-b', timeSeconds: 155.678, name: 'Prazo', observation: '' },
        { id: 'moment-a', timeSeconds: 42.5, name: ' Orçamento ', observation: 'Valor aprovado' },
      ],
    })
    const result = await createProjectExport(project)
    expect(result.kind).toBe('zip')
    expect(result.fileName).toBe('reuniao-de-equipe.zip')

    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer())
    expect(Object.keys(zip.files).sort()).toEqual([MOMENTS_FILE_NAME, 'reuniao-de-equipe.webm'])

    const storedAudio = new Uint8Array(await zip.file('reuniao-de-equipe.webm')!.async('uint8array'))
    expect(storedAudio).toEqual(audioBytes)

    const json = JSON.parse(await zip.file(MOMENTS_FILE_NAME)!.async('string'))
    expect(json).toEqual({
      version: 1,
      recordingName: 'Reunião de equipe',
      audioFile: 'reuniao-de-equipe.webm',
      durationSeconds: 300.25,
      importantMoments: [
        { id: 'moment-a', timeSeconds: 42.5, timeFormatted: '00:00:42', name: 'Orçamento', observation: 'Valor aprovado' },
        { id: 'moment-b', timeSeconds: 155.678, timeFormatted: '00:02:35', name: 'Prazo', observation: '' },
      ],
    })
  })

  it('o JSON exportado é importado novamente sem perdas', () => {
    const project = makeProject({
      moments: [{ id: 'moment-1', timeSeconds: 12.3, name: 'Início', observation: 'Linha 1\nLinha 2' }],
    })
    const file = buildProjectFile(project, 'reuniao-de-equipe.webm')
    const parsed = parseProjectJson(JSON.stringify(file), {
      audioDurationSeconds: 300.25,
      audioFileName: 'reuniao-de-equipe.webm',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.warnings).toEqual([])
    expect(parsed.value.recordingName).toBe(project.name)
    expect(parsed.value.moments).toEqual(project.moments)
  })

  it('usa o nome padrão quando o projeto não tem nome', async () => {
    const result = await createProjectExport(makeProject({ name: '  ' }))
    expect(result.fileName).toMatch(/^gravacao-\d{4}-\d{2}-\d{2}\.webm$/)
  })

  it('bloqueia exportação com marcações sem nome ou sem áudio', async () => {
    await expect(
      createProjectExport(makeProject({ moments: [{ id: 'm', timeSeconds: 1, name: '', observation: '' }] })),
    ).rejects.toBeInstanceOf(ExportError)
    await expect(createProjectExport(makeProject({ audio: null }))).rejects.toBeInstanceOf(ExportError)
  })

  it('preserva a extensão de áudios importados', async () => {
    const project = makeProject()
    project.audio = { ...project.audio!, extension: 'mp3', mimeType: 'audio/mpeg', source: 'import' }
    const result = await createProjectExport(project)
    expect(result.fileName).toBe('reuniao-de-equipe.mp3')
  })
})
