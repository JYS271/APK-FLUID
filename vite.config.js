import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ARK-FLUID 관제 앱 — 모바일 프로토타입
// base './' → GitHub Pages 서브경로(/APK-FLUID/)·로컬 파일 모두에서 자산 로드
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
