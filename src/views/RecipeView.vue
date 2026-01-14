<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFoodStore } from '@/stores/foodStore'
import type { RecipeMatch } from '@/types/recipe'

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
    // TODO: 调用 Claude API 获取菜谱推荐
    // 暂时使用模拟数据
    await new Promise((resolve) => setTimeout(resolve, 1500))

    recipes.value = [
      {
        recipe: {
          id: '1',
          name: '番茄炒蛋',
          description: '经典家常菜，简单快手',
          ingredients: [
            { name: '番茄', quantity: 2, unit: '个', optional: false },
            { name: '鸡蛋', quantity: 3, unit: '个', optional: false },
          ],
          steps: ['番茄切块', '鸡蛋打散', '热油炒蛋', '加入番茄翻炒'],
          cookingTime: 15,
          difficulty: 'easy',
          tags: ['家常菜', '快手菜'],
        },
        matchedIngredients: ['番茄', '鸡蛋'],
        missingIngredients: [],
        matchScore: 100,
      },
    ]
  } catch (e) {
    error.value = '获取菜谱推荐失败，请重试'
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
