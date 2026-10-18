import { useCallback, useEffect, useRef, useState } from 'react'
import { pickRecordingMimeType } from '@/services/audioService'
import type { RecorderError, RecorderStatus, RecordingResult } from '@/types/project'

interface UseAudioRecorderOptions {
  /** Chamado quando a gravação é finalizada com dados válidos. */
  onComplete: (result: RecordingResult) => void
  /** Chamado quando a gravação é interrompida por fatores externos (ex.: microfone desconectado). */
  onInterrupted?: (message: string) => void
}

const TIMESLICE_MS = 1000
const TICK_MS = 200

/** Traduz erros do getUserMedia em mensagens claras para o usuário. */
function toRecorderError(error: unknown): RecorderError {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return {
        kind: 'permission-denied',
        message:
          'O acesso ao microfone foi negado. Libere a permissão nas configurações do site (ícone ao lado do endereço) e tente novamente.',
      }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return {
        kind: 'no-device',
        message: 'Nenhum microfone foi encontrado. Conecte um microfone e tente novamente.',
      }
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return {
        kind: 'device-busy',
        message: 'Não foi possível acessar o microfone. Ele pode estar em uso por outro aplicativo.',
      }
    default:
      return {
        kind: 'unknown',
        message: 'Ocorreu um erro inesperado ao acessar o microfone. Tente novamente.',
      }
  }
}

function checkSupport(): RecorderError | null {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      kind: 'insecure-context',
      message: 'A gravação só funciona em conexões seguras (HTTPS) ou em localhost.',
    }
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    return {
      kind: 'unsupported',
      message: 'Este navegador não oferece suporte à gravação de áudio. Use uma versão recente do Chrome, Edge, Firefox ou Safari.',
    }
  }
  return null
}

/**
 * Gravação de áudio pelo microfone com MediaRecorder.
 *
 * O tempo decorrido é contado apenas enquanto o gravador está ativo, de modo que
 * `getElapsedSeconds()` corresponde à posição no áudio final mesmo após pausas.
 */
