import { getExtension, stripExtension } from '@/lib/fileName'
import { createMomentId } from '@/lib/id'
import { clampRange, defaultRange } from '@/lib/momentRange'
import { roundSeconds } from '@/lib/time'
import {
  extensionForMimeType,
  formatBytes,
  isAcceptedAudioFile,
  probeAudio,
  resolveMimeType,
  AudioProbeError,
} from '@/services/audioService'
import { SUPPORTED_PROJECT_FILE_VERSIONS, type ImportantMoment, type ProjectAudio } from '@/types/project'

/** Tolerância para marcações ligeiramente além do fim do áudio (arredondamentos). */
const DURATION_TOLERANCE_SECONDS = 0.5
/** Diferença a partir da qual avisamos que a duração do JSON não confere com o áudio. */
const DURATION_MISMATCH_SECONDS = 1.5
const MAX_NAME_LENGTH = 120
const MAX_OBSERVATION_LENGTH = 5000
const MAX_JSON_BYTES = 5 * 1024 * 1024
const MAX_AUDIO_BYTES = 2 * 1024 * 1024 * 1024
const LARGE_AUDIO_BYTES = 300 * 1024 * 1024

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export interface ParsedProjectFile {
  recordingName: string
  audioFile: string | null
  moments: ImportantMoment[]
  /** Problemas não fatais: marcações ignoradas, ajustes feitos etc. */
  warnings: string[]
}

export type ParseProjectResult =
  | { ok: true; value: ParsedProjectFile }
  | { ok: false; errors: string[] }

