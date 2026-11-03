import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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
  ],
})
