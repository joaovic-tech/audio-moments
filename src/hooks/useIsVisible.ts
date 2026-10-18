import { useEffect, useState, type RefObject } from 'react'

/** Indica se o elemento está visível na viewport (IntersectionObserver). */
export function useIsVisible(ref: RefObject<Element | null>): boolean {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.5 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return isVisible
}