interface ParseOptions {
  /** Duração real do áudio, usada para descartar marcações fora do intervalo. */
  audioDurationSeconds: number | null
  /** Nome do arquivo de áudio selecionado, para conferir com `audioFile`. */
  audioFileName?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/**
 * Valida e normaliza o conteúdo de um `momentos-importantes.json`.
 *
 * Erros de estrutura (JSON malformado, versão incompatível, campos obrigatórios ausentes)
 * rejeitam o arquivo inteiro. Marcações individuais inválidas ou fora da duração do áudio
 * são descartadas e relatadas em `warnings`, sem impedir o carregamento das demais.
 */
export function parseProjectJson(text: string, options: ParseOptions): ParseProjectResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['O arquivo não contém um JSON válido (erro de sintaxe).'] }
  }

  if (!isRecord(data)) {
    return { ok: false, errors: ['O JSON deve ser um objeto com as informações do projeto.'] }
  }

  const errors: string[] = []

  if (!('version' in data)) {
    errors.push('Campo obrigatório "version" ausente.')
  } else if (typeof data.version !== 'number' || !SUPPORTED_PROJECT_FILE_VERSIONS.includes(data.version)) {
    errors.push(
      `Versão do formato não suportada: ${JSON.stringify(data.version)}. Esta aplicação lê as versões ${SUPPORTED_PROJECT_FILE_VERSIONS.join(' e ')}.`,
    )
  }

  if (typeof data.recordingName !== 'string' || !data.recordingName.trim()) {
    errors.push('Campo obrigatório "recordingName" ausente ou vazio.')
  }

  if (!Array.isArray(data.importantMoments)) {
    errors.push('Campo obrigatório "importantMoments" ausente ou não é uma lista.')
  }

  if ('audioFile' in data && data.audioFile !== undefined && typeof data.audioFile !== 'string') {
    errors.push('O campo "audioFile" deve ser um texto.')
  }

  if (
    'durationSeconds' in data &&
    data.durationSeconds !== undefined &&
    data.durationSeconds !== null &&
    !isNonNegativeNumber(data.durationSeconds)
  ) {
    errors.push('O campo "durationSeconds" deve ser um número maior ou igual a zero.')
  }

  if (errors.length > 0) return { ok: false, errors }

  const warnings: string[] = []
  const { audioDurationSeconds, audioFileName } = options
  const audioFile = typeof data.audioFile === 'string' ? data.audioFile : null

  if (audioFile && audioFileName && audioFile !== audioFileName) {
    warnings.push(
      `O JSON referencia o áudio "${audioFile}", mas o arquivo selecionado é "${audioFileName}". Confira se eles pertencem ao mesmo projeto.`,
    )
  }

  if (
    isNonNegativeNumber(data.durationSeconds) &&
    audioDurationSeconds !== null &&
    Math.abs(data.durationSeconds - audioDurationSeconds) > DURATION_MISMATCH_SECONDS
  ) {
    warnings.push(
      `A duração registrada no JSON (${data.durationSeconds.toFixed(1)} s) difere da duração do áudio (${audioDurationSeconds.toFixed(1)} s).`,
    )
  }

  const moments: ImportantMoment[] = []
  const seenIds = new Set<string>()
  const rawMoments = data.importantMoments as unknown[]

  rawMoments.forEach((raw, index) => {
    const label = `Marcação ${index + 1}`

    if (!isRecord(raw)) {
      warnings.push(`${label} ignorada: formato inválido.`)
      return
    }

    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    if (!name) {
      warnings.push(`${label} ignorada: o campo obrigatório "name" está ausente ou vazio.`)
      return
    }

    const display = `${label} ("${name}")`

    if (!isNonNegativeNumber(raw.timeSeconds)) {
      warnings.push(`${display} ignorada: "timeSeconds" deve ser um número maior ou igual a zero.`)
      return
    }

    let timeSeconds = raw.timeSeconds
    if (audioDurationSeconds !== null && timeSeconds > audioDurationSeconds) {
      if (timeSeconds - audioDurationSeconds > DURATION_TOLERANCE_SECONDS) {
        warnings.push(
          `${display} ignorada: o tempo ${timeSeconds.toFixed(1)} s está além da duração do áudio (${audioDurationSeconds.toFixed(1)} s).`,
        )
        return
      }
      timeSeconds = audioDurationSeconds
    }

    let observation = ''
    if (typeof raw.observation === 'string') {
      observation = raw.observation
    } else if (raw.observation !== undefined && raw.observation !== null) {
      warnings.push(`${display}: o campo "observation" não é um texto e foi deixado em branco.`)
    }

    // Trecho: opcional (a versão 1 não o possui). Valores inválidos recebem o trecho padrão.
    let range = defaultRange(timeSeconds, audioDurationSeconds)
    const hasStart = raw.startSeconds !== undefined && raw.startSeconds !== null
    const hasEnd = raw.endSeconds !== undefined && raw.endSeconds !== null
    if (hasStart || hasEnd) {
      if (
        isNonNegativeNumber(raw.startSeconds) &&
        isNonNegativeNumber(raw.endSeconds) &&
        raw.startSeconds < raw.endSeconds
      ) {
        if (audioDurationSeconds !== null && raw.startSeconds >= audioDurationSeconds) {
          warnings.push(`${display}: o trecho começa depois do fim do áudio; foi usado o trecho padrão.`)
        } else {
          if (audioDurationSeconds !== null && raw.endSeconds - audioDurationSeconds > DURATION_TOLERANCE_SECONDS) {
            warnings.push(`${display}: o fim do trecho passava da duração do áudio e foi ajustado.`)
          }
          range = clampRange(raw.startSeconds, raw.endSeconds, audioDurationSeconds)
        }
      } else {
        warnings.push(
          `${display}: "startSeconds"/"endSeconds" inválidos (devem ser números com início menor que o fim); foi usado o trecho padrão.`,
        )
      }
    }

    let id = typeof raw.id === 'string' ? raw.id.trim() : ''
    if (!id || seenIds.has(id)) {
      if (id) warnings.push(`${display}: identificador duplicado "${id}"; um novo foi gerado.`)
      id = createMomentId()
    }
    seenIds.add(id)

    moments.push({
      id,
      timeSeconds: roundSeconds(timeSeconds),
      ...range,
      name: name.slice(0, MAX_NAME_LENGTH),
      observation: observation.slice(0, MAX_OBSERVATION_LENGTH),
    })
  })

  moments.sort((a, b) => a.timeSeconds - b.timeSeconds)

  return {
    ok: true,
    value: {
      recordingName: (data.recordingName as string).trim(),
      audioFile,
      moments,
      warnings,
    },
  }
}

/* ---------- Leitura dos arquivos selecionados ---------- */

export interface ImportSelection {
  /** Arquivo de áudio ou um `.zip` exportado por esta aplicação. */
  primaryFile: File
  jsonFile?: File | null
}

export interface ImportPreview {
  audio: ProjectAudio
  audioFileName: string
  projectName: string
  moments: ImportantMoment[]
  /** Nome do arquivo JSON usado, quando houver. */
  jsonFileName: string | null
  warnings: string[]
  /** Erros do JSON. Quando presente, nenhuma marcação foi carregada. */
  jsonErrors: string[] | null
  /** Indica que os arquivos vieram de dentro de um ZIP. */
  fromZip: boolean
}

export function isZipFile(file: Pick<File, 'name' | 'type'>): boolean {
  return getExtension(file.name) === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
}

function baseName(path: string): string {
  return path.split('/').pop() ?? path
}

