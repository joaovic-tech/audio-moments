import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface InlineEditableTextProps {
  value: string
  /** Rótulo acessível do campo (ex.: "Nome do momento"). */
  label: string
  /** Conteúdo exibido fora da edição. Por padrão, o próprio texto. */
  children?: ReactNode
  multiline?: boolean
  /** Campo obrigatório: confirmar vazio descarta a edição. */
  required?: boolean
  maxLength?: number
  placeholder?: string
  onCommit: (value: string) => void
  className?: string
  /** Classes do contêiner durante a edição (padrão: as mesmas de `className`). */
  editingClassName?: string
}

/**
 * Texto que vira campo ao ser clicado (edição rápida, sem abrir o formulário completo).
 *
 * - Enter confirma (em campos de várias linhas: Ctrl/⌘ + Enter); sair do campo também confirma.
 * - Esc cancela e restaura o texto anterior.
 */
export function InlineEditableText({
  value,
  label,
  children,
  multiline = false,
  required = false,
  maxLength,
  placeholder,
  onCommit,
  className,
  editingClassName,
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  /** Evita confirmar no `blur` que acontece logo após um Esc. */
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!isEditing) return
    const field = fieldRef.current
    if (!field) return
    field.focus()
    // Cursor no fim do texto, como em um editor.
    const end = field.value.length
    field.setSelectionRange(end, end)
  }, [isEditing])

  const start = () => {
    cancelledRef.current = false
    setDraft(value)
    setIsEditing(true)
  }

  const finish = (commit: boolean) => {
    setIsEditing(false)
    // Devolve o foco ao texto para quem navega pelo teclado.
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
    if (!commit) return
    const next = draft.trim()
    if (required && !next) return
    if (next !== value.trim()) onCommit(next)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      cancelledRef.current = true
      finish(false)
      return
    }
    if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      cancelledRef.current = true
      finish(true)
    }
  }

  if (isEditing) {
    const common = {
      ref: fieldRef,
      value: draft,
      maxLength,
      placeholder,
      'aria-label': label,
      onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
      onKeyDown: handleKeyDown,
      onBlur: () => {
        if (!cancelledRef.current) finish(true)
      },
    }
    return (
      <div className={cn('grid gap-1', editingClassName ?? className)}>
        {multiline ? (
          <Textarea {...common} rows={2} className="min-h-14 resize-none text-sm md:text-sm" />
        ) : (
          <Input {...common} className="h-8 text-sm font-medium md:text-sm" autoComplete="off" />
        )}
        <p className="text-[11px] text-muted-foreground">
          {multiline ? 'Ctrl + Enter para salvar' : 'Enter para salvar'} · Esc para cancelar
        </p>
      </div>
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={start}
      title={value ? 'Clique para editar' : `Adicionar ${label.toLowerCase()}`}
      aria-label={`${label}: ${value || placeholder || 'vazio'}. Clique para editar.`}
      className={cn(
        '-mx-1 cursor-text rounded-md px-1 text-left transition-colors outline-none hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring/60 light:hover:bg-slate-200/60',
        className,
      )}
    >
      {children ?? value}
    </button>
  )
}
