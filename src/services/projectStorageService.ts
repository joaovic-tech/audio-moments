import type { AudioSource, ImportantMoment, ProjectAudio } from '@/types/project'

/*
 * Persistência local do projeto aberto no IndexedDB do navegador.
 *
 * O projeto é guardado em dois registros do mesmo object store:
 *  - `audio`: o arquivo de áudio bruto (Blob/File, sem Base64) e seus metadados;
 *  - `state`: nome da gravação e marcações (JSON), regravado a cada edição.
 * Assim, editar um nome ou arrastar uma alça não reescreve o áudio inteiro.
 * O `state` guarda o `audioId` do áudio a que pertence, para detectar registros
 * de projetos diferentes (por exemplo, uma gravação de áudio que falhou).
 */

const DB_NAME = 'audio-moments'
const DB_VERSION = 1
const STORE_NAME = 'current-project'
const AUDIO_KEY = 'audio'
const STATE_KEY = 'state'

/** Versão do formato dos registros. Registros de outra versão são ignorados. */
export const STORAGE_SCHEMA_VERSION = 1

interface StoredAudioRecord {
  schema: number
  id: string
  /** Blob na maioria dos navegadores; ArrayBuffer quando o navegador não aceita Blob no IndexedDB. */
  data: Blob | ArrayBuffer
  mimeType: string
  extension: string
  source: AudioSource
  originalFileName?: string
  durationSeconds: number | null
}

export interface StoredProjectState {
  audioId: string
  name: string
  moments: ImportantMoment[]
  /** Há alterações que ainda não foram exportadas para .zip. */
  hasUnsavedChanges: boolean
}

interface StoredStateRecord extends StoredProjectState {
  schema: number
  savedAt: number
}

export interface StoredProject extends StoredProjectState {
  audio: ProjectAudio
}

export class StorageError extends Error {
  readonly kind: 'unavailable' | 'quota' | 'unknown'

  constructor(kind: 'unavailable' | 'quota' | 'unknown', message: string) {
    super(message)
    this.name = 'StorageError'
    this.kind = kind
  }
}

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

/* ---------- Validação dos registros lidos ---------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Mantém apenas marcações bem formadas (o registro pode ter sido alterado fora da aplicação). */
export function parseStoredMoments(value: unknown): ImportantMoment[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): ImportantMoment[] => {
    if (!isRecord(item)) return []
    const { id, timeSeconds, startSeconds, endSeconds, name, observation } = item
    if (typeof id !== 'string' || !id) return []
    if (!isTime(timeSeconds) || !isTime(startSeconds) || !isTime(endSeconds) || endSeconds <= startSeconds) return []
    return [
      {
        id,
        timeSeconds,
        startSeconds,
        endSeconds,
        name: typeof name === 'string' ? name : '',
        observation: typeof observation === 'string' ? observation : '',
      },
    ]
  })
}

/** Converte os registros lidos em um projeto, ou `null` se não houver áudio válido. */
export function parseStoredProject(audioValue: unknown, stateValue: unknown): StoredProject | null {
  if (!isRecord(audioValue) || audioValue.schema !== STORAGE_SCHEMA_VERSION) return null
  const { id, data, mimeType, extension, source, originalFileName, durationSeconds } = audioValue
  if (typeof id !== 'string' || typeof mimeType !== 'string' || typeof extension !== 'string') return null
  if (source !== 'recording' && source !== 'import') return null

  let blob: Blob
  if (data instanceof Blob) blob = data
  else if (data instanceof ArrayBuffer) blob = new Blob([data], { type: mimeType })
  else return null
  if (blob.size === 0) return null

  const audio: ProjectAudio = {
    blob,
    mimeType,
    extension,
    source,
    durationSeconds: isTime(durationSeconds) ? durationSeconds : null,
    ...(typeof originalFileName === 'string' ? { originalFileName } : {}),
  }

  // Sem estado (ou estado de outro áudio): restaura apenas o áudio.
  const state =
    isRecord(stateValue) && stateValue.schema === STORAGE_SCHEMA_VERSION && stateValue.audioId === id
      ? stateValue
      : null

  return {
    audio,
    audioId: id,
    name: typeof state?.name === 'string' ? state.name : '',
    moments: parseStoredMoments(state?.moments),
    hasUnsavedChanges: state?.hasUnsavedChanges === true,
  }
}

