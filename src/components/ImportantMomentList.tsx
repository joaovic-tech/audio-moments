import { Bookmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImportantMomentItem } from '@/components/ImportantMomentItem'
import { Kbd } from '@/components/Kbd'
import type { ImportantMoment } from '@/types/project'

interface ImportantMomentListProps {
  moments: ImportantMoment[]
  editingIds: ReadonlySet<string>
  focusId: string | null
  activeId: string | null
  canPlay: boolean
  onPlay: (moment: ImportantMoment) => void
  onEdit: (moment: ImportantMoment) => void
  onSave: (moment: ImportantMoment, values: Pick<ImportantMoment, 'name' | 'observation'>) => void
  onCancel: (moment: ImportantMoment) => void
  onDelete: (moment: ImportantMoment) => void
}

/** Lista cronológica dos momentos importantes do áudio atual. */
export function ImportantMomentList({
  moments,
  editingIds,
  focusId,
  activeId,
  canPlay,
  onPlay,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: ImportantMomentListProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="size-4 text-muted-foreground" />
          Momentos importantes
        </CardTitle>
        <CardDescription>Em ordem cronológica. Clique no tempo para ouvir a partir dele.</CardDescription>
        <CardAction>
          <Badge variant="secondary" aria-label={`${moments.length} marcações`}>
            {moments.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {moments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-highlight/15 text-highlight-strong">
              <Bookmark className="size-5" />
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">Nenhum momento marcado</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Durante a gravação ou a reprodução, clique em <strong>“Marcar momento importante”</strong>
                <span className="hidden sm:inline">
                  {' '}
                  ou pressione <Kbd>M</Kbd>
                </span>{' '}
                para registrar o instante atual. Depois, dê um nome a ele.
              </p>
            </div>
          </div>
        ) : (
          <ol className="grid gap-2" aria-label="Momentos importantes">
            {moments.map((moment, index) => (
              <ImportantMomentItem
                key={moment.id}
                moment={moment}
                index={index}
                isEditing={editingIds.has(moment.id)}
                isActive={moment.id === activeId}
                autoFocus={moment.id === focusId}
                canPlay={canPlay}
                onPlay={() => onPlay(moment)}
                onEdit={() => onEdit(moment)}
                onSave={(values) => onSave(moment, values)}
                onCancel={() => onCancel(moment)}
                onDelete={() => onDelete(moment)}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
