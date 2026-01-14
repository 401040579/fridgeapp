/** 存储位置 */
export type StorageLocation = 'refrigerated' | 'frozen' | 'pantry'

/** 食材分类 */
export type FoodCategory =
  | 'vegetable'
  | 'fruit'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'grain'
  | 'condiment'
  | 'beverage'
  | 'other'

/** 食材单位 */
export type FoodUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'L'
  | '个'
  | '根'
  | '颗'
  | '片'
  | '包'
  | '盒'
  | '袋'

/** 同步状态 */
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error'

/** 食材实体 */
export interface FoodItem {
  id: string
  name: string
  category: FoodCategory
  location: StorageLocation
  quantity: number
  unit: FoodUnit
  purchaseDate: string
  expiryDate: string
  imageUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
  syncStatus: SyncStatus
  deletedAt?: string
}

/** AI 识别结果 */
export interface RecognizedFood {
  name: string
  confidence: number
  suggestedCategory: FoodCategory
  suggestedLocation: StorageLocation
  suggestedExpiryDays: number
}

/** 存储位置中文映射 */
export const LOCATION_LABELS: Record<StorageLocation, string> = {
  refrigerated: '冷藏室',
  frozen: '冷冻室',
  pantry: '常温储存',
}

/** 分类中文映射 */
export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  vegetable: '蔬菜',
  fruit: '水果',
  meat: '肉类',
  seafood: '海鲜',
  dairy: '乳制品',
  grain: '谷物',
  condiment: '调味料',
  beverage: '饮料',
  other: '其他',
}

/** 分类图标映射 */
export const CATEGORY_ICONS: Record<FoodCategory, string> = {
  vegetable: 'flower-o',
  fruit: 'gift-o',
  meat: 'shop-o',
  seafood: 'fire-o',
  dairy: 'gem-o',
  grain: 'balance-o',
  condiment: 'filter-o',
  beverage: 'water-o',
  other: 'ellipsis',
}

/** 默认保质期天数 */
export const DEFAULT_EXPIRY_DAYS: Record<FoodCategory, number> = {
  vegetable: 7,
  fruit: 5,
  meat: 3,
  seafood: 2,
  dairy: 14,
  grain: 180,
  condiment: 365,
  beverage: 30,
  other: 14,
}
