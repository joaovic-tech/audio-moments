import { describe, expect, it } from 'vitest'
import { clipFileName, encodeWav, getSampleRange } from './audioClipService'
import { computePeaks } from './waveformService'

describe('getSampleRange', () => {
  it('converte segundos em amostras dentro dos limites', () => {
    expect(getSampleRange(1, 2, 48000, 480000)).toEqual({ from: 48000, to: 96000 })
    expect(getSampleRange(-1, 20, 1000, 5000)).toEqual({ from: 0, to: 5000 })
    expect(getSampleRange(10, 12, 1000, 5000)).toEqual({ from: 5000, to: 5000 })
  })
})

describe('encodeWav', () => {
  it('gera um WAV PCM 16 bits com cabeçalho correto', async () => {
    const left = new Float32Array([0, 1, -1, 0.5])
    const right = new Float32Array([0, -1, 1, -0.5])
    const blob = encodeWav([left, right], 8000)
    expect(blob.type).toBe('audio/wav')
    const view = new DataView(await blob.arrayBuffer())
    const text = (offset: number) => String.fromCharCode(...new Uint8Array(view.buffer, offset, 4))

    expect(text(0)).toBe('RIFF')
    expect(text(8)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(2) // canais
    expect(view.getUint32(24, true)).toBe(8000) // taxa
    expect(view.getUint16(34, true)).toBe(16) // bits
    expect(view.getUint32(40, true)).toBe(4 * 2 * 2) // dados
    expect(view.byteLength).toBe(44 + 16)
    // Quadro 1 intercalado: esquerda = 1 → 32767, direita = −1 → −32768
    expect(view.getInt16(48, true)).toBe(32767)
    expect(view.getInt16(50, true)).toBe(-32768)
  })
})

describe('clipFileName', () => {
  it('combina projeto, momento e tempo de início em um nome seguro', () => {
    expect(clipFileName('reuniao-com-cliente', 'Definição do orçamento', 37.5)).toBe(
      'reuniao-com-cliente-definicao-do-orcamento-00-00-37.wav',
    )
    expect(clipFileName('projeto', '', 0)).toBe('projeto-momento-00-00-00.wav')
  })
})

describe('computePeaks', () => {
  it('calcula picos normalizados por intervalo', () => {
    const sampleRate = 100
    const channel = new Float32Array(200) // 2 s
    channel[10] = 0.5
    channel[150] = -0.25
    const { peaks, peaksPerSecond } = computePeaks([channel], sampleRate)
    expect(peaksPerSecond).toBeCloseTo(50)
    expect(peaks.length).toBe(100)
    expect(Math.max(...peaks)).toBe(1)
    expect(peaks[5]).toBe(1) // amostra 10 → pico 5
    expect(peaks[75]).toBeCloseTo(0.5) // amostra 150 → 0.25 / 0.5
  })
})
