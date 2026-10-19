import { useCallback, useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/** Evento do Chrome/Edge que permite abrir o diálogo "Instalar app" pelo próprio site. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Abas que ficam abertas por muito tempo procuram uma versão nova a cada hora. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Registra o service worker (app disponível offline) e expõe:
 * - `offlineReady`: o app acabou de ser guardado no navegador e já abre sem internet;
 * - `needRefresh`: há uma versão nova esperando; `update()` ativa e recarrega a página;
 * - `canInstall`/`install()`: botão "Instalar app" (Chrome, Edge e Android).
 */
export function usePwa() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      window.setInterval(() => {
        if (registration.installing || !navigator.onLine) return;
        registration.update().catch(() => {
          // Sem conexão ou servidor indisponível: tenta de novo na próxima hora.
        });
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error("Não foi possível ativar o modo offline.", error);
    },
  });

  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // Guarda o evento para o botão "Instalar app" (no lugar da barra automática do Chrome).
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // O evento só pode ser usado uma vez; o navegador dispara outro se fizer sentido.
    setInstallEvent(null);
  }, [installEvent]);

  const update = useCallback(async () => {
    // Recarrega assim que a versão nova assumir a página. O workbox só faz isso sozinho
    // quando a aba já abriu controlada pelo service worker (não na primeira visita).
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true },
    );
    await updateServiceWorker(true);
  }, [updateServiceWorker]);

  const dismissOfflineReady = useCallback(
    () => setOfflineReady(false),
    [setOfflineReady],
  );
  const dismissUpdate = useCallback(
    () => setNeedRefresh(false),
    [setNeedRefresh],
  );

  return {
    offlineReady,
    needRefresh,
    canInstall: installEvent !== null,
    install,
    update,
    dismissOfflineReady,
    dismissUpdate,
  };
}
