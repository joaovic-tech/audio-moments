import { resolveProjectName, toSafeFileName } from '@/lib/fileName'
import { compareByRange } from '@/lib/momentRange'
import { formatTime, roundSeconds } from '@/lib/time'
import { PROJECT_FILE_VERSION, type ImportantMoment, type Project, type ProjectFile } from '@/types/project'

export const MOMENTS_FILE_NAME = 'momentos-importantes.json'

export class ExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExportError'
  }
}

export interface ExportResult {
  kind: 'audio' | 'zip'
  blob: Blob
  fileName: string
}

/** Nomes de arquivo usados na exportação, derivados do nome do projeto. */
export function getExportFileNames(project: Pick<Project, 'name' | 'audio'>) {
  const base = toSafeFileName(resolveProjectName(project.name))
  const extension = project.audio?.extension ?? 'webm'
  return {
    base,
    audioFileName: `${base}.${extension}`,
    zipFileName: `${base}.zip`,
  }
}

/** Marcações sem nome impedem a exportação. */
export function findIncompleteMoments(moments: ImportantMoment[]): ImportantMoment[] {
  return moments.filter((moment) => !moment.name.trim())
}

/** Monta o conteúdo do `momentos-importantes.json` (formato versão 2). */
export function buildProjectFile(project: Project, audioFileName: string): ProjectFile {
  const sorted = [...project.moments].sort(compareByRange)
  const lastMoment = Math.max(0, ...sorted.map((moment) => Math.max(moment.timeSeconds, moment.endSeconds)))
  const knownDuration = project.audio?.durationSeconds
  const durationSeconds =
    knownDuration !== null && knownDuration !== undefined && Number.isFinite(knownDuration) ? knownDuration : lastMoment

  return {
    version: PROJECT_FILE_VERSION,
    recordingName: resolveProjectName(project.name),
    audioFile: audioFileName,
    durationSeconds: roundSeconds(durationSeconds),
    importantMoments: sorted.map((moment) => ({
      id: moment.id,
      timeSeconds: roundSeconds(moment.timeSeconds),
      timeFormatted: formatTime(moment.timeSeconds),
      startSeconds: roundSeconds(moment.startSeconds),
      startFormatted: formatTime(moment.startSeconds),
      endSeconds: roundSeconds(moment.endSeconds),
      endFormatted: formatTime(moment.endSeconds),
      name: moment.name.trim(),
      observation: moment.observation,
    })),
  }
}

/**
 * Gera o arquivo a ser baixado:
 * - sem marcações: o próprio áudio, no formato original;
 * - com marcações: um ZIP com o áudio original (sem recompressão) e o JSON.
 */
export async function createProjectExport(project: Project): Promise<ExportResult> {
  const { audio } = project
  if (!audio) throw new ExportError('Não há áudio para exportar. Grave ou importe um áudio primeiro.')

  const incomplete = findIncompleteMoments(project.moments)
  if (incomplete.length > 0) {
    throw new ExportError(
      incomplete.length === 1
        ? 'Há 1 marcação sem nome. Preencha o nome antes de exportar.'
        : `Há ${incomplete.length} marcações sem nome. Preencha os nomes antes de exportar.`,
    )
  }

  const { audioFileName, zipFileName } = getExportFileNames(project)

  if (project.moments.length === 0) {
    return { kind: 'audio', blob: audio.blob, fileName: audioFileName }
  }

  try {
    // Carregado sob demanda para não pesar no carregamento inicial.
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    // STORE: o áudio já é comprimido; copiar os bytes preserva o arquivo original intacto.
    zip.file(audioFileName, await audio.blob.arrayBuffer(), { compression: 'STORE' })
    zip.file(MOMENTS_FILE_NAME, JSON.stringify(buildProjectFile(project, audioFileName), null, 2), {
      compression: 'DEFLATE',
    })
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
    return { kind: 'zip', blob, fileName: zipFileName }
  } catch {
    throw new ExportError('Falha ao gerar o arquivo ZIP. Verifique se há memória disponível e tente novamente.')
  }
}

/** Dispara o download de um Blob no navegador. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revogar imediatamente pode cancelar o download em alguns navegadores.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
