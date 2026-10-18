/** Origem do áudio carregado no projeto. */
export type AudioSource = 'recording' | 'import'

/** Marcação de um momento importante, posicionada no tempo do áudio. */
export interface ImportantMoment {
  id: string
  /** Posição no áudio, em segundos. Referência principal para reprodução. */
  timeSeconds: number
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

/* ---------- Formato do arquivo JSON exportado (versão 1) ---------- */

export const PROJECT_FILE_VERSION = 1

export interface ExportedMomentV1 {
  id: string
  timeSeconds: number
  timeFormatted: string
  name: string
  observation: string
}

export interface ProjectFileV1 {
  version: typeof PROJECT_FILE_VERSION
  recordingName: string
  audioFile: string
  durationSeconds: number
  importantMoments: ExportedMomentV1[]
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
