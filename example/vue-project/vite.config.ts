import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import testPlug from '../../src/index'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),testPlug()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
