import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatTime } from '@/lib/time'
import type { ImportantMoment } from '@/types/project'

export const MOMENT_NAME_MAX_LENGTH = 120
export const MOMENT_OBSERVATION_MAX_LENGTH = 5000

interface ImportantMomentFormProps {
  moment: ImportantMoment
  autoFocus?: boolean
  onSave: (values: Pick<ImportantMoment, 'name' | 'observation'>) => void
  onCancel: () => void
}

/** Formulário de nome (obrigatório) e observação (opcional) de uma marcação. */
export function ImportantMomentForm({ moment, autoFocus = false, onSave, onCancel }: ImportantMomentFormProps) {
  const id = useId()
  const isNew = !moment.name
  const [name, setName] = useState(moment.name)
  const [observation, setObservation] = useState(moment.observation)
  const [nameError, setNameError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus({ preventScroll: false })
  }, [autoFocus])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Informe o nome do momento importante.')
      nameRef.current?.focus()
      return
    }
    onSave({ name: trimmed, observation: observation.trim() })
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onCancel()
        }
      }}
      className="grid gap-3"
      noValidate
      aria-label={isNew ? 'Nova marcação' : `Editar marcação ${moment.name}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-mono tabular-nums">
          {formatTime(moment.timeSeconds)}
        </Badge>
        {isNew ? 'Nova marcação' : 'Editando marcação'}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-name`}>
          Nome do momento <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          ref={nameRef}
          id={`${id}-name`}
          value={name}
          maxLength={MOMENT_NAME_MAX_LENGTH}
          placeholder="Ex.: Definição do orçamento"
          required
          aria-required="true"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${id}-name-error` : undefined}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value)
            if (nameError && event.target.value.trim()) setNameError(null)
          }}
        />
        {nameError && (
          <p id={`${id}-name-error`} className="text-xs font-medium text-destructive" role="alert">
            {nameError}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-observation`}>
          Observação <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id={`${id}-observation`}
          value={observation}
          maxLength={MOMENT_OBSERVATION_MAX_LENGTH}
          rows={3}
          placeholder="Detalhes sobre este momento"
          onChange={(event) => setObservation(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X />
          {isNew ? 'Descartar marcação' : 'Cancelar'}
        </Button>
        <Button type="submit">
          <Check />
          Salvar
        </Button>
      </div>
    </form>
  )
}
