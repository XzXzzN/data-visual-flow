/*
 * @Author: Xcracker
 * @Date: 2026-06-09 01:45:28
 * @LastEditors: Xcracker
 * @LastEditTime: 2026-06-09 01:47:07
 * @Descripttion:
 */
import { defineStore } from 'pinia'

// 定义颜色方案接口
interface ColorScheme {
  themeColor: string;  // 主题色（大背景、导航栏、主要文字等）
  btnColor: string;    // 按钮颜色（高亮按钮、交互元素等）
  btnHoverColor: string; // 按钮悬浮颜色（提升交互体验）
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // 7 种精心搭配的极客/可视化风格配色方案
    schemes: [
      { themeColor: '#0f172a', btnColor: '#38bdf8', btnHoverColor: '#7dd3fc' }, // 方案 1：深海极客蓝 + 霓虹天蓝
      { themeColor: '#1e1b4b', btnColor: '#a855f7', btnHoverColor: '#c084fc' }, // 方案 2：神秘幻境紫 + 魅惑浅紫
      { themeColor: '#064e3b', btnColor: '#10b981', btnHoverColor: '#34d399' }, // 方案 3：赛博翡翠绿 + 荧光绿
      { themeColor: '#1c1917', btnColor: '#f97316', btnHoverColor: '#fb923c' }, // 方案 4：曜石工业黑 + 活力熔岩橙
      { themeColor: '#0f172a', btnColor: '#e11d48', btnHoverColor: '#fb7185' }, // 方案 5：科技暗夜黑 + 警告魅惑红
      { themeColor: '#172554', btnColor: '#eab308', btnHoverColor: '#fde047' }, // 方案 6：深邃星空蓝 + 警示极光黄
      { themeColor: '#111827', btnColor: '#06b6d4', btnHoverColor: '#22d3ee' }  // 方案 7：宇宙原力灰 + 电光青
    ] as ColorScheme[],
    currentScheme: null as ColorScheme | null | undefined
  }),

  actions: {
    // 核心逻辑：随机选择一种方案，并通过原生 DOM 注入 CSS 变量
    initRandomTheme() {
      const randomIndex = Math.floor(Math.random() * this.schemes.length)
      const selected = this.schemes[randomIndex] as ColorScheme
      this.currentScheme = selected

      // 将颜色作为全局 CSS 变量注入到 html 根节点
      const root = document.documentElement
      root.style.setProperty('--theme-color', selected.themeColor)
      root.style.setProperty('--btn-color', selected.btnColor)
      root.style.setProperty('--btn-hover-color', selected.btnHoverColor)
    }
  }
})
