import { createRouter, createWebHashHistory } from 'vue-router'

// 使用 hash 路由：打包后设置窗口通过 index.html#/settings 打开
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'island',
      component: () => import('@/views/IslandView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

export default router
