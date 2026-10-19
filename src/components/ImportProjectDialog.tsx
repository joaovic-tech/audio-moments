import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  FileAudio,
  FileJson,
  Loader2,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilePicker } from "@/components/FilePicker";
import { AUDIO_ACCEPT, formatLabel } from "@/services/audioService";
import {
  ImportError,
  isZipFile,
  prepareImport,
  type ImportPreview,
} from "@/services/projectImportService";
import { formatTime } from "@/lib/time";

interface ImportProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (preview: ImportPreview) => void;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "ready"; preview: ImportPreview }
  | { status: "error"; message: string };

function MessageList({ items }: { items: string[] }) {
  return (
    <ul className="flex max-h-32 list-disc flex-col gap-0.5 overflow-y-auto pl-4 text-xs">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** Seleção e validação de um áudio (obrigatório) e do JSON de marcações (opcional). */
export function ImportProjectDialog({
  open,
  onOpenChange,
  onImport,
}: ImportProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        {/* O conteúdo é desmontado ao fechar, o que zera a seleção automaticamente. */}
        <ImportProjectForm
          onCancel={() => onOpenChange(false)}
          onImport={onImport}
        />
      </DialogContent>
    </Dialog>
  );
}

function ImportProjectForm({
  onCancel,
  onImport,
}: {
  onCancel: () => void;
  onImport: (preview: ImportPreview) => void;
}) {
  const [highlightFile, sethighlightFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const requestRef = useRef(0);

  // Descarta resultados de análises que terminarem depois de o diálogo fechar.
  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  const isZip = highlightFile !== null && isZipFile(highlightFile);

  const analyze = (nexthighlight: File | null, nextJson: File | null) => {
    sethighlightFile(nexthighlight);
    setJsonFile(nextJson);
    const request = ++requestRef.current;
    if (!nexthighlight) {
      setAnalysis({ status: "idle" });
      return;
    }
    setAnalysis({ status: "analyzing" });
    prepareImport({
      highlightFile: nexthighlight,
      jsonFile: isZipFile(nexthighlight) ? null : nextJson,
    })
      .then((preview) => {
        if (request === requestRef.current)
          setAnalysis({ status: "ready", preview });
      })
      .catch((error: unknown) => {
        if (request !== requestRef.current) return;
        const message =
          error instanceof ImportError
            ? error.message
            : "Não foi possível ler os arquivos selecionados.";
        setAnalysis({ status: "error", message });
      });
  };

  const preview = analysis.status === "ready" ? analysis.preview : null;
  const importLabel = !preview
    ? "Importar"
    : preview.jsonErrors
      ? "Importar apenas o áudio"
      : preview.moments.length > 0
        ? `Importar com ${preview.moments.length} ${preview.moments.length === 1 ? "marcação" : "marcações"}`
        : "Importar áudio";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Importar projeto</DialogTitle>
        <DialogDescription>
          Carregue um áudio existente para ouvir e marcar momentos. Os arquivos
          são lidos apenas neste navegador.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <FilePicker
          label={
            <>
              Arquivo de áudio <span className="text-destructive">*</span>
            </>
          }
          hint="WAV, MP3, M4A, WebM, OGG… ou o .zip exportado por esta aplicação. Arraste aqui ou escolha."
          accept={`${AUDIO_ACCEPT},.zip,application/zip`}
          file={highlightFile}
          icon={<FileAudio className="size-4" />}
          onChange={(file) => analyze(file, jsonFile)}
        />
        <FilePicker
          label={
            <>
              Marcações (JSON){" "}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </>
          }
          hint={
            isZip
              ? "O JSON será lido de dentro do ZIP."
              : "Arquivo momentos-importantes.json exportado anteriormente."
          }
          accept=".json,application/json"
          file={isZip ? null : jsonFile}
          icon={<FileJson className="size-4" />}
          disabled={isZip}
          onChange={(file) => analyze(highlightFile, file)}
        />

        {analysis.status === "analyzing" && (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" />
            Verificando arquivos…
          </p>
        )}

        {analysis.status === "error" && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Áudio inválido</AlertTitle>
            <AlertDescription>{analysis.message}</AlertDescription>
          </Alert>
        )}

        {preview && (
          <div className="grid gap-3" role="status">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium wrap-break-word">
                {preview.projectName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatLabel(preview.audio.extension)}
                {preview.audio.durationSeconds !== null &&
                  ` · ${formatTime(preview.audio.durationSeconds)}`}
                {" · "}
                {preview.jsonErrors
                  ? "sem marcações"
                  : `${preview.moments.length} ${preview.moments.length === 1 ? "marcação" : "marcações"}`}
                {preview.fromZip && " · lido do ZIP"}
              </p>
            </div>

            {preview.jsonErrors && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>
                  JSON inválido: as marcações não serão carregadas
                </AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <MessageList items={preview.jsonErrors} />
                  <p className="text-xs">
                    Você ainda pode importar o áudio e criar novas marcações.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {preview.warnings.length > 0 && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Avisos</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <MessageList items={preview.warnings} />
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={!preview}
          onClick={() => preview && onImport(preview)}
        >
          <Upload />
          {importLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
