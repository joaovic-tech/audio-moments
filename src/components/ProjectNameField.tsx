import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { defaultProjectName } from '@/lib/fileName'
import { cn } from '@/lib/utils'

export const PROJECT_NAME_MAX_LENGTH = 100

interface ProjectNameFieldProps {
  value: string
  onChange: (name: string) => void
  exportFileName: string
  /** Versão compacta, usada no cabeçalho do projeto com áudio carregado. */
  compact?: boolean
  className?: string
}

/** Campo "Nome da gravação", com o nome do arquivo usado na exportação. */
export function ProjectNameField({
  value,
  onChange,
  exportFileName,
  compact = false,
  className,
}: ProjectNameFieldProps) {
  return (
    <div className={cn('grid min-w-0', compact ? 'gap-1' : 'gap-2', className)}>
      <Label
        htmlFor="project-name"
        className={cn(compact && 'text-xs font-normal text-muted-foreground light:font-medium light:text-foreground')}
      >
        Nome da gravação
      </Label>
      <Input
        id="project-name"
        value={value}
        maxLength={PROJECT_NAME_MAX_LENGTH}
        placeholder={defaultProjectName()}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby="project-name-hint"
        autoComplete="off"
        className={cn(compact ? 'h-9 text-base font-medium md:text-base' : 'h-10')}
      />
      <p
        id="project-name-hint"
        className={cn('truncate text-xs text-muted-foreground', compact && 'sr-only')}
        title={exportFileName}
      >
        Usado na exportação: <span className="font-mono text-foreground/80">{exportFileName}</span>
      </p>
    </div>
  )
}
