<template>
  <div class="visualgo-page-wrapper">
    <div class="floating-search-bar">
      <div class="search-content-inner">
        <h1 class="main-title">
          数据可视化探索<span>.</span>
        </h1>
        <p class="subtitle">输入你想要探索的数据流、图表类型或算法逻辑</p>

        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            v-model="cardStore.searchQuery"
            type="text"
            placeholder="搜索关键词... 例如: 折线图, 拓扑排序, 实时数据流"
          />
          <button class="search-btn">搜索</button>
        </div>
      </div>
    </div>

    <div class="scrollable-cards-area">
      <div class="cards-limit-container">
        <div class="grid-container">
          <div
            v-for="card in cardStore.filteredCards"
            :key="card.id"
            class="algo-card"
            @click="navigateToDetail(card.path)"
          >
            <div class="card-preview">
              <div class="geometric-shape" :style="{ transform: `rotate(${card.id * 45}deg)` }"></div>
              <i :class="['fa-solid', card.icon, 'card-main-icon']"></i>
            </div>

            <div class="card-content">
              <h3 class="card-title">{{ card.title }}</h3>
              <p class="card-desc">{{ card.description }}</p>
              <div class="card-tags">
                <span v-for="tag in card.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="cardStore.filteredCards.length === 0" class="empty-state">
          <i class="fa-solid fa-inbox"></i>
          <p>没有找到匹配的模块，换个关键词试试吧？</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCardStore } from '@/stores/card'

defineOptions({
  name: 'AnalysisView'
})

const router = useRouter()
const cardStore = useCardStore()

const navigateToDetail = (path: string) => {
  router.push(path)
}
</script>

<style scoped lang="scss">
/* 这里的 $theme-color, $btn-color 已由 Vite 全局加载 */

// 页面根容器：撑满 MainLayout 的可用高度，禁止根级滚动
.visualgo-page-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 减去 MainLayout 的 padding (20px * 2) 和外壳计算，精准占满内部 */
  height: calc(100vh - 60px - 40px);
  overflow: hidden;
}

/* ================= 1. 浮动/固定搜索区 ================= */
.floating-search-bar {
  background-color: #0b0f19; /* 匹配主背景色 */
  padding-bottom: 30px;
  z-index: 10;
  flex-shrink: 0; /* 确保不被挤压 */
  border-bottom: 1px solid rgba(#334155, 0.3); /* 隐约的分隔线 */

  .search-content-inner {
    max-width: 1200px;
    margin: 0 auto;
    text-align: center;
  }

  .main-title {
    font-size: 2.6rem;
    font-weight: 800;
    margin: 10px 0 8px 0;
    letter-spacing: -1px;

    span {
      color: $btn-color;
    }
  }

  .subtitle {
    color: #64748b;
    font-size: 1rem;
    margin-bottom: 25px;
  }

  .search-box {
    display: flex;
    align-items: center;
    max-width: 600px;
    margin: 0 auto;
    background-color: #1e293b;
    border: 2px solid #334155;
    border-radius: 50px;
    padding: 5px 5px 5px 20px;
    transition: all 0.3s ease;

    &:focus-within {
      border-color: $btn-color;
      box-shadow: 0 0 15px rgba($btn-color, 0.25);
    }

    .search-icon {
      color: #64748b;
      margin-right: 12px;
    }

    input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f8fafc;
      font-size: 1rem;
      &::placeholder { color: #475569; }
    }

    .search-btn {
      background-color: $btn-color;
      color: #ffffff;
      border: none;
      padding: 8px 24px;
      border-radius: 50px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.2s;
      &:hover { background-color: $btn-hover-color; }
    }
  }
}

/* ================= 2. 独立滚动的卡片区 ================= */
.scrollable-cards-area {
  flex: 1;
  overflow-y: auto; /* 让滚动条只出现在卡片区域右侧 */
  padding-top: 30px;
  padding-bottom: 40px;

  /* 核心防抖：即使该区域滚动条显隐，也通过 stable 保持宽度不变 */
  scrollbar-gutter: stable;

  /* 极致视觉美化：卡片区滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
    &:hover { background: $btn-color; }
  }
}

// 限制卡片区域的最大展宽与搜索框对齐
.cards-limit-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* ================= 网格与卡片样式（保持原样） ================= */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 25px;
}

.algo-card {
  background-color: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-5px);
    border-color: $btn-color;
    box-shadow: 0 12px 20px -10px rgba($btn-color, 0.3);
    .card-preview {
      background-color: rgba($btn-color, 0.06);
      .card-main-icon { transform: scale(1.1); color: $btn-color; }
      .geometric-shape { opacity: 0.15; }
    }
  }

  .card-preview {
    height: 130px;
    background-color: rgba(255, 255, 255, 0.01);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid #334155;
    transition: background-color 0.3s;

    .card-main-icon { font-size: 2.8rem; color: #94a3b8; transition: all 0.3s; z-index: 2; }
    .geometric-shape { position: absolute; width: 90px; height: 90px; border: 2px solid $btn-color; opacity: 0.02; transition: all 0.6s ease; z-index: 1; }
  }

  .card-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex: 1;
    .card-title { font-size: 1.15rem; font-weight: 700; margin: 0 0 8px 0; color: #f8fafc; }
    .card-desc { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin: 0 0 16px 0; flex: 1; }
    .card-tags {
      display: flex; gap: 6px; flex-wrap: wrap;
      .tag { background-color: #0f172a; color: #cbd5e1; font-size: 0.7rem; padding: 3px 8px; border-radius: 4px; border: 1px solid #334155; }
    }
  }
}

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: #475569;
  i { font-size: 2.5rem; margin-bottom: 12px; }
}
</style>
