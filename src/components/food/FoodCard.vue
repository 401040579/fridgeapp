<script setup lang="ts">
import { computed } from 'vue'
import type { FoodItem } from '@/types/food'
import { LOCATION_LABELS, CATEGORY_ICONS } from '@/types/food'
import ExpiryBadge from './ExpiryBadge.vue'

const props = defineProps<{
  food: FoodItem
}>()

const emit = defineEmits<{
  click: [food: FoodItem]
  edit: [food: FoodItem]
  delete: [food: FoodItem]
}>()

const locationLabel = computed(() => LOCATION_LABELS[props.food.location])
const categoryIcon = computed(() => CATEGORY_ICONS[props.food.category])
</script>

<template>
  <van-swipe-cell>
    <van-cell
      :title="food.name"
      :label="locationLabel"
      is-link
      @click="emit('click', food)"
    >
      <template #icon>
        <van-icon :name="categoryIcon" size="24" class="food-icon" />
      </template>

      <template #value>
        <div class="food-meta">
          <span class="quantity">{{ food.quantity }}{{ food.unit }}</span>
          <ExpiryBadge :expiry-date="food.expiryDate" />
        </div>
      </template>
    </van-cell>

    <template #right>
      <van-button
        square
        type="primary"
        text="编辑"
        class="swipe-btn"
        @click="emit('edit', food)"
      />
      <van-button
        square
        type="danger"
        text="删除"
        class="swipe-btn"
        @click="emit('delete', food)"
      />
    </template>
  </van-swipe-cell>
</template>

<style scoped lang="scss">
.food-icon {
  margin-right: 12px;
  color: #4caf50;
}

.food-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.quantity {
  font-size: 14px;
  color: #666;
}

.swipe-btn {
  height: 100%;
}
</style>