/** Extrai o áudio e o JSON de um ZIP no formato exportado pela aplicação. */
async function extractZip(file: File): Promise<{ audioFile: File; jsonFile: File | null }> {
  // Carregado sob demanda para não pesar no carregamento inicial.
  const { default: JSZip } = await import('jszip')
  let zip: InstanceType<typeof JSZip>
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
    throw new ImportError('Não foi possível abrir o arquivo ZIP. Ele pode estar corrompido.')
  }

  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && !entry.name.startsWith('__MACOSX/') && !baseName(entry.name).startsWith('.'),
  )
  const jsonEntries = entries.filter((entry) => getExtension(entry.name) === 'json')
  const audioEntries = entries.filter((entry) => isAcceptedAudioFile({ name: entry.name, type: '' }))

  const jsonEntry =
    jsonEntries.find((entry) => baseName(entry.name) === 'momentos-importantes.json') ?? jsonEntries[0] ?? null

  let jsonFile: File | null = null
  let referencedAudio: string | null = null
  if (jsonEntry) {
    const text = await jsonEntry.async('string')
    jsonFile = new File([text], baseName(jsonEntry.name), { type: 'application/json' })
    try {
      const parsed: unknown = JSON.parse(text)
      if (isRecord(parsed) && typeof parsed.audioFile === 'string') referencedAudio = parsed.audioFile
    } catch {
      // O JSON inválido será relatado na etapa de validação.
    }
  }

  const audioEntry =
    (referencedAudio && audioEntries.find((entry) => baseName(entry.name) === referencedAudio)) || audioEntries[0]

  if (!audioEntry) {
    throw new ImportError('O ZIP não contém nenhum arquivo de áudio compatível.')
  }

  const name = baseName(audioEntry.name)
  const audioData = await audioEntry.async('arraybuffer')
  const audioFile = new File([audioData], name, { type: resolveMimeType({ name, type: '' }) })
  return { audioFile, jsonFile }
}

/**
 * Valida os arquivos escolhidos e monta uma prévia do projeto a ser carregado.
 * Lança `ImportError` quando o áudio não pode ser usado. Um JSON inválido não impede a
 * importação: o resultado traz `jsonErrors` e o áudio pode ser carregado sozinho.
 */
export async function prepareImport({ primaryFile, jsonFile }: ImportSelection): Promise<ImportPreview> {
  let audioFile = primaryFile
  let selectedJson = jsonFile ?? null
  const fromZip = isZipFile(primaryFile)

  if (fromZip) {
    const extracted = await extractZip(primaryFile)
    audioFile = extracted.audioFile
    selectedJson = selectedJson ?? extracted.jsonFile
  }

  if (!isAcceptedAudioFile(audioFile)) {
    throw new ImportError(
      `"${audioFile.name}" não é um arquivo de áudio aceito. Use WAV, MP3, M4A, WebM, OGG, FLAC ou AAC.`,
    )
  }
  if (audioFile.size === 0) {
    throw new ImportError('O arquivo de áudio está vazio.')
  }
  if (audioFile.size > MAX_AUDIO_BYTES) {
    throw new ImportError(`O áudio tem ${formatBytes(audioFile.size)}; o limite é ${formatBytes(MAX_AUDIO_BYTES)}.`)
  }

  const mimeType = resolveMimeType(audioFile)
  let durationSeconds: number | null
  try {
    ;({ durationSeconds } = await probeAudio(audioFile))
  } catch (error) {
    if (error instanceof AudioProbeError) throw new ImportError(error.message)
    throw new ImportError('Não foi possível ler o arquivo de áudio.')
  }

  const warnings: string[] = []
  if (audioFile.size > LARGE_AUDIO_BYTES) {
    warnings.push(
      `O áudio é grande (${formatBytes(audioFile.size)}). Em celulares, o navegador pode ficar lento ou sem memória.`,
    )
  }
  if (durationSeconds === null) {
    warnings.push('Não foi possível determinar a duração do áudio; a validação dos tempos ficará limitada.')
  }

  const extension = getExtension(audioFile.name) || extensionForMimeType(mimeType)
  const audio: ProjectAudio = {
    blob: audioFile,
    mimeType,
    extension,
    source: 'import',
    originalFileName: audioFile.name,
    durationSeconds,
  }

  let projectName = stripExtension(audioFile.name)
  let moments: ImportantMoment[] = []
  let jsonErrors: string[] | null = null

  if (selectedJson) {
    if (getExtension(selectedJson.name) !== 'json' && selectedJson.type !== 'application/json') {
      jsonErrors = [`"${selectedJson.name}" não é um arquivo .json.`]
    } else if (selectedJson.size > MAX_JSON_BYTES) {
      jsonErrors = [`O JSON tem ${formatBytes(selectedJson.size)}; o limite é ${formatBytes(MAX_JSON_BYTES)}.`]
    } else {
      const result = parseProjectJson(await selectedJson.text(), {
        audioDurationSeconds: durationSeconds,
        audioFileName: audioFile.name,
      })
      if (result.ok) {
        projectName = result.value.recordingName
        moments = result.value.moments
        warnings.push(...result.value.warnings)
      } else {
        jsonErrors = result.errors
      }
    }
  }

  return {
    audio,
    audioFileName: audioFile.name,
    projectName,
    moments,
    jsonFileName: selectedJson?.name ?? null,
    warnings,
    jsonErrors,
    fromZip,
  }
}
