import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: isProd ? "/birthday-surprise/" : "/",
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5199,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: { host: 'localhost', port: 5199 },
  },
  preview: {
    host: '0.0.0.0',
    port: 4199,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  }
})
