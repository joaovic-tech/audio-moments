import { useEffect, useState } from 'react'

/**
 * Indica se um elemento está visível na viewport (IntersectionObserver).
 *
 * Retorna um callback ref: funciona mesmo quando o elemento só é montado depois
 * (por exemplo, o botão de marcação, que aparece apenas durante a gravação ou a reprodução).
 */
export function useIsVisible<T extends Element>(): [ref: (element: T | null) => void, isVisible: boolean] {
  const [element, setElement] = useState<T | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.5 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  // Sem elemento montado, não há botão visível.
  return [setElement, element !== null && isVisible]
}
