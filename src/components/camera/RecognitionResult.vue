<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecognizedFood, FoodCategory, StorageLocation, FoodUnit } from '@/types/food'
import { CATEGORY_LABELS, LOCATION_LABELS, DEFAULT_EXPIRY_DAYS } from '@/types/food'

const props = defineProps<{
  foods: RecognizedFood[]
  isAdding: boolean
}>()

const emit = defineEmits<{
  retake: []
  confirm: [foods: RecognizedFood[]]
}>()

const selectedIds = ref<Set<number>>(new Set(props.foods.map((_, i) => i)))

const allSelected = computed(() => selectedIds.value.size === props.foods.length)

function toggleSelect(index: number) {
  if (selectedIds.value.has(index)) {
    selectedIds.value.delete(index)
  } else {
    selectedIds.value.add(index)
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(props.foods.map((_, i) => i))
  }
}

function handleConfirm() {
  const selected = props.foods.filter((_, i) => selectedIds.value.has(i))
  emit('confirm', selected)
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'success'
  if (confidence >= 0.7) return 'warning'
  return 'danger'
}
</script>

<template>
  <div class="recognition-result">
    <van-nav-bar title="识别结果" />

    <div class="result-content">
      <van-cell-group inset>
        <van-cell center @click="toggleAll">
          <template #title>
            <van-checkbox :model-value="allSelected" @click.stop="toggleAll">
              全选 ({{ selectedIds.size }}/{{ foods.length }})
            </van-checkbox>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset class="food-list">
        <van-cell
          v-for="(food, index) in foods"
          :key="index"
          center
          @click="toggleSelect(index)"
        >
          <template #icon>
            <van-checkbox
              :model-value="selectedIds.has(index)"
              @click.stop="toggleSelect(index)"
            />
          </template>

          <template #title>
            <div class="food-info">
              <span class="food-name">{{ food.name }}</span>
              <van-tag :type="getConfidenceColor(food.confidence)" size="small">
                {{ Math.round(food.confidence * 100) }}%
              </van-tag>
            </div>
          </template>

          <template #label>
            <div class="food-details">
              <span>{{ CATEGORY_LABELS[food.suggestedCategory] }}</span>
              <span>{{ LOCATION_LABELS[food.suggestedLocation] }}</span>
              <span>保质期 {{ food.suggestedExpiryDays }} 天</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <van-empty v-if="foods.length === 0" description="未识别到食材" />
    </div>

    <div class="actions">
      <van-button round @click="$emit('retake')">重新拍照</van-button>
      <van-button
        type="primary"
        round
        :loading="isAdding"
        :disabled="selectedIds.size === 0"
        loading-text="添加中..."
        @click="handleConfirm"
      >
        添加 {{ selectedIds.size }} 个食材
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.recognition-result {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.food-list {
  margin-top: 12px;
}

.food-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.food-name {
  font-weight: 500;
}

.food-details {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.actions {
  padding: 16px;
  display: flex;
  gap: 12px;
  background: #fff;
  border-top: 1px solid #eee;

  .van-button {
    flex: 1;
  }
}
</style>
