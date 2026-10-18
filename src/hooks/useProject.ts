import { useCallback, useMemo, useReducer } from 'react'
import { createMomentId } from '@/lib/id'
import { roundSeconds } from '@/lib/time'
import type { ImportantMoment, Project, ProjectAudio } from '@/types/project'

type Action =
  | { type: 'setName'; name: string }
  | { type: 'clearContent' }
  | { type: 'setRecordedAudio'; audio: ProjectAudio }
  | { type: 'loadImported'; audio: ProjectAudio; name: string; moments: ImportantMoment[] }
  | { type: 'addMoment'; moment: ImportantMoment }
  | { type: 'updateMoment'; id: string; changes: Pick<ImportantMoment, 'name' | 'observation'> }
  | { type: 'deleteMoment'; id: string }
  | { type: 'markSaved' }

const initialProject: Project = {
  name: '',
  audio: null,
  moments: [],
  hasUnsavedChanges: false,
}

const byTime = (a: ImportantMoment, b: ImportantMoment) => a.timeSeconds - b.timeSeconds

/** Garante que nenhuma marcação fique além do fim do áudio. */
function clampMoments(moments: ImportantMoment[], duration: number | null): ImportantMoment[] {
  if (duration === null) return moments
  return moments.map((moment) =>
    moment.timeSeconds > duration ? { ...moment, timeSeconds: roundSeconds(duration) } : moment,
  )
}

function reducer(state: Project, action: Action): Project {
  switch (action.type) {
    case 'setName':
      return { ...state, name: action.name, hasUnsavedChanges: state.audio !== null || state.moments.length > 0 }
    case 'clearContent':
      return { ...state, audio: null, moments: [], hasUnsavedChanges: false }
    case 'setRecordedAudio':
      return {
        ...state,
        audio: action.audio,
        moments: clampMoments(state.moments, action.audio.durationSeconds).sort(byTime),
        hasUnsavedChanges: true,
      }
    case 'loadImported':
      return {
        name: action.name,
        audio: action.audio,
        moments: [...action.moments].sort(byTime),
        hasUnsavedChanges: false,
      }
    case 'addMoment':
      return { ...state, moments: [...state.moments, action.moment].sort(byTime), hasUnsavedChanges: true }
    case 'updateMoment':
      return {
        ...state,
        moments: state.moments.map((moment) => (moment.id === action.id ? { ...moment, ...action.changes } : moment)),
        hasUnsavedChanges: true,
      }
    case 'deleteMoment':
      return { ...state, moments: state.moments.filter((moment) => moment.id !== action.id), hasUnsavedChanges: true }
    case 'markSaved':
      return { ...state, hasUnsavedChanges: false }
  }
}

/** Estado do projeto aberto: nome, áudio e marcações. */
export function useProject() {
  const [project, dispatch] = useReducer(reducer, initialProject)

  const setName = useCallback((name: string) => dispatch({ type: 'setName', name }), [])
  const clearContent = useCallback(() => dispatch({ type: 'clearContent' }), [])
  const setRecordedAudio = useCallback((audio: ProjectAudio) => dispatch({ type: 'setRecordedAudio', audio }), [])
  const loadImported = useCallback(
    (audio: ProjectAudio, name: string, moments: ImportantMoment[]) =>
      dispatch({ type: 'loadImported', audio, name, moments }),
    [],
  )
  /** Cria uma marcação sem nome no tempo informado e retorna seu id. */
  const addMoment = useCallback((timeSeconds: number) => {
    const moment: ImportantMoment = {
      id: createMomentId(),
      timeSeconds: roundSeconds(Math.max(0, timeSeconds)),
      name: '',
      observation: '',
    }
    dispatch({ type: 'addMoment', moment })
    return moment.id
  }, [])
  const updateMoment = useCallback(
    (id: string, changes: Pick<ImportantMoment, 'name' | 'observation'>) =>
      dispatch({ type: 'updateMoment', id, changes }),
    [],
  )
  const deleteMoment = useCallback((id: string) => dispatch({ type: 'deleteMoment', id }), [])
  const markSaved = useCallback(() => dispatch({ type: 'markSaved' }), [])

  const hasContent = project.audio !== null || project.moments.length > 0

  return useMemo(
    () => ({
      project,
      hasContent,
      setName,
      clearContent,
      setRecordedAudio,
      loadImported,
      addMoment,
      updateMoment,
      deleteMoment,
      markSaved,
    }),
    [project, hasContent, setName, clearContent, setRecordedAudio, loadImported, addMoment, updateMoment, deleteMoment, markSaved],
  )
}
