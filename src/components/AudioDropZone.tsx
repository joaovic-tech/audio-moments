import { useId, useRef, useState, type DragEvent } from 'react'
import { FileAudio, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AUDIO_ACCEPT } from '@/services/audioService'
import { cn } from '@/lib/utils'

interface AudioDropZoneProps {
  /** Lendo/validando o arquivo escolhido. */
  busy?: boolean
  disabled?: boolean
  onFile: (file: File) => void
  className?: string
}

/**
 * Área de "arrastar e soltar" para abrir um arquivo de áudio direto do estado vazio,
 * sem passar pelo diálogo "Importar projeto". Também aceita o .zip exportado.
 */
export function AudioDropZone({ busy = false, disabled = false, onFile, className }: AudioDropZoneProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isDisabled = disabled || busy

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    if (isDisabled) return
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed p-4 text-center transition-colors sm:flex-row sm:text-left',
        'light:border-slate-300 light:bg-slate-50',
        isDragging
          ? 'border-highlight bg-highlight/10 light:border-accent-line light:bg-lime-50'
          : 'hover:border-ring/60 hover:bg-muted/30 light:hover:border-slate-400 light:hover:bg-white',
        isDisabled && 'pointer-events-none opacity-60',
        className,
      )}
      onDragOver={(event) => {
        event.preventDefault()
        if (!isDisabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors light:bg-slate-200/70 light:text-slate-600',
          isDragging && 'bg-highlight text-highlight-foreground light:bg-highlight light:text-highlight-foreground',
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : <FileAudio className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {busy ? 'Lendo o arquivo…' : isDragging ? 'Solte para abrir o áudio' : 'Importar arquivo de áudio'}
        </p>
        <p className="text-xs text-muted-foreground light:text-slate-600">
          Arraste aqui ou escolha um <span className="font-mono">.mp3</span>, <span className="font-mono">.wav</span>,{' '}
          <span className="font-mono">.m4a</span>, WebM ou OGG. Também abre o <span className="font-mono">.zip</span>{' '}
          exportado.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isDisabled}
        aria-describedby={`${id}-hint`}
      >
        <Upload />
        Escolher arquivo
      </Button>
      <span id={`${id}-hint`} className="sr-only">
        Abre um arquivo de áudio para ouvir e marcar momentos
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={`${AUDIO_ACCEPT},.zip,application/zip`}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        disabled={isDisabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
    </div>
  )
}
