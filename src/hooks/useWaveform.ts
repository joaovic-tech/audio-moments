import { useEffect, useState } from 'react'
import { loadWaveform, type WaveformData } from '@/services/waveformService'

export type WaveformState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: WaveformData }
  | { status: 'unavailable' }

const initialState = (blob: Blob | null): WaveformState => (blob ? { status: 'loading' } : { status: 'idle' })

/** Calcula (localmente) a forma de onda do áudio atual. */
export function useWaveform(blob: Blob | null, durationHint: number | null): WaveformState {
  const [state, setState] = useState<WaveformState>(() => initialState(blob))
  const [currentBlob, setCurrentBlob] = useState(blob)

  // Novo áudio: volta ao estado de carregamento (ajuste durante a renderização).
  if (blob !== currentBlob) {
    setCurrentBlob(blob)
    setState(initialState(blob))
  }

  useEffect(() => {
    if (!blob) return
    let cancelled = false
    loadWaveform(blob, durationHint)
      .then((data) => {
        if (!cancelled) setState(data ? { status: 'ready', data } : { status: 'unavailable' })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' })
      })
    return () => {
      cancelled = true
    }
  }, [blob, durationHint])

  return state
}
