import type { ReactNode, Ref } from "react";
import { Bookmark, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/Kbd";
import { cn } from "@/lib/utils";

interface MarkMomentButtonProps {
  disabled: boolean;
  /** Bloqueio temporário logo após uma marcação. */
  locked: boolean;
  onClick: () => void;
  children: ReactNode;
  showShortcut?: boolean;
  className?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}

/** Botão de destaque para marcar momentos, com bloqueio visual de alguns segundos após o clique. */
export function MarkMomentButton({
  disabled,
  locked,
  onClick,
  children,
  showShortcut = false,
  className,
  buttonRef,
}: MarkMomentButtonProps) {
  return (
    <Button
      ref={buttonRef}
      size="lg"
      className={cn(
        "relative overflow-hidden rounded-xl bg-highlight text-base font-semibold text-highlight-foreground shadow-sm hover:bg-highlight/90",
        locked && "disabled:opacity-80",
        // No modo claro, o estado "Momento marcado" continua verde (não usa o cinza de desabilitado).
        locked &&
          "light:disabled:border-accent-outline light:disabled:bg-highlight light:disabled:text-highlight-foreground light:disabled:opacity-90",
        className,
      )}
      disabled={disabled || locked}
      onClick={onClick}
      aria-keyshortcuts="M"
    >
      {locked ? (
        <>
          <Check className="size-5" />
          Momento marcado
          {/* Barra que esvazia durante o bloqueio */}
          <span
            className="animate-mark-cooldown absolute inset-x-0 bottom-0 h-1 origin-left bg-highlight-foreground/40"
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <Bookmark className="size-5" />
          {children}
          {showShortcut && <Kbd className="hidden sm:inline-flex">M</Kbd>}
        </>
      )}
    </Button>
  );
}
