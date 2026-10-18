import { useCallback, useEffect, useRef, useState } from 'react'

export const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75] as const

/**
 * Controla um elemento <audio> (que deve receber `audioRef`) e expõe o estado de reprodução.
 *
 * @param src URL do áudio atual (object URL), ou `null` quando não há áudio.
 * @param fallbackDuration Duração conhecida por outro meio, usada enquanto o elemento
 *   ainda não informa uma duração finita (comum em WebM gerado pelo MediaRecorder).
 */
export function useAudioPlayer(src: string | null, fallbackDuration: number | null) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [elementDuration, setElementDuration] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const fixingDurationRef = useRef(false)
  /** Instante em que a reprodução de um trecho deve parar. */
  const stopAtRef = useRef<number | null>(null)
  /** Identifica o trecho em reprodução (ex.: id do momento). */
  const [rangeKey, setRangeKey] = useState<string | null>(null)
  const [currentSrc, setCurrentSrc] = useState(src)

  /** Pausa ao chegar ao fim do trecho em reprodução. */
  const stopAtRangeEnd = (audio: HTMLAudioElement) => {
    const stopAt = stopAtRef.current
    if (stopAt !== null && !audio.paused && audio.currentTime >= stopAt) {
      audio.pause()
      audio.currentTime = stopAt
      setCurrentTime(stopAt)
    }
  }

  // Reinicia o estado quando o áudio muda (ajuste durante a renderização).
  if (src !== currentSrc) {
    setCurrentSrc(src)
    setIsPlaying(false)
    setCurrentTime(0)
    setElementDuration(null)
    setIsReady(false)
    setError(null)
    setRangeKey(null)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const readDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setElementDuration(audio.duration)
        if (fixingDurationRef.current) {
          fixingDurationRef.current = false
          audio.currentTime = 0
        }
      }
    }

    const onLoadedMetadata = () => {
      fixingDurationRef.current = false
      setIsReady(true)
      if (Number.isFinite(audio.duration)) {
        readDuration()
      } else {
        // Força o navegador a calcular a duração de arquivos sem esse metadado.
        fixingDurationRef.current = true
        audio.currentTime = Number.MAX_SAFE_INTEGER
      }
    }
    const onTimeUpdate = () => {
      if (fixingDurationRef.current) return
      setCurrentTime(audio.currentTime)
      stopAtRangeEnd(audio)
    }
    const onSeeked = () => {
      if (fixingDurationRef.current) {
        // Alguns navegadores só atualizam a duração depois do seek.
        readDuration()
        if (fixingDurationRef.current) {
          fixingDurationRef.current = false
          audio.currentTime = 0
        }
        return
      }
      setCurrentTime(audio.currentTime)
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => {
      setIsPlaying(false)
      stopAtRef.current = null
      setRangeKey(null)
    }
    const onEnded = onPause
    const onRateChange = () => setPlaybackRate(audio.playbackRate)
    const onError = () => {
      if (!audio.getAttribute('src')) return
      setIsPlaying(false)
      setError('Não foi possível reproduzir este áudio neste navegador.')
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('durationchange', readDuration)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('seeked', onSeeked)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('ratechange', onRateChange)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('durationchange', readDuration)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('seeked', onSeeked)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('ratechange', onRateChange)
      audio.removeEventListener('error', onError)
    }
  }, [])

  // Atualização suave da posição enquanto toca (timeupdate dispara só ~4x por segundo).
  useEffect(() => {
    if (!isPlaying) return
    let frame = 0
    const loop = () => {
      const audio = audioRef.current
      if (audio && !fixingDurationRef.current) {
        setCurrentTime(audio.currentTime)
        stopAtRangeEnd(audio)
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying])

  const duration = elementDuration ?? fallbackDuration ?? 0

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !src) return
    try {
      await audio.play()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError('Não foi possível iniciar a reprodução.')
    }
  }, [src])

  const pause = useCallback(() => audioRef.current?.pause(), [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void play()
    else audio.pause()
  }, [play])

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current
      if (!audio || !src) return
      const max = duration > 0 ? duration : Number.POSITIVE_INFINITY
      const target = Math.min(Math.max(0, time), max)
      fixingDurationRef.current = false
      stopAtRef.current = null
      setRangeKey(null)
      audio.currentTime = target
      setCurrentTime(target)
    },
    [duration, src],
  )

  const skip = useCallback((delta: number) => seek((audioRef.current?.currentTime ?? 0) + delta), [seek])

  const playFrom = useCallback(
    (time: number) => {
      seek(time)
      void play()
    },
    [play, seek],
  )

  /** Toca apenas o trecho `[start, end]`, parando automaticamente no fim. */
  const playRange = useCallback(
    (start: number, end: number, key: string) => {
      seek(start)
      stopAtRef.current = end
      setRangeKey(key)
      void play()
    },
    [play, seek],
  )

  /** Alterna entre tocar e pausar o trecho identificado por `key`. */
  const toggleRange = useCallback(
    (start: number, end: number, key: string) => {
      const audio = audioRef.current
      if (audio && !audio.paused && rangeKey === key) audio.pause()
      else playRange(start, end, key)
    },
    [playRange, rangeKey],
  )

  const cycleRate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const index = PLAYBACK_RATES.indexOf(audio.playbackRate as (typeof PLAYBACK_RATES)[number])
    audio.playbackRate = PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]
  }, [])

  /** Posição exata do elemento no instante da chamada. */
  const getCurrentTime = useCallback(() => audioRef.current?.currentTime ?? 0, [])

  return {
    audioRef,
    isPlaying,
    isReady,
    currentTime,
    duration,
    error,
    playbackRate,
    play,
    pause,
    toggle,
    seek,
    skip,
    playFrom,
    playRange,
    toggleRange,
    /** Chave do trecho em reprodução, ou `null`. */
    playingRangeKey: isPlaying ? rangeKey : null,
    cycleRate,
    getCurrentTime,
  }
}

export type AudioPlayerControls = ReturnType<typeof useAudioPlayer>
