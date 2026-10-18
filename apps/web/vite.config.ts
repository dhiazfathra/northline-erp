import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  // dev: the API (apps/api, --role=all) serves /api; production serves both from one binary
  server: { proxy: { '/api': 'http://localhost:3000' } },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
