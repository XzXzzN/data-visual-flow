<template>
  <div class="layout-container">
    <header v-if="showTop" class="layout-header">
      <div class="logo">Data Visual Flow</div>

      <div class="nav-wrapper">
        <button
          v-if="showLeftArrow"
          class="scroll-btn left-btn"
          @click="scrollNav('left')"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>

        <nav
          ref="navRef"
          class="top-nav"
          @scroll="checkScrollPosition"
        >
          <div
            v-for="menu in menuStore.accessibleMenus"
            :key="menu.id"
            class="top-menu-item"
            :class="{ active: menuStore.activeTopMenuId === menu.id }"
            @click="handleTopMenuClick(menu)"
          >
            <span>{{ menu.name }}</span>
          </div>
        </nav>

        <button
          v-if="showRightArrow"
          class="scroll-btn right-btn"
          @click="scrollNav('right')"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </header>

    <div class="layout-body" :class="{ 'no-header': !showTop }">
      <aside v-if="showSide && menuStore.currentSideMenus.length > 0" class="layout-sidebar">
        <div class="sidebar-menu">
          <router-link
            v-for="subSub in menuStore.currentSideMenus"
            :key="subSub.id"
            :to="subSub.path"
            class="side-menu-item"
            active-class="side-active"
          >
            {{ subSub.name }}
          </router-link>
        </div>
      </aside>

      <main class="layout-main">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useMenuStore, type MenuItem } from '@/stores/menu'

interface Props {
  showTop?: boolean
  showSide?: boolean
}

withDefaults(defineProps<Props>(), {
  showTop: true,
  showSide: true
})

const menuStore = useMenuStore()
const router = useRouter()
const cachedViews = ref<string[]>(['AnalysisView', 'LineView'])

// --- 滚动控制核心逻辑 ---
const navRef = ref<HTMLElement | null>(null)
const showLeftArrow = ref(false)
const showRightArrow = ref(false)

// 检查当前滚动位置，决定是否展示左右箭头
const checkScrollPosition = () => {
  const el = navRef.value
  if (!el) return

  // scrollLeft: 已滚动距离; clientWidth: 容器可视宽度; scrollWidth: 内容实际总宽度
  showLeftArrow.value = el.scrollLeft > 1
  // 容错 1px，避免浮点数精度引发判定问题
  showRightArrow.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

// 点击箭头进行平滑滚动
const scrollNav = (direction: 'left' | 'right') => {
  const el = navRef.value
  if (!el) return

  const scrollAmount = 200 // 每次点击滚动的像素距离
  const targetScroll = direction === 'left'
    ? el.scrollLeft - scrollAmount
    : el.scrollLeft + scrollAmount

  el.scrollTo({
    left: targetScroll,
    behavior: 'smooth' // 平滑滚动动效
  })
}

// 监听窗口大小变化，重新计算是否需要箭头
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  checkScrollPosition()

  // 使用 ResizeObserver 监听容器尺寸，比传统的 window.resize 更精准
  if (navRef.value) {
    resizeObserver = new ResizeObserver(() => {
      checkScrollPosition()
    })
    resizeObserver.observe(navRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

const handleTopMenuClick = (menu: MenuItem) => {
  menuStore.setActiveTopMenu(menu.id)
  if (menu.children && menu.children.length > 0) {
    router.push(menu.children[0].path)
  } else {
    router.push(menu.path)
  }
}
</script>

<style scoped lang="scss">
/* 此处自动引入了 Vite 的 _variables.scss */

$header-height: 60px;
$sidebar-width: 200px;
$bg-color: #0f172a;
$panel-bg: #1e293b;

.layout-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: $bg-color;
  color: #f8fafc;
  overflow: hidden;
}

.layout-header {
  display: flex;
  align-items: center;
  height: $header-height;
  background-color: $panel-bg;
  border-bottom: 1px solid #334155;
  padding: 0 20px;

  .logo {
    font-size: 18px;
    font-weight: bold;
    color: $btn-color;
    margin-right: 40px;
    white-space: nowrap; /* 避免Logo在极窄屏幕下换行 */
  }

  /* 导航包裹容器 */
  .nav-wrapper {
    flex: 1;
    height: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  /* 滚动导航栏核心 */
  .top-nav {
    display: flex;
    gap: 10px;
    height: 100%;
    width: 100%;
    overflow-x: auto;          /* 开启横向滚动 */
    scrollbar-width: none;     /* Firefox 隐藏滚动条 */

    &::-webkit-scrollbar {     /* Chrome/Safari 隐藏滚动条 */
      display: none;
    }

    /* 增强手机端的弹性滑动体验 */
    -webkit-overflow-scrolling: touch;

    .top-menu-item {
      display: flex;
      align-items: center;
      padding: 0 20px;
      cursor: pointer;
      transition: color 0.3s;
      border-bottom: 2px solid transparent;
      white-space: nowrap;    /* 极度关键：防止文字因为空间不足被挤压成多行 */
      height: 100%;

      &:hover, &.active {
        color: $btn-color;
      }
      &.active {
        border-bottom-color: $btn-color;
      }
    }
  }

  /* 左右滑动指示按钮 */
  .scroll-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 32px;
    height: 32px;
    background-color: rgba(#0f172a, 0.85);
    border: 1px solid #334155;
    color: #f8fafc;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);

    &:hover {
      background-color: $btn-color;
      border-color: $btn-color;
      color: #fff;
    }

    &.left-btn {
      left: 0;
      /* 增加向右的微弱渐变阴影，视觉上遮挡后面被切断的文字 */
      box-shadow: 10px 0 15px rgba(#1e293b, 0.9);
    }

    &.right-btn {
      right: 0;
      /* 增加向左的微弱渐变阴影 */
      box-shadow: -10px 0 15px rgba(#1e293b, 0.9);
    }
  }
}

/* 以下保持不变 */
.layout-body {
  display: flex;
  flex: 1;
  height: calc(100vh - #{$header-height});
  &.no-header { height: 100vh; }
}

.layout-sidebar {
  width: $sidebar-width;
  background-color: $panel-bg;
  border-right: 1px solid #334155;
  padding: 20px 10px;
  .sidebar-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    .side-menu-item {
      padding: 12px 15px;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 6px;
      transition: all 0.3s;
      &:hover, &.side-active {
        color: #fff;
        background-color: rgba($btn-color, 0.15);
      }
      &.side-active {
        color: $btn-color;
        font-weight: 500;
      }
    }
  }
}

.layout-main {
  flex: 1;
  // padding: 20px;
  overflow: hidden;
  /* 🚀 在这里精准加持防跳动属性 */
  background-color: #0b0f19;
}

.fade-transform-enter-active,
.fade-transform-leave-active { transition: all 0.4s ease; }
.fade-transform-enter-from { opacity: 0; transform: translateX(-20px); }
.fade-transform-leave-to { opacity: 0; transform: translateX(20px); }
</style>
