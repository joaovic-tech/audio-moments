import { Download, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ImportExportControlsProps {
  canImport: boolean
  canExport: boolean
  isExporting: boolean
  exportHint: string
  onImport: () => void
  onExport: () => void
}

export function ImportExportControls({
  canImport,
  canExport,
  isExporting,
  exportHint,
  onImport,
  onExport,
}: ImportExportControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={canImport ? -1 : 0} className="inline-flex">
            <Button variant="outline" size="lg" onClick={onImport} disabled={!canImport}>
              <Upload />
              Importar projeto
              <span className="font-mono text-xs text-muted-foreground">.zip</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64">
          Abre um projeto exportado (.zip) ou um áudio com o JSON de marcações.
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* O span mantém o tooltip funcionando com o botão desabilitado. */}
          <span tabIndex={canExport ? -1 : 0} className="inline-flex">
            <Button size="lg" onClick={onExport} disabled={!canExport || isExporting}>
              {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
              Exportar projeto
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{exportHint}</TooltipContent>
      </Tooltip>
    </div>
  )
}
