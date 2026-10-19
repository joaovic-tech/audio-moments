import { useCallback, useEffect, useState } from "react";
import { applyTheme, getStoredTheme, getSystemTheme, storeTheme, type Theme } from "@/lib/theme";

/**
 * Tema claro/escuro. Segue o sistema operacional até o usuário escolher um tema;
 * a partir daí, a escolha fica salva neste navegador.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme());
  const [hasChoice, setHasChoice] = useState(() => getStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sem escolha explícita, acompanha mudanças do tema do sistema.
  useEffect(() => {
    if (hasChoice) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(query.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [hasChoice]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      storeTheme(next);
      return next;
    });
    setHasChoice(true);
  }, []);

  return { theme, toggleTheme };
}
