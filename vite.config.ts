import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Versão exibida na interface: vem do package.json (SemVer — veja CHANGELOG.md).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: o service worker guarda todos os arquivos do build no aparelho, para o app
    // abrir e funcionar sem internet depois do primeiro acesso. "prompt" = a versão nova
    // só é ativada quando o usuário clica em "Atualizar" (nunca no meio de uma gravação).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // o registro é feito por src/hooks/usePwa.ts
      manifest: {
        id: '/',
        name: 'Audio Moments',
        short_name: 'Audio Moments',
        description:
          'Grave conversas, marque momentos importantes e exporte o projeto. Tudo processado localmente no navegador.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1a1b26',
        background_color: '#1a1b26',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Inclui o pedaço do JSZip (carregado sob demanda), para exportar/importar .zip offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Já no primeiro acesso a página passa a ser controlada pelo service worker; assim
        // "Atualizar" funciona mesmo numa aba aberta antes da primeira instalação.
        clientsClaim: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
