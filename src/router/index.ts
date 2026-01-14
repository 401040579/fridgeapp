import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('@/views/InventoryView.vue'),
      meta: { title: '食材库存' },
    },
    {
      path: '/camera',
      name: 'camera',
      component: () => import('@/views/CameraView.vue'),
      meta: { title: '拍照识别' },
    },
    {
      path: '/recipes',
      name: 'recipes',
      component: () => import('@/views/RecipeView.vue'),
      meta: { title: '菜谱推荐' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: '设置' },
    },
  ],
})

export default router
