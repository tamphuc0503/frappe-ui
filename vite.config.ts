import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://oceanfleet.aprilsea.com',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
      },
      '/files': {
        target: 'https://oceanfleet.aprilsea.com',
        changeOrigin: true,
        secure: true,
      },
      '/private': {
        target: 'https://oceanfleet.aprilsea.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
