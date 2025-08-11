import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Note: We can't import the config here due to TypeScript compilation order,
// so we keep the port hardcoded in vite.config.ts
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8002', // Keep hardcoded as vite config runs before TS compilation
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
