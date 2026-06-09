import { defineStore } from 'pinia'

// 定义菜单项的 TypeScript 接口
export interface MenuItem {
  id: string
  name: string
  path: string
  icon?: string
  permissions?: string[] // 哪些角色可以访问，为空表示所有人可访问
  showTop?: boolean      // 是否在顶部菜单展示
  showSide?: boolean     // 是否在侧边菜单展示
  children?: MenuItem[]  // 子菜单
}

interface MenuState {
  menus: MenuItem[]
  userRoles: string[]    // 当前登录用户的角色列表
  activeTopMenuId: string // 当前选中的顶部菜单ID
  loading: boolean       // 异步接口加载状态
}

export const useMenuStore = defineStore('menu', {
  state: (): MenuState => ({
    // 前期静态配置的菜单数据
    menus: [
      {
        id: 'index',
        name: '首页',
        path: '/index',
        icon: 'HomeIcon',
        permissions: ['admin', 'user']
      },
      {
        id: 'flowDesigner',
        name: '程序流程图',
        path: '/flowDesigner',
        icon: 'DataIcon',
        permissions: ['admin']
      },
      {
        id: 'system',
        name: '系统设置',
        path: '/setting',
        icon: 'SettingIcon',
        permissions: ['admin'],
        children: [
          { id: 'user-manage', name: '用户管理', path: '/setting/user' }
        ]
      }
    ],
    userRoles: ['admin'], // 模拟当前用户的角色（实际开发中从用户Store获取）
    activeTopMenuId: 'index',
    loading: false
  }),

  getters: {
    /**
     * 1. 根据用户权限过滤出有权访问的完整菜单树
     */
    accessibleMenus(state): MenuItem[] {
      const filterMenu = (menuList: MenuItem[]): MenuItem[] => {
        return menuList
          .filter(item => {
            // 如果菜单未配置权限，或者用户角色包含在菜单允许的权限内，则放行
            return !item.permissions || item.permissions.some(role => state.userRoles.includes(role))
          })
          .map(item => ({
            ...item,
            // 递归过滤子菜单
            children: item.children ? filterMenu(item.children) : []
          }))
      }
      return filterMenu(state.menus)
    },

    /**
     * 2. 根据当前选中的顶部菜单，动态获取对应的侧边子菜单
     */
    currentSideMenus(): MenuItem[] {
      const currentTop = this.accessibleMenus.find(m => m.id === this.activeTopMenuId)
      return currentTop?.children || []
    }
  },

  actions: {
    // 切换顶部菜单
    setActiveTopMenu(id: string) {
      this.activeTopMenuId = id
    },

    /**
     * 后期从接口获取动态菜单的预留方法
     */
    async fetchRemoteMenus() {
      this.loading = true
      try {
        // const response = await api.get('/api/menus')
        // this.menus = response.data
        // 设置router.addRoute(...) 动态添加路由
        // router.addRoute(...)
      } catch (error) {
        console.error('Failed to fetch menus', error)
      } finally {
        this.loading = false
      }
    }
  }
})
