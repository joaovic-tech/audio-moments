import { decodeAudio } from '@/services/audioService'

/** Picos (amplitude máxima absoluta, 0–1) em intervalos regulares do áudio. */
export interface WaveformData {
  peaks: Float32Array
  /** Quantos picos existem por segundo de áudio. */
  peaksPerSecond: number
}

/** Acima destes limites a forma de onda não é calculada (memória em celulares). */
export const WAVEFORM_MAX_BYTES = 150 * 1024 * 1024
export const WAVEFORM_MAX_SECONDS = 2 * 60 * 60

const MAX_PEAKS = 200_000
const MAX_PEAKS_PER_SECOND = 50
/** Taxa baixa basta para desenhar a forma de onda e economiza memória na decodificação. */
const WAVEFORM_SAMPLE_RATES = [8000, 22050]

/** Calcula os picos combinando todos os canais. */
export function computePeaks(channels: Float32Array[], sampleRate: number): WaveformData {
  const length = channels[0]?.length ?? 0
  const duration = length / sampleRate
  const peaksPerSecond = duration > 0 ? Math.min(MAX_PEAKS_PER_SECOND, MAX_PEAKS / duration) : MAX_PEAKS_PER_SECOND
  const peakCount = Math.max(1, Math.ceil(duration * peaksPerSecond))
  const samplesPerPeak = length / peakCount
  const peaks = new Float32Array(peakCount)

  let globalMax = 0
  for (let i = 0; i < peakCount; i++) {
    const from = Math.floor(i * samplesPerPeak)
    const to = Math.min(length, Math.floor((i + 1) * samplesPerPeak))
    let max = 0
    for (const channel of channels) {
      for (let s = from; s < to; s++) {
        const value = Math.abs(channel[s])
        if (value > max) max = value
      }
    }
    peaks[i] = max
    if (max > globalMax) globalMax = max
  }

  // Normaliza para que gravações baixas continuem visíveis.
  if (globalMax > 0) {
    for (let i = 0; i < peakCount; i++) peaks[i] /= globalMax
  }

  return { peaks, peaksPerSecond: peakCount / (duration || 1) }
}

/** Decodifica o áudio e calcula a forma de onda. Retorna `null` se o arquivo for grande demais. */
export async function loadWaveform(blob: Blob, durationHint: number | null): Promise<WaveformData | null> {
  if (blob.size > WAVEFORM_MAX_BYTES) return null
  if (durationHint !== null && durationHint > WAVEFORM_MAX_SECONDS) return null

  let lastError: unknown
  for (const sampleRate of WAVEFORM_SAMPLE_RATES) {
    try {
      const buffer = await decodeAudio(blob, sampleRate)
      const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i))
      return computePeaks(channels, buffer.sampleRate)
    } catch (error) {
      // Alguns navegadores não aceitam taxas de amostragem baixas; tenta a próxima.
      lastError = error
    }
  }
  throw lastError
}
