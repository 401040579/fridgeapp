import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // State
  const isOnline = ref(navigator.onLine)
  const showOfflineNotify = ref(false)
  const activeTabIndex = ref(0)
  const isLoading = ref(false)
  const loadingText = ref('')

  // Actions
  function setOnlineStatus(status: boolean) {
    isOnline.value = status
    if (!status) {
      showOfflineNotify.value = true
    }
  }

  function setActiveTab(index: number) {
    activeTabIndex.value = index
  }

  function startLoading(text: string = '加载中...') {
    isLoading.value = true
    loadingText.value = text
  }

  function stopLoading() {
    isLoading.value = false
    loadingText.value = ''
  }

  // Initialize online status listener
  function initOnlineListener() {
    window.addEventListener('online', () => setOnlineStatus(true))
    window.addEventListener('offline', () => setOnlineStatus(false))
  }

  return {
    // State
    isOnline,
    showOfflineNotify,
    activeTabIndex,
    isLoading,
    loadingText,
    // Actions
    setOnlineStatus,
    setActiveTab,
    startLoading,
    stopLoading,
    initOnlineListener,
  }
})
