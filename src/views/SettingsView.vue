<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { useFoodStore } from '@/stores/foodStore'
import {
  loadSettings,
  saveSettings,
  requestPermission,
  checkPermission,
  startPeriodicCheck,
  stopPeriodicCheck,
} from '@/services/notificationService'
import {
  isFirebaseConfigured,
  getSyncStatus,
  fullSync,
  addSyncStatusListener,
  type SyncServiceStatus,
} from '@/services/firebaseService'
import { showToast, showLoadingToast, closeToast } from 'vant'

const uiStore = useUiStore()
const foodStore = useFoodStore()

const notificationEnabled = ref(false)
const expiryReminderDays = ref(3)
const notificationSupported = ref(true)

// 同步相关状态
const firebaseConfigured = ref(false)
const syncStatus = ref<SyncServiceStatus | null>(null)
let unsubscribeSyncListener: (() => void) | null = null

onMounted(async () => {
  // 检查浏览器是否支持通知
  notificationSupported.value = 'Notification' in window

  // 加载保存的设置
  const settings = loadSettings()
  expiryReminderDays.value = settings.reminderDays

  // 检查当前权限状态
  const permission = checkPermission()
  notificationEnabled.value = permission === 'granted' && settings.enabled

  // 检查 Firebase 配置
  firebaseConfigured.value = isFirebaseConfigured()
  if (firebaseConfigured.value) {
    syncStatus.value = await getSyncStatus()
    // 监听同步状态变化
    unsubscribeSyncListener = addSyncStatusListener((status) => {
      syncStatus.value = status
    })
  }
})

onUnmounted(() => {
  if (unsubscribeSyncListener) {
    unsubscribeSyncListener()
  }
})

async function toggleNotification(enabled: boolean) {
  if (enabled) {
    const granted = await requestPermission()
    if (!granted) {
      notificationEnabled.value = false
      showToast('请在浏览器设置中允许通知权限')
      return
    }
    saveSettings({ enabled: true })
    startPeriodicCheck(() => foodStore.activeFoods)
    showToast('通知已开启')
  } else {
    saveSettings({ enabled: false })
    stopPeriodicCheck()
    showToast('通知已关闭')
  }
}

function updateReminderDays(days: number) {
  saveSettings({ reminderDays: days })
}

// 监听提醒天数变化
watch(expiryReminderDays, (newDays) => {
  updateReminderDays(newDays)
})

// 手动同步
async function manualSync() {
  if (!firebaseConfigured.value || !uiStore.isOnline) {
    showToast('无法同步：请检查网络连接和 Firebase 配置')
    return
  }

  showLoadingToast({
    message: '同步中...',
    forbidClick: true,
  })

  try {
    await fullSync()
    await foodStore.loadFoods()
    closeToast()
    showToast('同步完成')
  } catch (error) {
    closeToast()
    showToast('同步失败，请重试')
    console.error('Sync error:', error)
  }
}

// 格式化时间
function formatLastSyncTime(isoTime: string | null): string {
  if (!isoTime) return '从未同步'
  const date = new Date(isoTime)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="settings-view">
    <van-cell-group title="通知设置" inset>
      <van-cell center title="开启通知提醒">
        <template #label>
          <span v-if="!notificationSupported" class="unsupported-hint">
            当前浏览器不支持通知功能
          </span>
        </template>
        <template #right-icon>
          <van-switch
            v-model="notificationEnabled"
            :disabled="!notificationSupported"
            @change="toggleNotification"
          />
        </template>
      </van-cell>
      <van-cell title="过期提醒提前天数">
        <template #value>
          <van-stepper
            v-model="expiryReminderDays"
            :min="1"
            :max="14"
            :disabled="!notificationEnabled"
          />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="同步设置" inset>
      <van-cell
        center
        title="网络状态"
        :value="uiStore.isOnline ? '在线' : '离线'"
      >
        <template #right-icon>
          <van-tag :type="uiStore.isOnline ? 'success' : 'warning'">
            {{ uiStore.isOnline ? '已连接' : '离线模式' }}
          </van-tag>
        </template>
      </van-cell>

      <van-cell
        v-if="firebaseConfigured"
        center
        title="云同步状态"
        :label="syncStatus?.lastSyncTime ? `上次同步: ${formatLastSyncTime(syncStatus.lastSyncTime)}` : ''"
      >
        <template #value>
          <van-tag v-if="syncStatus?.isSyncing" type="primary">同步中</van-tag>
          <van-tag v-else-if="syncStatus?.pendingCount && syncStatus.pendingCount > 0" type="warning">
            待同步 {{ syncStatus.pendingCount }}
          </van-tag>
          <van-tag v-else-if="syncStatus?.isAuthenticated" type="success">已同步</van-tag>
          <van-tag v-else type="default">未连接</van-tag>
        </template>
      </van-cell>

      <van-cell
        v-if="firebaseConfigured"
        title="手动同步"
        is-link
        :clickable="uiStore.isOnline && !syncStatus?.isSyncing"
        @click="manualSync"
      >
        <template #value>
          <span v-if="!uiStore.isOnline" class="sync-hint">需要网络连接</span>
        </template>
      </van-cell>

      <van-cell v-if="!firebaseConfigured" title="云同步">
        <template #label>
          <span class="unsupported-hint">
            请在 .env 文件中配置 Firebase 以启用云同步
          </span>
        </template>
        <template #value>
          <van-tag type="default">未配置</van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group title="关于" inset>
      <van-cell title="版本" value="0.1.0" />
      <van-cell title="智能冰箱管家" label="拍照识别、过期提醒、菜谱推荐" />
    </van-cell-group>
  </div>
</template>

<style scoped lang="scss">
.settings-view {
  padding: 16px;
  padding-bottom: 80px;
}

.unsupported-hint {
  font-size: 12px;
  color: #999;
}

.sync-hint {
  font-size: 12px;
  color: #999;
}
</style>
