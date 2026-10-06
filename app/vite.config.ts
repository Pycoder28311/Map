import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { SITE_URL } from './src/config.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  server: {
    // IPv4 loopback: on this machine "localhost" resolves to IPv6 only, and Firefox opens the
    // dev WebSocket over IPv4. Tauri's devUrl uses the same address.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true, // fail instead of moving to another port (Tauri expects 5173)
    // Dev only: the website calls its own origin (/api/...), forwarded to the live Worker.
    // In production the Worker serves the website itself, so /api is the same origin there too.
    proxy: {
      '/api': { target: SITE_URL, changeOrigin: true },
    },
  },
})
