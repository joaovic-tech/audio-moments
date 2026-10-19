import { Circle, Loader2, Pause, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecorderStatus } from "@/types/project";

interface RecordingControlsProps {
  status: RecorderStatus;
  hasAudio: boolean;
  hasContent: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onDiscard: () => void;
}

export function RecordingControls({
  status,
  hasAudio,
  hasContent,
  isProcessing,
  onStart,
  onPause,
  onResume,
  onStop,
  onDiscard,
}: RecordingControlsProps) {
  const isActive = status === "recording" || status === "paused";

  if (status === "requesting") {
    return (
      <div className="flex justify-center">
        <Button size="lg" disabled className="h-11 px-5">
          <Loader2 className="animate-spin" />
          Aguardando permissão do microfone…
        </Button>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex justify-center">
        <Button size="lg" disabled className="h-11 px-5">
          <Loader2 className="animate-spin" />
          Processando gravação…
        </Button>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {status === "recording" ? (
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-4"
            onClick={onPause}
          >
            <Pause />
            Pausar
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-4"
            onClick={onResume}
          >
            <Play />
            Retomar
          </Button>
        )}
        <Button size="lg" className="h-11 px-4" onClick={onStop}>
          <Square className="fill-current" />
          Finalizar
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="h-11 px-4"
          onClick={onDiscard}
        >
          <Trash2 />
          Descartar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        size="lg"
        variant={hasAudio ? "outline" : "default"}
        className="h-11 px-5"
        onClick={onStart}
      >
        <Circle className="fill-highlight-foreground text-highlight-foreground" />
        {hasAudio ? "Nova gravação" : "Iniciar gravação"}
      </Button>
      {hasContent && (
        <Button
          size="lg"
          variant="destructive"
          className="h-11 px-4"
          onClick={onDiscard}
        >
          <Trash2 />
          Descartar
        </Button>
      )}
    </div>
  );
}
