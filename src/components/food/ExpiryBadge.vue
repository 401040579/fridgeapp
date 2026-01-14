<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  expiryDate: string
}>()

const daysUntilExpiry = computed(() => {
  const expiry = new Date(props.expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
})

const tagType = computed(() => {
  if (daysUntilExpiry.value < 0) return 'danger'
  if (daysUntilExpiry.value <= 3) return 'warning'
  return 'success'
})

const displayText = computed(() => {
  if (daysUntilExpiry.value < 0) {
    return `已过期${Math.abs(daysUntilExpiry.value)}天`
  }
  if (daysUntilExpiry.value === 0) {
    return '今天过期'
  }
  if (daysUntilExpiry.value <= 7) {
    return `${daysUntilExpiry.value}天后过期`
  }
  return `${daysUntilExpiry.value}天`
})
</script>

<template>
  <van-tag :type="tagType" size="medium">
    {{ displayText }}
  </van-tag>
</template>
