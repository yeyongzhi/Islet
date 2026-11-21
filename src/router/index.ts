import { createRouter, createWebHashHistory } from 'vue-router'
import IslandView from '@/views/IslandView.vue'
import SettingsView from '@/views/SettingsView.vue'

// 使用 hash 路由：打包后设置窗口通过 index.html#/settings 打开
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'island',
      component: IslandView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
  ],
})

export default router
