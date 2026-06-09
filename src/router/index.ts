/*
 * @Author: Xcracker
 * @Date: 2026-06-09 01:09:43
 * @LastEditors: Xcracker
 * @LastEditTime: 2026-06-10 00:19:00
 * @Descripttion:
 */
import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/components/layouts/mainLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MainLayout,
      redirect: '/index',
      // 可以在路由组件里动态绑定 props
      props: (route) => ({
        showTop: route.meta.showTop !== false,
        showSide: route.meta.showSide !== false
      }),
      children: [
        {
          path: 'index',
          name: 'Index',// 注意：此处的 name 必须与组件内的 defineOptions({ name: 'AnalysisView' }) 完全一致，Keep-Alive 才能生效
          component: () => import('@/views/index/index.vue'),
          meta: {
            title: '探索首页',
            showTop: true,  // 首页需要顶部导航
            showSide: false // 首页根据 VisuAlgo 风格，不需要侧边栏，撑满展示
          }
        },
        {
          path: 'flowDesigner',
          name: 'FlowDesigner',
          component: () => import('@/views/flowDesigner/flowDesigner.vue'),
          meta: {
            title: '程序流程图',
            showTop: true,
            showSide: true
          }
        }
      ]
    }
  ]
})

export default router