/* ---------- Acesso ao IndexedDB ---------- */

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!isStorageAvailable()) {
    return Promise.reject(
      new StorageError('unavailable', 'Este navegador não oferece armazenamento local (IndexedDB).'),
    )
  }
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => {
      const db = request.result
      // Outra aba atualizou o banco: fecha esta conexão para não bloqueá-la.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(new StorageError('unavailable', 'Não foi possível abrir o armazenamento local do navegador.'))
    }
    request.onblocked = () => {
      dbPromise = null
      reject(new StorageError('unavailable', 'O armazenamento local está bloqueado por outra aba desta aplicação.'))
    }
  })
  return dbPromise
}

function toStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new StorageError('quota', 'O navegador não tem espaço suficiente para salvar este projeto.')
  }
  return new StorageError('unknown', 'Não foi possível salvar o projeto neste navegador.')
}

/** Executa operações em uma transação e resolve quando ela for concluída. */
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb()
  return new Promise<T | undefined>((resolve, reject) => {
    let result: T | undefined
    let tx: IDBTransaction
    try {
      tx = db.transaction(STORE_NAME, mode)
      const request = run(tx.objectStore(STORE_NAME))
      if (request) request.onsuccess = () => (result = request.result)
    } catch (error) {
      // `put` lança DataCloneError de forma síncrona quando o valor não pode ser clonado.
      reject(error)
      return
    }
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error ?? new Error('Falha na transação do IndexedDB.'))
    tx.onabort = () => reject(tx.error ?? new Error('Transação do IndexedDB cancelada.'))
  })
}

function isDataCloneError(error: unknown) {
  return error instanceof DOMException && error.name === 'DataCloneError'
}

/** Salva o arquivo de áudio bruto. Chamado apenas quando o áudio do projeto muda. */
export async function saveAudio(id: string, audio: ProjectAudio): Promise<void> {
  const record = (data: Blob | ArrayBuffer): StoredAudioRecord => ({
    schema: STORAGE_SCHEMA_VERSION,
    id,
    data,
    mimeType: audio.mimeType,
    extension: audio.extension,
    source: audio.source,
    durationSeconds: audio.durationSeconds,
    ...(audio.originalFileName ? { originalFileName: audio.originalFileName } : {}),
  })
  try {
    try {
      await withStore('readwrite', (store) => store.put(record(audio.blob), AUDIO_KEY))
    } catch (error) {
      // Navegadores antigos (Safari < 14) não armazenam Blob no IndexedDB.
      if (!isDataCloneError(error)) throw error
      const buffer = await audio.blob.arrayBuffer()
      await withStore('readwrite', (store) => store.put(record(buffer), AUDIO_KEY))
    }
  } catch (error) {
    throw toStorageError(error)
  }
}

/** Salva o nome e as marcações do projeto (registro leve, regravado a cada edição). */
export async function saveState(state: StoredProjectState): Promise<void> {
  const record: StoredStateRecord = {
    schema: STORAGE_SCHEMA_VERSION,
    savedAt: Date.now(),
    audioId: state.audioId,
    name: state.name,
    // Cópia simples: o IndexedDB clona o valor, mas evita levar campos extras.
    moments: state.moments.map(({ id, timeSeconds, startSeconds, endSeconds, name, observation }) => ({
      id,
      timeSeconds,
      startSeconds,
      endSeconds,
      name,
      observation,
    })),
    hasUnsavedChanges: state.hasUnsavedChanges,
  }
  try {
    await withStore('readwrite', (store) => store.put(record, STATE_KEY))
  } catch (error) {
    throw toStorageError(error)
  }
}

/** Lê o projeto salvo, ou `null` se não houver um projeto válido. */
export async function loadProject(): Promise<StoredProject | null> {
  const db = await openDb()
  const [audioValue, stateValue] = await new Promise<[unknown, unknown]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const audioRequest = store.get(AUDIO_KEY)
    const stateRequest = store.get(STATE_KEY)
    tx.oncomplete = () => resolve([audioRequest.result, stateRequest.result])
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  return parseStoredProject(audioValue, stateValue)
}

/** Remove o projeto salvo (botão "Descartar" ou início de uma nova gravação). */
export async function clearProject(): Promise<void> {
  try {
    await withStore('readwrite', (store) => {
      store.delete(AUDIO_KEY)
      store.delete(STATE_KEY)
    })
  } catch (error) {
    throw toStorageError(error)
  }
}
