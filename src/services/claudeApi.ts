import type { RecognizedFood, FoodCategory, StorageLocation } from '@/types/food'

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
const CLAUDE_API_ENDPOINT =
  import.meta.env.VITE_CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: ClaudeContent[]
}

type ClaudeContent =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

interface ClaudeResponse {
  content: { type: 'text'; text: string }[]
}

interface ParsedFoodItem {
  name: string
  confidence: number
  category: string
  location: string
  expiryDays: number
}

/**
 * 从 base64 data URL 中提取纯 base64 数据和媒体类型
 */
function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches || !matches[1] || !matches[2]) {
    throw new Error('Invalid data URL format')
  }
  return {
    mediaType: matches[1],
    data: matches[2],
  }
}

/**
 * 映射分类字符串到类型
 */
function mapCategory(category: string): FoodCategory {
  const categoryMap: Record<string, FoodCategory> = {
    蔬菜: 'vegetable',
    vegetable: 'vegetable',
    水果: 'fruit',
    fruit: 'fruit',
    肉类: 'meat',
    meat: 'meat',
    海鲜: 'seafood',
    seafood: 'seafood',
    乳制品: 'dairy',
    dairy: 'dairy',
    谷物: 'grain',
    grain: 'grain',
    调味料: 'condiment',
    condiment: 'condiment',
    饮料: 'beverage',
    beverage: 'beverage',
  }
  return categoryMap[category.toLowerCase()] || 'other'
}

/**
 * 映射存储位置字符串到类型
 */
function mapLocation(location: string): StorageLocation {
  const locationMap: Record<string, StorageLocation> = {
    冷藏: 'refrigerated',
    冷藏室: 'refrigerated',
    refrigerated: 'refrigerated',
    冷冻: 'frozen',
    冷冻室: 'frozen',
    frozen: 'frozen',
    常温: 'pantry',
    常温储存: 'pantry',
    pantry: 'pantry',
  }
  return locationMap[location] || 'refrigerated'
}

/**
 * 调用 Claude Vision API 识别图片中的食材
 */
export async function recognizeFoodFromImage(imageDataUrl: string): Promise<RecognizedFood[]> {
  if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your_claude_api_key_here') {
    throw new Error('请配置 VITE_CLAUDE_API_KEY 环境变量')
  }

  const { mediaType, data } = parseDataUrl(imageDataUrl)

  const systemPrompt = `你是一个食材识别助手。请分析图片中的食材，返回 JSON 格式的识别结果。

对于每个识别到的食材，请提供：
- name: 食材名称（中文）
- confidence: 置信度（0-1之间的小数）
- category: 分类（vegetable/fruit/meat/seafood/dairy/grain/condiment/beverage/other）
- location: 建议存储位置（refrigerated/frozen/pantry）
- expiryDays: 建议保质期天数

请只返回 JSON 数组，不要有其他文字。如果图片中没有食材，返回空数组 []。

示例返回格式：
[
  {"name": "番茄", "confidence": 0.95, "category": "vegetable", "location": "refrigerated", "expiryDays": 7},
  {"name": "牛肉", "confidence": 0.88, "category": "meat", "location": "frozen", "expiryDays": 30}
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
          text: '请识别这张图片中的所有食材，并按要求的 JSON 格式返回结果。',
        },
      ],
    },
  ]

  const response = await fetch(CLAUDE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Claude API error:', errorText)
    throw new Error(`API 请求失败: ${response.status}`)
  }

  const result: ClaudeResponse = await response.json()
  const textContent = result.content.find((c) => c.type === 'text')

  if (!textContent) {
    throw new Error('API 返回格式错误')
  }

  // 解析 JSON 响应
  let parsedFoods: ParsedFoodItem[]
  try {
    // 提取 JSON 部分（处理可能的 markdown 代码块）
    let jsonText = textContent.text.trim()
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1].trim()
    }
    parsedFoods = JSON.parse(jsonText)
  } catch {
    console.error('Failed to parse response:', textContent.text)
    throw new Error('无法解析识别结果')
  }

  // 转换为 RecognizedFood 类型
  return parsedFoods.map((food) => ({
    name: food.name,
    confidence: food.confidence,
    suggestedCategory: mapCategory(food.category),
    suggestedLocation: mapLocation(food.location),
    suggestedExpiryDays: food.expiryDays,
  }))
}
