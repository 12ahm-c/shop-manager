import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'lucide-react', 'axios'],
          socket: ['socket.io-client'],
          i18n: ['react-i18next', 'i18next']
        }
      }
    }
  }
})
