import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

// base precisa bater com o nome do repositório no GitHub Pages (projeto, não usuário)
export default defineConfig({
  base: '/kmsquad/',
  plugins: [
    // @meshtastic/core arrasta o tslog, que acessa process/Buffer/util do Node
    // sem checar se existem. Isso não existe no navegador, então precisamos
    // injetar esses globais e shims aqui antes de qualquer código rodar.
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
    react(),
    // Service worker que guarda o app em si (HTML/JS/CSS) no cache do
    // navegador — depois do primeiro carregamento, abre mesmo sem sinal.
    // Os tiles do mapa (online por enquanto, ver docs/decisoes.md) NÃO
    // entram nesse cache ainda — isso é a próxima parte da Fase 4.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KM-TAK',
        short_name: 'KM-TAK',
        description: 'Rastreamento de squad para airsoft via rádios Meshtastic',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/kmsquad/',
        scope: '/kmsquad/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Os tiles de mapa vêm de hosts externos (OpenTopoMap/Esri/OSM) —
        // não precache, só o app shell (HTML/JS/CSS) local.
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
})
