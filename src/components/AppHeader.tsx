import type { ReactNode } from "react";
import { AudioLines } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Theme } from "@/lib/theme";

interface AppHeaderProps {
  actions: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
}

export function AppHeader({ actions, theme, onToggleTheme }: AppHeaderProps) {
  // Fundo quase opaco: textos grandes (como o cronômetro) não "vazam" borrados ao rolar.
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 shadow-xs backdrop-blur-md supports-backdrop-filter:bg-background/90 light:bg-white/95 light:shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-highlight text-highlight-foreground light:ring-1 light:ring-accent-outline">
            <AudioLines className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="flex items-center gap-1.5 font-semibold tracking-tight">
              Audio Moments
              <Badge
                variant="outline"
                className="h-[18px] px-1.5 font-mono text-[10px] font-medium text-muted-foreground"
                title={`Versão ${__APP_VERSION__}`}
              >
                v{__APP_VERSION__}
              </Badge>
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">Grave conversas e marque o que importa</p>
          </div>
        </div>

        {/* Celular: o seletor de tema fica na primeira linha e as ações descem para a segunda. */}
        <div className="order-3 w-full sm:order-2 sm:ml-auto sm:w-auto">{actions}</div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} className="order-2 ml-auto sm:order-3 sm:ml-0" />
      </div>
    </header>
  );
}
