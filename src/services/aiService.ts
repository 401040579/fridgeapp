/**
 * AI 服务层 - 集成 Claude API
 * 提供食材识别和菜谱推荐功能
 */

import type { RecognizedFood, FoodCategory, StorageLocation, FoodItem } from '@/types/food'
import type { RecipeMatch, Recipe, RecipeDifficulty } from '@/types/recipe'

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || ''
const API_ENDPOINT = import.meta.env.VITE_CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ClaudeContent[]
}

interface ClaudeContent {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>
}

/**
 * 调用 Claude API
 */
async function callClaudeAPI(messages: ClaudeMessage[], maxTokens = 2048): Promise<string> {
  if (!API_KEY) {
    throw new Error('Claude API Key 未配置，请在 .env 文件中设置 VITE_CLAUDE_API_KEY')
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
  }

  const data: ClaudeResponse = await response.json()
  return data.content[0]?.text || ''
}

/**
 * 从 base64 图片 URL 中提取数据
 */
function extractBase64Data(dataUrl: string): { mediaType: string; data: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/)
  if (!match) {
    throw new Error('无效的图片格式')
  }
  return {
    mediaType: match[1],
    data: match[2],
  }
}

/**
 * 识别图片中的食材
 */
export async function recognizeFoodsFromImage(imageDataUrl: string): Promise<RecognizedFood[]> {
  const { mediaType, data } = extractBase64Data(imageDataUrl)

  const systemPrompt = `你是一个专业的食材识别助手。请分析图片中的食材，并返回 JSON 格式的识别结果。

对于每个识别到的食材，请提供：
- name: 食材名称（中文）
- confidence: 置信度（0-1之间的小数）
- suggestedCategory: 建议分类，必须是以下之一：vegetable, fruit, meat, seafood, dairy, grain, condiment, beverage, other
- suggestedLocation: 建议存储位置，必须是以下之一：refrigerated（冷藏）, frozen（冷冻）, pantry（常温）
- suggestedExpiryDays: 建议保质期天数

请只返回 JSON 数组，不要包含其他文字。如果没有识别到任何食材，返回空数组 []。

示例格式：
[
  {
    "name": "番茄",
    "confidence": 0.95,
    "suggestedCategory": "vegetable",
    "suggestedLocation": "refrigerated",
    "suggestedExpiryDays": 7
  }
]`

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: data,
          },
        },
        {
          type: 'text',
          text: systemPrompt,
        },
      ],
    },
  ]

  const responseText = await callClaudeAPI(messages, 1024)

  // 解析 JSON 响应
  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    console.error('无法解析识别结果:', responseText)
    return []
  }

  try {
    const foods = JSON.parse(jsonMatch[0]) as RecognizedFood[]
    return foods.filter(validateRecognizedFood)
  } catch {
    console.error('JSON 解析失败:', responseText)
    return []
  }
}

/**
 * 验证识别结果的格式
 */
function validateRecognizedFood(food: RecognizedFood): boolean {
  const validCategories: FoodCategory[] = [
    'vegetable', 'fruit', 'meat', 'seafood', 'dairy', 'grain', 'condiment', 'beverage', 'other'
  ]
  const validLocations: StorageLocation[] = ['refrigerated', 'frozen', 'pantry']

  return (
    typeof food.name === 'string' &&
    food.name.length > 0 &&
    typeof food.confidence === 'number' &&
    food.confidence >= 0 &&
    food.confidence <= 1 &&
    validCategories.includes(food.suggestedCategory) &&
    validLocations.includes(food.suggestedLocation) &&
    typeof food.suggestedExpiryDays === 'number' &&
    food.suggestedExpiryDays > 0
  )
}

/**
 * 根据现有食材推荐菜谱
 */
export async function getRecipeRecommendations(foods: FoodItem[]): Promise<RecipeMatch[]> {
  if (foods.length === 0) {
    return []
  }

  const foodNames = foods.map(f => f.name).join('、')

  const systemPrompt = `你是一个专业的烹饪助手。根据用户提供的食材，推荐3-5道可以制作的菜谱。

当前可用的食材：${foodNames}

请返回 JSON 格式的菜谱推荐，包含以下字段：
- recipe: 菜谱信息对象
  - id: 唯一标识（使用 uuid 格式）
  - name: 菜谱名称
  - description: 简短描述（30字以内）
  - ingredients: 所需食材数组，每个元素包含 name（名称）, quantity（数量）, unit（单位：g/kg/ml/L/个/根/颗/片/包/盒/袋）, optional（是否可选）
  - steps: 烹饪步骤数组
  - cookingTime: 烹饪时间（分钟）
  - difficulty: 难度（easy/medium/hard）
  - tags: 标签数组（如：家常菜、快手菜、素食等）
- matchedIngredients: 匹配到的食材名称数组
- missingIngredients: 缺少的食材名称数组
- matchScore: 匹配度分数（0-1之间）

优先推荐匹配度高、食材利用率高的菜谱。请只返回 JSON 数组，不要包含其他文字。

示例格式：
[
  {
    "recipe": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "番茄炒蛋",
      "description": "经典家常菜，简单快手",
      "ingredients": [
        {"name": "番茄", "quantity": 2, "unit": "个", "optional": false},
        {"name": "鸡蛋", "quantity": 3, "unit": "个", "optional": false},
        {"name": "葱", "quantity": 1, "unit": "根", "optional": true}
      ],
      "steps": ["打散鸡蛋", "番茄切块", "炒蛋", "炒番茄", "混合翻炒"],
      "cookingTime": 15,
      "difficulty": "easy",
      "tags": ["家常菜", "快手菜"]
    },
    "matchedIngredients": ["番茄", "鸡蛋"],
    "missingIngredients": ["葱"],
    "matchScore": 0.85
  }
]`

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: systemPrompt,
    },
  ]

  const responseText = await callClaudeAPI(messages, 4096)

  // 解析 JSON 响应
  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    console.error('无法解析菜谱推荐:', responseText)
    return []
  }

  try {
    const recipes = JSON.parse(jsonMatch[0]) as RecipeMatch[]
    return recipes.filter(validateRecipeMatch)
  } catch {
    console.error('JSON 解析失败:', responseText)
    return []
  }
}

/**
 * 验证菜谱匹配结果的格式
 */
function validateRecipeMatch(match: RecipeMatch): boolean {
  const validDifficulties: RecipeDifficulty[] = ['easy', 'medium', 'hard']

  return (
    match.recipe &&
    typeof match.recipe.id === 'string' &&
    typeof match.recipe.name === 'string' &&
    match.recipe.name.length > 0 &&
    typeof match.recipe.description === 'string' &&
    Array.isArray(match.recipe.ingredients) &&
    Array.isArray(match.recipe.steps) &&
    typeof match.recipe.cookingTime === 'number' &&
    validDifficulties.includes(match.recipe.difficulty) &&
    Array.isArray(match.matchedIngredients) &&
    Array.isArray(match.missingIngredients) &&
    typeof match.matchScore === 'number'
  )
}

/**
 * 检查 API 配置是否有效
 */
export function isAPIConfigured(): boolean {
  return !!API_KEY
}
