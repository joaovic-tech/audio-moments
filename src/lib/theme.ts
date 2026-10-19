export type Theme = "light" | "dark";

/** Chave no localStorage. Também usada pelo script inline do index.html. */
export const THEME_STORAGE_KEY = "audio-moments:theme";

/** Tema escolhido pelo usuário, ou `null` se ele ainda não escolheu. */
export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Sem armazenamento disponível (ex.: navegação privada): o tema vale só nesta visita.
  }
}

export function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}
