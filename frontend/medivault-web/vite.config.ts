import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:50970',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:50970',
        changeOrigin: true,
      },
    },
  },
})
