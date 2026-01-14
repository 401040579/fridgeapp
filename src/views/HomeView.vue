<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFoodStore } from '@/stores/foodStore'
import { useRouter } from 'vue-router'
import ExpiryBadge from '@/components/food/ExpiryBadge.vue'

const foodStore = useFoodStore()
const router = useRouter()

const stats = computed(() => foodStore.stats)
const expiringFoods = computed(() => foodStore.expiringFoods.slice(0, 5))
const expiredFoods = computed(() => foodStore.expiredFoods.slice(0, 3))

onMounted(() => {
  foodStore.loadFoods()
})

function goToInventory() {
  router.push('/inventory')
}

function goToCamera() {
  router.push('/camera')
}
</script>

<template>
  <div class="home-view">
    <!-- 统计概览 -->
    <van-row class="stats-cards" gutter="12">
      <van-col span="8">
        <div class="stat-card" @click="goToInventory">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总食材</div>
        </div>
      </van-col>
      <van-col span="8">
        <div class="stat-card warning" @click="goToInventory">
          <div class="stat-value">{{ stats.expiring }}</div>
          <div class="stat-label">即将过期</div>
        </div>
      </van-col>
      <van-col span="8">
        <div class="stat-card danger" @click="goToInventory">
          <div class="stat-value">{{ stats.expired }}</div>
          <div class="stat-label">已过期</div>
        </div>
      </van-col>
    </van-row>

    <!-- 快捷操作 -->
    <van-cell-group title="快捷操作" inset>
      <van-cell title="拍照识别食材" is-link icon="photograph" @click="goToCamera" />
      <van-cell title="查看所有食材" is-link icon="orders-o" @click="goToInventory" />
    </van-cell-group>

    <!-- 即将过期提醒 -->
    <van-cell-group v-if="expiringFoods.length > 0" title="即将过期" inset>
      <van-cell
        v-for="food in expiringFoods"
        :key="food.id"
        :title="food.name"
        :label="`${food.quantity}${food.unit}`"
        @click="goToInventory"
      >
        <template #value>
          <ExpiryBadge :expiry-date="food.expiryDate" />
        </template>
      </van-cell>
      <van-cell
        v-if="foodStore.expiringFoods.length > 5"
        title="查看更多"
        is-link
        @click="goToInventory"
      />
    </van-cell-group>

    <!-- 已过期食材 -->
    <van-cell-group v-if="expiredFoods.length > 0" title="已过期" inset>
      <van-cell
        v-for="food in expiredFoods"
        :key="food.id"
        :title="food.name"
        :label="`${food.quantity}${food.unit}`"
        @click="goToInventory"
      >
        <template #value>
          <ExpiryBadge :expiry-date="food.expiryDate" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 空状态 -->
    <van-empty
      v-if="stats.total === 0"
      description="冰箱里还没有食材"
      image="search"
    >
      <van-button round type="primary" @click="goToCamera">拍照添加食材</van-button>
    </van-empty>
  </div>
</template>

<style scoped lang="scss">
.home-view {
  padding: 16px;
  padding-bottom: 80px;
}

.stats-cards {
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .stat-value {
    font-size: 28px;
    font-weight: 600;
    color: #4caf50;
  }

  .stat-label {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
  }

  &.warning .stat-value {
    color: #ff9800;
  }

  &.danger .stat-value {
    color: #f44336;
  }
}
</style>