export function useAudioRecorder({ onComplete, onInterrupted }: UseAudioRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<RecorderError | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const accumulatedMsRef = useRef(0)
  const segmentStartRef = useRef<number | null>(null)
  const discardRef = useRef(false)
  const interruptedRef = useRef(false)
  const tickRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const levelBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const onCompleteRef = useRef(onComplete)
  const onInterruptedRef = useRef(onInterrupted)
  useEffect(() => {
    onCompleteRef.current = onComplete
    onInterruptedRef.current = onInterrupted
  })

  const getElapsedSeconds = useCallback(() => {
    const running = segmentStartRef.current !== null ? performance.now() - segmentStartRef.current : 0
    return (accumulatedMsRef.current + running) / 1000
  }, [])

  const stopTicker = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const startTicker = useCallback(() => {
    stopTicker()
    tickRef.current = window.setInterval(() => setElapsedSeconds(getElapsedSeconds()), TICK_MS)
  }, [getElapsedSeconds, stopTicker])

  const releaseResources = useCallback(() => {
    stopTicker()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    analyserRef.current = null
    levelBufferRef.current = null
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    void wakeLockRef.current?.release().catch(() => undefined)
    wakeLockRef.current = null
  }, [stopTicker])

  /** Congela o cronômetro, somando o trecho em andamento. */
  const freezeClock = useCallback(() => {
    if (segmentStartRef.current !== null) {
      accumulatedMsRef.current += performance.now() - segmentStartRef.current
      segmentStartRef.current = null
    }
    setElapsedSeconds(accumulatedMsRef.current / 1000)
  }, [])

  const start = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return

    const supportError = checkSupport()
    if (supportError) {
      setError(supportError)
      setStatus('error')
      return
    }

    setError(null)
    setStatus('requesting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setError(toRecorderError(err))
      setStatus('error')
      return
    }

    let recorder: MediaRecorder
    try {
      const mimeType = pickRecordingMimeType()
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    } catch {
      stream.getTracks().forEach((track) => track.stop())
      setError({ kind: 'unsupported', message: 'O navegador não conseguiu iniciar o gravador de áudio.' })
      setStatus('error')
      return
    }

    streamRef.current = stream
    recorderRef.current = recorder
    chunksRef.current = []
    discardRef.current = false
    interruptedRef.current = false
    accumulatedMsRef.current = 0

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    })

    recorder.addEventListener('error', () => {
      setError({ kind: 'recording-failed', message: 'A gravação falhou. O áudio capturado até agora foi preservado, se houver.' })
      if (recorder.state !== 'inactive') recorder.stop()
    })

    recorder.addEventListener('stop', () => {
      freezeClock()
      releaseResources()
      recorderRef.current = null
      const chunks = chunksRef.current
      chunksRef.current = []

      if (discardRef.current) {
        discardRef.current = false
        accumulatedMsRef.current = 0
        setElapsedSeconds(0)
        setStatus('idle')
        return
      }

      const mimeType = recorder.mimeType || chunks[0]?.type || 'audio/webm'
      const blob = new Blob(chunks, { type: mimeType })
      if (blob.size === 0) {
        setError({ kind: 'recording-failed', message: 'Nenhum dado de áudio foi capturado. Tente gravar novamente.' })
        setStatus('error')
        return
      }

      setStatus('idle')
      if (interruptedRef.current) {
        onInterruptedRef.current?.('O microfone foi desconectado. A gravação foi finalizada com o que já havia sido capturado.')
      }
      onCompleteRef.current({ blob, mimeType, elapsedSeconds: accumulatedMsRef.current / 1000 })
    })

    // Microfone removido ou permissão revogada durante a gravação.
    stream.getAudioTracks().forEach((track) =>
      track.addEventListener('ended', () => {
        if (recorder.state !== 'inactive') {
          interruptedRef.current = true
          recorder.stop()
        }
      }),
    )

    // Medidor de nível de entrada (apenas visual, processado localmente).
    try {
      const context = new AudioContext()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      audioContextRef.current = context
      analyserRef.current = analyser
      levelBufferRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize))
    } catch {
      // O medidor é opcional; a gravação continua sem ele.
    }

    // Evita que a tela apague durante a gravação em dispositivos móveis.
    navigator.wakeLock
      ?.request('screen')
      .then((sentinel) => {
        wakeLockRef.current = sentinel
      })
      .catch(() => undefined)

    recorder.start(TIMESLICE_MS)
    segmentStartRef.current = performance.now()
    setElapsedSeconds(0)
    setStatus('recording')
    startTicker()
  }, [freezeClock, releaseResources, startTicker])

  const pause = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    recorder.pause()
    freezeClock()
    stopTicker()
    setStatus('paused')
  }, [freezeClock, stopTicker])

  const resume = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return
    recorder.resume()
    segmentStartRef.current = performance.now()
    setStatus('recording')
    startTicker()
  }, [startTicker])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    freezeClock()
    recorder.stop()
  }, [freezeClock])

  /** Interrompe e descarta a gravação em andamento (se houver) e zera o estado. */
  const reset = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      discardRef.current = true
      recorder.stop()
    } else {
      releaseResources()
    }
    segmentStartRef.current = null
    accumulatedMsRef.current = 0
    setElapsedSeconds(0)
    setError(null)
    setStatus('idle')
  }, [releaseResources])

  /** Nível de entrada atual entre 0 e 1. */
  const getLevel = useCallback(() => {
    const analyser = analyserRef.current
    const buffer = levelBufferRef.current
    if (!analyser || !buffer) return 0
    analyser.getByteTimeDomainData(buffer)
    let sum = 0
    for (const value of buffer) {
      const sample = (value - 128) / 128
      sum += sample * sample
    }
    return Math.min(1, Math.sqrt(sum / buffer.length) * 3)
  }, [])

  // Libera microfone e recursos se o componente for desmontado no meio da gravação.
  useEffect(
    () => () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        discardRef.current = true
        recorder.stop()
      }
      releaseResources()
    },
    [releaseResources],
  )

  return {
    status,
    error,
    elapsedSeconds,
    isActive: status === 'recording' || status === 'paused',
    getElapsedSeconds,
    getLevel,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}

export type AudioRecorderControls = ReturnType<typeof useAudioRecorder>
