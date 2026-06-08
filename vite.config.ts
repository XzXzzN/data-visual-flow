/*
 * @Author: Xcracker
 * @Date: 2026-06-09 01:09:43
 * @LastEditors: Xcracker
 * @LastEditTime: 2026-06-09 01:52:37
 * @Descripttion:
 */
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 自动向所有 scss 样式首行注入变量文件（注意：路径一定要写对）
        additionalData: `@use "@/styles/_variables.scss" as *;`
      }
    }
  }
})
