import { createRouter, createWebHistory } from 'vue-router'
import IslandView from '@/views/IslandView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'island',
      component: IslandView,
    },
  ],
})

export default router
