<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFoodStore } from '@/stores/foodStore'
import type { RecognizedFood } from '@/types/food'
import CameraCapture from '@/components/camera/CameraCapture.vue'
import RecognitionResult from '@/components/camera/RecognitionResult.vue'

const router = useRouter()
const foodStore = useFoodStore()

const step = ref<'capture' | 'result'>('capture')
const recognizedFoods = ref<RecognizedFood[]>([])
const isAdding = ref(false)

function handleRecognized(foods: RecognizedFood[]) {
  recognizedFoods.value = foods
  step.value = 'result'
}

function handleRetake() {
  recognizedFoods.value = []
  step.value = 'capture'
}

async function handleConfirm(selectedFoods: RecognizedFood[]) {
  if (selectedFoods.length === 0) return

  isAdding.value = true
  try {
    await foodStore.addFoodsFromRecognition(selectedFoods)
    router.push('/inventory')
  } finally {
    isAdding.value = false
  }
}
</script>

<template>
  <div class="camera-view">
    <CameraCapture
      v-if="step === 'capture'"
      @recognized="handleRecognized"
    />

    <RecognitionResult
      v-else
      :foods="recognizedFoods"
      :is-adding="isAdding"
      @retake="handleRetake"
      @confirm="handleConfirm"
    />
  </div>
</template>

<style scoped lang="scss">
.camera-view {
  height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
}
</style>
