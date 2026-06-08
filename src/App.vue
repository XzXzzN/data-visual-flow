<!--
 * @Author: Xcracker
 * @Date: 2026-06-09 01:09:43
 * @LastEditors: Xcracker
 * @LastEditTime: 2026-06-09 01:47:51
 * @Descripttion:
-->
<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

// 在组件挂载前、甚至路由加载前就确定颜色，防止页面闪烁
onBeforeMount(() => {
  themeStore.initRandomTheme()
})
</script>

<template>
  <router-view />
</template>

<style lang="scss">
/* 你原有的全局样式 */
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  /* 直接将背景色绑定为随机出来的主题色 */
  background-color: var(--theme-color);
  transition: background-color 0.5s ease; /* 顺滑过渡 */
}
</style>
