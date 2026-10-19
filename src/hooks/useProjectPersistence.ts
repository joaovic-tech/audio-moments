import { useCallback, useEffect, useRef, useState } from 'react'
import {
  StorageError,
  clearProject,
  isStorageAvailable,
  loadProject,
  saveAudio,
  saveState,
  type StoredProject,
  type StoredProjectState,
} from '@/services/projectStorageService'
import type { Project, ProjectAudio } from '@/types/project'

/** Atraso para salvar edições de texto e o arraste das alças do trecho. */
export const AUTOSAVE_DEBOUNCE_MS = 300

export type PersistenceStatus =
  /** Navegador sem IndexedDB: o projeto fica só na memória da aba. */
  | 'unavailable'
  /** Lendo o projeto salvo ao abrir a página. */
  | 'restoring'
  /** Nada a salvar (projeto vazio). */
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'

interface UseProjectPersistenceOptions {
  project: Project
  /** Recebe o projeto salvo encontrado ao abrir a página. */
  onRestore: (stored: StoredProject) => void
  /** Chamado na primeira falha de gravação (por exemplo, falta de espaço). */
  onError: (error: StorageError) => void
}

function createAudioId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Salva automaticamente o projeto aberto no IndexedDB e o restaura ao abrir a página.
 *
 * - O áudio é gravado uma única vez, sempre que muda (gravação finalizada ou importação).
 * - Nome e marcações são gravados com debounce de 300 ms; pendências são gravadas
 *   imediatamente quando a aba fica oculta ou é fechada.
 * - Um projeto sem áudio (vazio ou com gravação em andamento) apaga o registro salvo.
 */
export function useProjectPersistence({ project, onRestore, onError }: UseProjectPersistenceOptions) {
  const [isRestoring, setIsRestoring] = useState(isStorageAvailable)
  const [status, setStatus] = useState<PersistenceStatus>(() => (isStorageAvailable() ? 'restoring' : 'unavailable'))

  /** Áudio já presente no armazenamento e o id com que foi salvo. */
  const savedAudioRef = useRef<{ audio: ProjectAudio; id: string } | null>(null)
  /** Gravação de estado aguardando o debounce. */
  const pendingRef = useRef<StoredProjectState | null>(null)
  const timerRef = useRef<number | null>(null)
  /** Fila que serializa as escritas, preservando a ordem. */
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const hasReportedErrorRef = useRef(false)
  const onRestoreRef = useRef(onRestore)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onRestoreRef.current = onRestore
    onErrorRef.current = onError
  })

  /** Escritas na fila ou em andamento. */
  const inFlightRef = useRef(0)

  const enqueue = useCallback((task: () => Promise<void>, doneStatus: PersistenceStatus = 'saved') => {
    inFlightRef.current += 1
    setStatus('saving')
    queueRef.current = queueRef.current.then(task).then(
      () => {
        inFlightRef.current -= 1
        // Só atualiza o indicador quando a fila esvazia.
        if (inFlightRef.current === 0) setStatus(doneStatus)
      },
      (error: unknown) => {
        inFlightRef.current -= 1
        setStatus('error')
        if (!hasReportedErrorRef.current) {
          hasReportedErrorRef.current = true
          onErrorRef.current(
            error instanceof StorageError
              ? error
              : new StorageError('unknown', 'Não foi possível salvar o projeto neste navegador.'),
          )
        }
      },
    )
  }, [])

  const cancelTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  /** Grava imediatamente o estado pendente, se houver. */
  const flush = useCallback(() => {
    cancelTimer()
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    enqueue(() => saveState(pending))
  }, [enqueue])

  /* ---------- Restauração ao abrir a página ---------- */

  useEffect(() => {
    if (!isStorageAvailable()) return
    let cancelled = false
    loadProject()
      .then((stored) => {
        if (cancelled) return
        if (stored) {
          savedAudioRef.current = { audio: stored.audio, id: stored.audioId }
          onRestoreRef.current(stored)
          setStatus('saved')
        } else {
          setStatus('idle')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* ---------- Salvamento automático ---------- */

  const { audio, name, moments, hasUnsavedChanges } = project

  useEffect(() => {
    // Não salva antes de terminar a leitura: evitaria sobrescrever o projeto salvo com o estado vazio inicial.
    if (isRestoring || !isStorageAvailable()) return

    if (!audio) {
      // Projeto vazio ou gravação em andamento: não há áudio para guardar.
      pendingRef.current = null
      cancelTimer()
      if (savedAudioRef.current) {
        savedAudioRef.current = null
        enqueue(clearProject, 'idle')
      }
      return
    }

    if (savedAudioRef.current?.audio !== audio) {
      // Áudio novo: grava o arquivo e o estado imediatamente.
      const id = createAudioId()
      savedAudioRef.current = { audio, id }
      pendingRef.current = null
      cancelTimer()
      const state: StoredProjectState = { audioId: id, name, moments, hasUnsavedChanges }
      enqueue(async () => {
        await saveAudio(id, audio)
        await saveState(state)
      })
      return
    }

    pendingRef.current = { audioId: savedAudioRef.current.id, name, moments, hasUnsavedChanges }
    cancelTimer()
    timerRef.current = window.setTimeout(flush, AUTOSAVE_DEBOUNCE_MS)
  }, [audio, name, moments, hasUnsavedChanges, isRestoring, enqueue, flush])

  // Grava o que estiver pendente ao ocultar/fechar a aba e ao desmontar.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush()
    }
  }, [flush])

  /** Apaga o projeto salvo (usado pelo botão "Descartar"). */
  const clear = useCallback(() => {
    if (!isStorageAvailable()) return
    pendingRef.current = null
    cancelTimer()
    savedAudioRef.current = null
    enqueue(clearProject, 'idle')
  }, [enqueue])

  return { status, isRestoring, clear }
}
