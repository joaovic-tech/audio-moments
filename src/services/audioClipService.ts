import { toSafeFileName } from '@/lib/fileName'
import { formatTime } from '@/lib/time'
import { decodeAudio } from '@/services/audioService'

/** Taxa usada ao decodificar para recortar (qualidade de áudio padrão). */
export const CLIP_SAMPLE_RATE = 48_000
const MAX_CLIP_CHANNELS = 2

export class ClipExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClipExportError'
  }
}

/** Converte o intervalo em segundos para índices de amostra válidos. */
export function getSampleRange(
  startSeconds: number,
  endSeconds: number,
  sampleRate: number,
  totalSamples: number,
): { from: number; to: number } {
  const from = Math.min(totalSamples, Math.max(0, Math.floor(startSeconds * sampleRate)))
  const to = Math.min(totalSamples, Math.max(from, Math.ceil(endSeconds * sampleRate)))
  return { from, to }
}

/** Codifica canais PCM (float −1..1) como WAV PCM 16 bits, intercalando os canais. */
export function encodeWav(channels: Float32Array[], sampleRate: number): Blob {
  const channelCount = channels.length
  const frameCount = channels[0]?.length ?? 0
  const bytesPerSample = 2
  const dataSize = frameCount * channelCount * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // tamanho do bloco fmt
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channelCount * bytesPerSample, true)
  view.setUint16(32, channelCount * bytesPerSample, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let frame = 0; frame < frameCount; frame++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

/** Nome do arquivo do trecho: `<projeto>-<momento>-<hh-mm-ss>.wav`. */
export function clipFileName(projectBaseName: string, momentName: string, startSeconds: number): string {
  const moment = toSafeFileName(momentName, 'momento')
  return `${projectBaseName}-${moment}-${formatTime(startSeconds).replaceAll(':', '-')}.wav`
}

/**
 * Recorta o trecho do áudio e o devolve em WAV.
 *
 * Formatos comprimidos (WebM/Opus, MP3, AAC…) não podem ser cortados com precisão sem
 * recodificar; por isso o trecho é decodificado e salvo como WAV PCM, sem perdas adicionais.
 */
export async function exportAudioClip(blob: Blob, startSeconds: number, endSeconds: number): Promise<Blob> {
  if (!(endSeconds > startSeconds)) {
    throw new ClipExportError('O trecho selecionado é inválido.')
  }

  let buffer: AudioBuffer
  try {
    buffer = await decodeAudio(blob, CLIP_SAMPLE_RATE)
  } catch {
    throw new ClipExportError('Não foi possível decodificar o áudio para recortar o trecho.')
  }

  const { from, to } = getSampleRange(startSeconds, endSeconds, buffer.sampleRate, buffer.length)
  if (to <= from) throw new ClipExportError('O trecho está fora da duração do áudio.')

  const channelCount = Math.min(buffer.numberOfChannels, MAX_CLIP_CHANNELS)
  const channels = Array.from({ length: channelCount }, (_, i) => buffer.getChannelData(i).subarray(from, to))
  return encodeWav(channels, buffer.sampleRate)
}
