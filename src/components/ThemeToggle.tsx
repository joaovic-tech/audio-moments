import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/theme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  className?: string;
}

/** Alterna entre os modos claro e escuro, girando o ícone a cada clique. */
export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  // Mudar a chave remonta o ícone e reinicia a animação a cada clique.
  const [spinKey, setSpinKey] = useState(0);
  const isDark = theme === "dark";
  const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className={cn("rounded-full", className)}
          onClick={() => {
            setSpinKey((key) => key + 1);
            onToggle();
          }}
          aria-label={label}
        >
          <span
            key={spinKey}
            className={cn(
              "inline-flex",
              spinKey > 0 &&
                "animate-spin [animation-duration:600ms] [animation-iteration-count:1] [animation-timing-function:ease-out] motion-reduce:animate-none",
            )}
          >
            {isDark ? <Sun className="size-[1.15rem]" /> : <Moon className="size-[1.15rem]" />}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
