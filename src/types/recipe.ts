import type { FoodUnit } from './food'

/** 菜谱食材 */
export interface RecipeIngredient {
  name: string
  quantity: number
  unit: FoodUnit
  optional: boolean
}

/** 菜谱难度 */
export type RecipeDifficulty = 'easy' | 'medium' | 'hard'

/** 菜谱实体 */
export interface Recipe {
  id: string
  name: string
  description: string
  ingredients: RecipeIngredient[]
  steps: string[]
  cookingTime: number
  difficulty: RecipeDifficulty
  imageUrl?: string
  tags: string[]
}

/** 菜谱匹配结果 */
export interface RecipeMatch {
  recipe: Recipe
  matchedIngredients: string[]
  missingIngredients: string[]
  matchScore: number
}

/** 难度中文映射 */
export const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}
