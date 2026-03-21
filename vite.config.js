import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,               // 0.0.0.0
    port: 5173,
    hmr: { host: '26.170.174.77' },
    proxy: {
      '/api': {
        target: 'https://26.170.174.77:8080',
        changeOrigin: true,
        secure: false,
        timeout: 120000,
        proxyTimeout: 120000,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Connection', 'keep-alive');
          });
        }
      },
      '/ws': {
        target: 'https://26.170.174.77:8080',
        changeOrigin: true,
        ws: true,
        secure: false
      },
      '/rtc': {
        target: 'https://26.170.174.77:7443',
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname }
  }
})
