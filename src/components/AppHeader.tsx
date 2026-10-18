import type { ReactNode } from 'react'
import { AudioLines } from 'lucide-react'

export function AppHeader({ actions }: { actions: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AudioLines className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">Audio Moments</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Grave conversas e marque o que importa</p>
          </div>
        </div>
        {actions}
      </div>
    </header>
  )
}
