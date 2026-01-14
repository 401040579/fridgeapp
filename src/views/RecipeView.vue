<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFoodStore } from '@/stores/foodStore'
import type { RecipeMatch } from '@/types/recipe'
import { getRecipeRecommendations, isAPIConfigured } from '@/services/aiService'

const foodStore = useFoodStore()

const isLoading = ref(false)
const recipes = ref<RecipeMatch[]>([])
const error = ref<string | null>(null)

const hasIngredients = computed(() => foodStore.activeFoods.length > 0)

onMounted(() => {
  foodStore.loadFoods()
})

async function getRecommendations() {
  if (!hasIngredients.value) return

  isLoading.value = true
  error.value = null

  try {
    // 检查 API 是否配置
    if (!isAPIConfigured()) {
      error.value = 'API 未配置，请在 .env 文件中设置 VITE_CLAUDE_API_KEY'
      return
    }

    // 调用 Claude API 获取菜谱推荐
    const recommendations = await getRecipeRecommendations(foodStore.activeFoods)

    if (recommendations.length === 0) {
      error.value = '暂无匹配的菜谱推荐'
      return
    }

    // 将 matchScore 转换为百分比格式显示
    recipes.value = recommendations.map((r) => ({
      ...r,
      matchScore: Math.round(r.matchScore * 100),
    }))
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取菜谱推荐失败，请重试'
    console.error('Recipe recommendation error:', e)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="recipe-view">
    <van-cell-group inset>
      <van-cell
        title="当前食材"
        :value="`${foodStore.activeFoods.length} 种`"
        icon="orders-o"
      />
    </van-cell-group>

    <div class="action-area">
      <van-button
        type="primary"
        block
        round
        :loading="isLoading"
        :disabled="!hasIngredients"
        @click="getRecommendations"
      >
        {{ hasIngredients ? '获取菜谱推荐' : '请先添加食材' }}
      </van-button>
    </div>

    <van-empty
      v-if="!isLoading && recipes.length === 0 && !error"
      description="点击上方按钮获取菜谱推荐"
      image="search"
    />

    <div v-if="error" class="error-message">
      <van-icon name="warning-o" />
      {{ error }}
    </div>

    <div v-if="recipes.length > 0" class="recipe-list">
      <van-cell-group
        v-for="match in recipes"
        :key="match.recipe.id"
        inset
        class="recipe-card"
      >
        <van-cell :title="match.recipe.name" :label="match.recipe.description">
          <template #value>
            <van-tag type="success">匹配度 {{ match.matchScore }}%</van-tag>
          </template>
        </van-cell>
        <van-cell title="所需食材">
          <template #value>
            <div class="ingredients">
              <van-tag
                v-for="ing in match.matchedIngredients"
                :key="ing"
                type="success"
                size="medium"
              >
                {{ ing }}
              </van-tag>
              <van-tag
                v-for="ing in match.missingIngredients"
                :key="ing"
                type="danger"
                size="medium"
              >
                {{ ing }}
              </van-tag>
            </div>
          </template>
        </van-cell>
        <van-cell
          :title="`烹饪时间: ${match.recipe.cookingTime}分钟`"
          :value="match.recipe.difficulty === 'easy' ? '简单' : match.recipe.difficulty === 'medium' ? '中等' : '困难'"
        />
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped lang="scss">
.recipe-view {
  padding: 16px;
  padding-bottom: 80px;
}

.action-area {
  margin: 16px 0;
}

.error-message {
  text-align: center;
  color: #f44336;
  padding: 20px;
}

.recipe-list {
  margin-top: 16px;
}

.recipe-card {
  margin-bottom: 12px;
}

.ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
