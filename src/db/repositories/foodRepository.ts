import { db } from '@/db'
import type { FoodItem, FoodCategory, StorageLocation } from '@/types/food'
import { v4 as uuidv4 } from 'uuid'

export type CreateFoodInput = Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>

export const foodRepository = {
  async getAll(): Promise<FoodItem[]> {
    return db.foods.where('deletedAt').equals('').or('deletedAt').equals(undefined as unknown as string).toArray()
  },

  async getById(id: string): Promise<FoodItem | undefined> {
    return db.foods.get(id)
  },

  async getByLocation(location: StorageLocation): Promise<FoodItem[]> {
    return db.foods
      .where('location')
      .equals(location)
      .and((item) => !item.deletedAt)
      .toArray()
  },

  async getByCategory(category: FoodCategory): Promise<FoodItem[]> {
    return db.foods
      .where('category')
      .equals(category)
      .and((item) => !item.deletedAt)
      .toArray()
  },

  async getExpiring(days: number = 3): Promise<FoodItem[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

    return db.foods
      .where('expiryDate')
      .between(today.toISOString(), futureDate.toISOString())
      .and((item) => !item.deletedAt)
      .toArray()
  },

  async getExpired(): Promise<FoodItem[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return db.foods
      .where('expiryDate')
      .below(today.toISOString())
      .and((item) => !item.deletedAt)
      .toArray()
  },

  async create(input: CreateFoodInput): Promise<FoodItem> {
    const now = new Date().toISOString()
    const food: FoodItem = {
      ...input,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    }

    await db.foods.add(food)
    return food
  },

  async update(id: string, updates: Partial<FoodItem>): Promise<FoodItem> {
    const now = new Date().toISOString()
    await db.foods.update(id, {
      ...updates,
      updatedAt: now,
      syncStatus: 'pending',
    })

    const updated = await db.foods.get(id)
    if (!updated) throw new Error(`Food item ${id} not found`)
    return updated
  },

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString()
    await db.foods.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    })
  },

  async hardDelete(id: string): Promise<void> {
    await db.foods.delete(id)
  },

  async bulkCreate(inputs: CreateFoodInput[]): Promise<FoodItem[]> {
    const now = new Date().toISOString()
    const foods: FoodItem[] = inputs.map((input) => ({
      ...input,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending' as const,
    }))

    await db.foods.bulkAdd(foods)
    return foods
  },
}
