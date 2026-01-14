<script setup lang="ts">
import { ref } from 'vue'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()

const notificationEnabled = ref(false)
const expiryReminderDays = ref(3)

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return
  }

  const permission = await Notification.requestPermission()
  notificationEnabled.value = permission === 'granted'
}
</script>

<template>
  <div class="settings-view">
    <van-cell-group title="通知设置" inset>
      <van-cell center title="开启通知提醒">
        <template #right-icon>
          <van-switch
            v-model="notificationEnabled"
            @change="requestNotificationPermission"
          />
        </template>
      </van-cell>
      <van-cell title="过期提醒提前天数" :value="`${expiryReminderDays} 天`" />
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
</style>
