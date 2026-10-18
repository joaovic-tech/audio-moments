import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface ConfirmOptions {
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

interface ConfirmDialogProps {
  options: ConfirmOptions | null
  onClose: () => void
}

/** Diálogo de confirmação reutilizável para ações destrutivas ou que substituem dados. */
export function ConfirmDialog({ options, onClose }: ConfirmDialogProps) {
  return (
    <AlertDialog open={options !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        {options && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{options.cancelLabel ?? 'Cancelar'}</AlertDialogCancel>
              <AlertDialogAction
                variant={options.destructive ? 'destructive' : 'default'}
                onClick={() => {
                  options.onConfirm()
                  onClose()
                }}
              >
                {options.confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
