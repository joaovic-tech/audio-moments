import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatBytes } from '@/services/audioService'
import { cn } from '@/lib/utils'

interface FilePickerProps {
  label: ReactNode
  hint: ReactNode
  accept: string
  file: File | null
  icon: ReactNode
  disabled?: boolean
  onChange: (file: File | null) => void
}

/** Campo de seleção de arquivo com suporte a arrastar e soltar. */
export function FilePicker({ label, hint, accept, file, icon, disabled = false, onChange }: FilePickerProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const dropped = event.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-dashed p-3 transition-colors',
          isDragging && 'border-ring bg-muted/60',
          file && 'border-solid bg-muted/30',
          disabled && 'opacity-50',
        )}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate text-sm font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            disabled={disabled}
            aria-label={`Remover ${file.name}`}
          >
            <X />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Upload />
            Escolher
          </Button>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  )
}
