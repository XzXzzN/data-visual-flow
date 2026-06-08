/*
 * @Author: Xcracker
 * @Date: 2026-06-09 02:15:25
 * @LastEditors: Xcracker
 * @LastEditTime: 2026-06-09 02:15:54
 * @Descripttion:
 */
import { defineStore } from 'pinia'

// 定义卡片的数据结构
export interface AlgoCard {
  id: number
  title: string
  description: string
  icon: string
  tags: string[]
  path: string
}

interface CardState {
  cards: AlgoCard[]
  searchQuery: string // 统一由 Store 维护搜索词
}

export const useCardStore = defineStore('card', {
  state: (): CardState => ({
    searchQuery: '',
    // 将原本在页面里的静态卡片配置移入这里
    cards: [
      { id: 1, title: '实时折线图流', description: '支持百万级高频数据实时灌入与断点续连的可视化大屏组件。', icon: 'fa-chart-line', tags: ['网络', '实时'], path: '/visual/line' },
      { id: 2, title: '拓扑架构图', description: '动态展示微服务节点调用拓扑，支持拖拽、高亮与故障溯源。', icon: 'fa-network-wired', tags: ['图论', 'SVG'], path: '/visual/topology' },
      { id: 3, title: '3D 城市大屏', description: '基于 WebGL 的轻量级三维智慧城市渲染，包含光流特效与热力图。', icon: 'fa-city', tags: ['3D', 'WebGL'], path: '/visual/3d' },
      { id: 4, title: '排序算法动效', description: '直观演示冒泡、快排、堆排等算法在内存中的动态演变过程。', icon: 'fa-arrow-up-9-1', tags: ['算法', '基础'], path: '/visual/sort' },
      { id: 5, title: '漏斗与转化率', description: '电商/营销全链路漏斗分析图，动态计算各层级流失率。', icon: 'fa-filter', tags: ['统计', '大屏'], path: '/visual/funnel' },
      { id: 6, title: '系统监控雷达', description: '多维评估服务器 CPU、内存、I/O 吞吐性能的实时雷达图。', icon: 'fa-circle-dot', tags: ['运维', '实时'], path: '/visual/radar' }
    ]
  }),

  getters: {
    /**
     * 核心逻辑：基于当前搜索词过滤后的有效卡片
     */
    filteredCards(state): AlgoCard[] {
      const query = state.searchQuery.trim().toLowerCase()
      if (!query) return state.cards

      return state.cards.filter(card =>
        card.title.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query) ||
        card.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
  },

  actions: {
    // 设置搜索关键词
    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    /**
     * 🚀 预留：未来从后端接口动态获取卡片列表
     */
    async fetchRemoteCards() {
      try {
        // const response = await api.get('/api/algo-cards')
        // this.cards = response.data
      } catch (error) {
        console.error('Failed to load cards:', error)
      }
    }
  }
})
