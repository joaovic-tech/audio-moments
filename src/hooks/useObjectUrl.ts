import { useEffect, useState } from 'react'

/** Cria uma object URL para o Blob e a revoga quando o Blob muda ou o componente é desmontado. */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  // A object URL é um recurso externo: criá-la e revogá-la no mesmo efeito garante a
  // liberação correta (inclusive no StrictMode), por isso o setState aqui é intencional.
  useEffect(() => {
    if (!blob) {
      // oxlint-disable-next-line react/set-state-in-effect
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    // oxlint-disable-next-line react/set-state-in-effect
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
