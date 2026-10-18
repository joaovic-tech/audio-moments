import { getExtension } from '@/lib/fileName'

/** Extensões de áudio aceitas na importação e o MIME type correspondente. */
export const AUDIO_EXTENSION_MIME: Readonly<Record<string, string>> = {
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  webm: 'audio/webm',
  weba: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  flac: 'audio/flac',
}

export const AUDIO_ACCEPT = [
  'audio/*',
  ...Object.keys(AUDIO_EXTENSION_MIME).map((ext) => `.${ext}`),
].join(',')

/** Formatos preferidos para gravação, em ordem de prioridade. */
const RECORDING_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

/** Primeiro formato de gravação suportado pelo navegador, ou `undefined` para o padrão dele. */
export function pickRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined
  }
  return RECORDING_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

/** Extensão de arquivo adequada para um MIME type de áudio. */
export function extensionForMimeType(mimeType: string): string {
  const base = mimeType.split(';')[0].trim().toLowerCase()
  switch (base) {
    case 'audio/webm':
    case 'video/webm':
      return 'webm'
    case 'audio/mp4':
    case 'audio/x-m4a':
    case 'audio/m4a':
    case 'video/mp4':
      return 'm4a'
    case 'audio/ogg':
    case 'application/ogg':
      return 'ogg'
    case 'audio/wav':
    case 'audio/wave':
    case 'audio/x-wav':
      return 'wav'
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3'
    case 'audio/aac':
      return 'aac'
    case 'audio/flac':
    case 'audio/x-flac':
      return 'flac'
    default:
      return 'webm'
  }
}

/** Nome legível do formato para exibição (ex.: `WEBM`). */
export function formatLabel(extension: string): string {
  return extension.toUpperCase()
}

/** Verifica pela extensão e pelo MIME type se o arquivo parece ser um áudio aceito. */
export function isAcceptedAudioFile(file: Pick<File, 'name' | 'type'>): boolean {
  const ext = getExtension(file.name)
  if (ext && ext in AUDIO_EXTENSION_MIME) return true
  return file.type.startsWith('audio/')
}

/** MIME type efetivo de um arquivo importado (alguns sistemas não informam o tipo). */
export function resolveMimeType(file: Pick<File, 'name' | 'type'>): string {
  if (file.type.startsWith('audio/')) return file.type
  const ext = getExtension(file.name)
  return AUDIO_EXTENSION_MIME[ext] ?? (file.type || 'application/octet-stream')
}

/** Formata bytes em uma unidade legível. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

export class AudioProbeError extends Error {
  readonly kind: 'unsupported' | 'timeout'

  constructor(kind: 'unsupported' | 'timeout', message: string) {
    super(message)
    this.name = 'AudioProbeError'
    this.kind = kind
  }
}

const PROBE_TIMEOUT_MS = 20_000

/**
 * Carrega os metadados do áudio em um elemento <audio> isolado para confirmar que o
 * navegador consegue reproduzi-lo e descobrir sua duração.
 *
 * Arquivos WebM gerados pelo MediaRecorder costumam não declarar a duração
 * (`duration === Infinity`). Nesse caso, posicionamos o cursor no fim do arquivo para
 * forçar o navegador a calculá-la. Retorna `null` se mesmo assim ela não puder ser obtida.
 */
export function probeAudio(blob: Blob): Promise<{ durationSeconds: number | null }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.muted = true

    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      audio.removeAttribute('src')
      audio.load()
      URL.revokeObjectURL(url)
      fn()
    }

    const timer = window.setTimeout(() => {
      finish(() =>
        reject(new AudioProbeError('timeout', 'O navegador demorou demais para ler o arquivo de áudio.')),
      )
    }, PROBE_TIMEOUT_MS)

    const tryResolve = () => {
      const duration = audio.duration
      if (Number.isFinite(duration) && duration > 0) {
        // Lê a duração antes de `finish`, que descarrega o elemento.
        finish(() => resolve({ durationSeconds: duration }))
        return true
      }
      return false
    }

    audio.addEventListener('loadedmetadata', () => {
      if (tryResolve()) return
      // Duração desconhecida: força o cálculo buscando o final do arquivo.
      audio.addEventListener('durationchange', tryResolve)
      audio.addEventListener('seeked', () => {
        if (!tryResolve()) finish(() => resolve({ durationSeconds: null }))
      })
      audio.currentTime = Number.MAX_SAFE_INTEGER
    })

    audio.addEventListener('error', () => {
      finish(() =>
        reject(
          new AudioProbeError(
            'unsupported',
            'O navegador não conseguiu ler este áudio. O formato ou o codec pode não ser suportado.',
          ),
        ),
      )
    })

    audio.src = url
  })
}

/**
 * Decodifica o áudio inteiro em PCM, reamostrado para `sampleRate`.
 * Usa um OfflineAudioContext, que não toca som nem exige interação do usuário.
 */
export async function decodeAudio(blob: Blob, sampleRate: number): Promise<AudioBuffer> {
  const data = await blob.arrayBuffer()
  const context = new OfflineAudioContext({ numberOfChannels: 1, length: 1, sampleRate })
  return context.decodeAudioData(data)
}
