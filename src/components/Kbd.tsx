import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** Indicação visual de atalho de teclado. */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center rounded border border-current/25 px-1 font-mono text-[0.7rem] font-medium opacity-80',
        className,
      )}
      {...props}
    />
  )
}
