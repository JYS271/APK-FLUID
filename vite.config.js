import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ARK-FLUID 관제 앱 — 모바일 프로토타입
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
