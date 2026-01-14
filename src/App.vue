<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useFoodStore } from '@/stores/foodStore'
import { initDatabase } from '@/db'
import { initNotificationService } from '@/services/notificationService'
import { initSyncService } from '@/services/firebaseService'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const foodStore = useFoodStore()

const currentTitle = computed(() => (route.meta.title as string) || '智能冰箱管家')
const showBackButton = computed(() => route.path !== '/')

onMounted(async () => {
  // 初始化数据库
  await initDatabase()
  // 加载食材数据
  await foodStore.loadFoods()
  // 初始化网络状态监听
  uiStore.initOnlineListener()
  // 初始化通知服务
  await initNotificationService(() => foodStore.activeFoods)
  // 初始化云同步服务
  await initSyncService()
})

function goBack() {
  router.back()
}
</script>

<template>
  <div class="app">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      :title="currentTitle"
      :left-arrow="showBackButton"
      fixed
      placeholder
      @click-left="goBack"
    />

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['HomeView', 'InventoryView', 'RecipeView']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <!-- 底部标签栏 -->
    <van-tabbar route>
      <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item icon="orders-o" to="/inventory">食材</van-tabbar-item>
      <van-tabbar-item icon="photograph" to="/camera">拍照</van-tabbar-item>
      <van-tabbar-item icon="coupon-o" to="/recipes">菜谱</van-tabbar-item>
      <van-tabbar-item icon="setting-o" to="/settings">设置</van-tabbar-item>
    </van-tabbar>

    <!-- 离线状态提示 -->
    <van-notify
      v-model:show="uiStore.showOfflineNotify"
      type="warning"
      message="当前处于离线模式，数据将在联网后同步"
    />

    <!-- 全局加载 -->
    <van-overlay :show="uiStore.isLoading" class="loading-overlay">
      <van-loading type="spinner" vertical>{{ uiStore.loadingText }}</van-loading>
    </van-overlay>
  </div>
</template>

<style lang="scss">
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}

.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
