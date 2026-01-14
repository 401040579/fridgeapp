<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFoodStore } from '@/stores/foodStore'
import type { StorageLocation, FoodItem } from '@/types/food'
import { LOCATION_LABELS } from '@/types/food'
import FoodCard from '@/components/food/FoodCard.vue'
import FoodForm from '@/components/food/FoodForm.vue'

const foodStore = useFoodStore()

const activeLocation = ref<StorageLocation>('refrigerated')
const showAddForm = ref(false)
const editingFood = ref<FoodItem | null>(null)

const locations: StorageLocation[] = ['refrigerated', 'frozen', 'pantry']

const currentFoods = computed(() => foodStore.foodsByLocation(activeLocation.value))

onMounted(() => {
  foodStore.loadFoods()
})

function handleAdd() {
  editingFood.value = null
  showAddForm.value = true
}

function handleEdit(food: FoodItem) {
  editingFood.value = food
  showAddForm.value = true
}

async function handleDelete(food: FoodItem) {
  await foodStore.deleteFood(food.id)
}

function handleFormClose() {
  showAddForm.value = false
  editingFood.value = null
}
</script>

<template>
  <div class="inventory-view">
    <!-- 位置标签页 -->
    <van-tabs v-model:active="activeLocation" shrink sticky>
      <van-tab
        v-for="loc in locations"
        :key="loc"
        :name="loc"
        :title="LOCATION_LABELS[loc]"
        :badge="foodStore.foodsByLocation(loc).length || undefined"
      />
    </van-tabs>

    <!-- 食材列表 -->
    <div class="food-list">
      <FoodCard
        v-for="food in currentFoods"
        :key="food.id"
        :food="food"
        @edit="handleEdit"
        @delete="handleDelete"
      />

      <van-empty
        v-if="currentFoods.length === 0"
        :description="`${LOCATION_LABELS[activeLocation]}暂无食材`"
      />
    </div>

    <!-- 添加按钮 -->
    <van-floating-bubble
      icon="plus"
      axis="xy"
      magnetic="x"
      @click="handleAdd"
    />

    <!-- 添加/编辑表单 -->
    <FoodForm
      v-model:show="showAddForm"
      :food="editingFood"
      :default-location="activeLocation"
      @close="handleFormClose"
    />
  </div>
</template>

<style scoped lang="scss">
.inventory-view {
  padding-bottom: 80px;
}

.food-list {
  padding: 12px;
}
</style>
