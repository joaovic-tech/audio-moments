/** Origem do áudio carregado no projeto. */
export type AudioSource = 'recording' | 'import'

/** Marcação de um momento importante, posicionada no tempo do áudio. */
export interface ImportantMoment {
  id: string
  /** Instante marcado no áudio, em segundos. */
  timeSeconds: number
  /** Início do trecho do momento, em segundos (ajustável pelo usuário). */
  startSeconds: number
  /** Fim do trecho do momento, em segundos (ajustável pelo usuário). */
  endSeconds: number
  /** Nome obrigatório. Uma string vazia indica uma marcação ainda não preenchida. */
  name: string
  observation: string
}

/** Áudio associado ao projeto atual. O arquivo original nunca é recodificado. */
export interface ProjectAudio {
  blob: Blob
  /** MIME type real do arquivo (ex.: `audio/webm;codecs=opus`). */
  mimeType: string
  /** Extensão usada na exportação, sem ponto (ex.: `webm`, `mp3`). */
  extension: string
  source: AudioSource
  /** Nome original do arquivo importado, quando houver. */
  originalFileName?: string
  /** Duração em segundos; `null` enquanto ainda não foi determinada. */
  durationSeconds: number | null
}

export interface Project {
  /** Nome digitado pelo usuário. Vazio significa "usar o nome padrão". */
  name: string
  audio: ProjectAudio | null
  moments: ImportantMoment[]
  /** Há alterações que ainda não foram exportadas. */
  hasUnsavedChanges: boolean
}

/* ---------- Formato do arquivo JSON exportado ---------- */

/** Versão gravada na exportação. A versão 2 acrescenta o trecho (início/fim) de cada momento. */
export const PROJECT_FILE_VERSION = 2
/** Versões aceitas na importação. Arquivos da versão 1 recebem um trecho padrão. */
export const SUPPORTED_PROJECT_FILE_VERSIONS: readonly number[] = [1, 2]

export interface ExportedMoment {
  id: string
  timeSeconds: number
  timeFormatted: string
  startSeconds: number
  startFormatted: string
  endSeconds: number
  endFormatted: string
  name: string
  observation: string
}

export interface ProjectFile {
  version: typeof PROJECT_FILE_VERSION
  recordingName: string
  audioFile: string
  durationSeconds: number
  importantMoments: ExportedMoment[]
}

/* ---------- Gravação ---------- */

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'error'

export type RecorderErrorKind =
  | 'unsupported'
  | 'insecure-context'
  | 'permission-denied'
  | 'no-device'
  | 'device-busy'
  | 'recording-failed'
  | 'unknown'

export interface RecorderError {
  kind: RecorderErrorKind
  message: string
}

export interface RecordingResult {
  blob: Blob
  mimeType: string
  /** Duração medida pelo cronômetro de gravação (exclui pausas). */
  elapsedSeconds: number
}
