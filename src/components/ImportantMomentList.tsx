import { useDeferredValue, useMemo, useState } from "react";
import { Bookmark, Search, SearchX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportantMomentItem } from "@/components/ImportantMomentItem";
import { Kbd } from "@/components/Kbd";
import {
  MOMENT_SEARCH_MIN_COUNT,
  matchesMomentQuery,
} from "@/lib/momentSearch";
import { cn } from "@/lib/utils";
import type { ImportantMoment } from "@/types/project";

interface ImportantMomentListProps {
  moments: ImportantMoment[];
  editingIds: ReadonlySet<string>;
  focusId: string | null;
  activeId: string | null;
  selectedId: string | null;
  playingRangeId: string | null;
  downloadingId: string | null;
  hasAudio: boolean;
  onToggleRange: (moment: ImportantMoment) => void;
  onAdjust: (moment: ImportantMoment) => void;
  onDownload: (moment: ImportantMoment) => void;
  onEdit: (moment: ImportantMoment) => void;
  onSave: (
    moment: ImportantMoment,
    values: Pick<ImportantMoment, "name" | "observation">,
  ) => void;
  onCancel: (moment: ImportantMoment) => void;
  onDelete: (moment: ImportantMoment) => void;
  className?: string;
}

/** Lista cronológica dos momentos importantes do áudio atual. */
export function ImportantMomentList({
  moments,
  editingIds,
  focusId,
  activeId,
  selectedId,
  playingRangeId,
  downloadingId,
  hasAudio,
  onToggleRange,
  onAdjust,
  onDownload,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  className,
}: ImportantMomentListProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const showSearch = moments.length >= MOMENT_SEARCH_MIN_COUNT;
  const activeQuery = showSearch ? deferredQuery.trim() : "";

  // Momentos em edição continuam visíveis mesmo sem corresponder à busca
  // (por exemplo, uma marcação recém-criada, ainda sem nome).
  const visible = useMemo(
    () =>
      moments
        .map((moment, index) => ({ moment, index }))
        .filter(
          ({ moment }) =>
            !activeQuery ||
            editingIds.has(moment.id) ||
            matchesMomentQuery(moment, activeQuery),
        ),
    [activeQuery, editingIds, moments],
  );
  const isFiltering = activeQuery !== "";

  return (
    // No desktop, o card tem altura máxima da viewport e a lista rola dentro dele,
    // sem obrigar a página inteira a rolar.
    <Card className={cn("lg:min-h-0", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="size-4 text-muted-foreground" />
          Momentos importantes
        </CardTitle>
        <CardDescription>
          Em ordem cronológica. Clique no tempo para ouvir o trecho de cada
          momento.
        </CardDescription>
        <CardAction>
          <Badge
            variant="secondary"
            className="font-mono tabular-nums"
            aria-label={
              isFiltering
                ? `${visible.length} de ${moments.length} marcações`
                : `${moments.length} marcações`
            }
          >
            {isFiltering
              ? `${visible.length}/${moments.length}`
              : moments.length}
          </Badge>
        </CardAction>
      </CardHeader>

      {showSearch && (
        <div className="relative px-(--card-spacing)">
          <Search
            className="pointer-events-none absolute top-1/2 left-[calc(var(--card-spacing)+0.625rem)] size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Buscar nos momentos..."
            aria-label="Buscar nos momentos por título ou observação"
            autoComplete="off"
            className="h-9 pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute top-1/2 right-[calc(var(--card-spacing)+0.375rem)] -translate-y-1/2"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              title="Limpar busca"
            >
              <X />
            </Button>
          )}
        </div>
      )}

      <CardContent className="scrollbar-subtle lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
        {moments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-highlight/15 text-highlight-strong light:bg-lime-100">
              <Bookmark className="size-5" />
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium">Nenhum momento marcado</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Durante a gravação ou a reprodução, clique em{" "}
                <strong>“Marcar momento importante”</strong>
                <span className="hidden sm:inline">
                  {" "}
                  ou pressione <Kbd>M</Kbd>
                </span>{" "}
                para registrar o instante atual. Depois, dê um nome a ele.
              </p>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center"
            role="status"
          >
            <SearchX className="size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum momento encontrado</p>
            <p className="max-w-xs text-sm wrap-break-word text-muted-foreground">
              Nada corresponde a “{activeQuery}” nos títulos ou observações.
            </p>
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Limpar busca
            </Button>
          </div>
        ) : (
          <ol className="grid gap-2" aria-label="Momentos importantes">
            {visible.map(({ moment, index }) => (
              <ImportantMomentItem
                key={moment.id}
                moment={moment}
                index={index}
                isEditing={editingIds.has(moment.id)}
                isActive={moment.id === activeId}
                isSelected={moment.id === selectedId}
                isPlayingRange={moment.id === playingRangeId}
                isDownloading={moment.id === downloadingId}
                autoFocus={moment.id === focusId}
                hasAudio={hasAudio}
                onToggleRange={() => onToggleRange(moment)}
                onAdjust={() => onAdjust(moment)}
                onDownload={() => onDownload(moment)}
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
  );
}
