import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base precisa bater com o nome do repositório no GitHub Pages (projeto, não usuário)
export default defineConfig({
  base: '/kmsquad/',
  plugins: [react()],
})
