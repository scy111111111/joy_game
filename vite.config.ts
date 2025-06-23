import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/game1/', // 替换 'game1' 为你的 GitHub 仓库名
})
