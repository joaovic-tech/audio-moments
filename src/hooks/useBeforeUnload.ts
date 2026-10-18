import { useEffect } from 'react'

/** Pede confirmação do navegador antes de fechar/recarregar a página quando `enabled`. */
export function useBeforeUnload(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Necessário para navegadores mais antigos.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled])
}
