import Dexie, { type Table } from 'dexie'
import type { FoodItem } from '@/types/food'
import type { Recipe } from '@/types/recipe'
import type { SyncQueueItem } from '@/types/sync'

export class FridgeDatabase extends Dexie {
  foods!: Table<FoodItem, string>
  recipes!: Table<Recipe, string>
  syncQueue!: Table<SyncQueueItem, string>

  constructor() {
    super('FridgeAppDB')

    this.version(1).stores({
      foods: 'id, name, category, location, expiryDate, syncStatus, deletedAt',
      recipes: 'id, name, *tags',
      syncQueue: 'id, entityType, entityId, timestamp',
    })
  }
}

export const db = new FridgeDatabase()

export async function initDatabase(): Promise<void> {
  try {
    await db.open()
    console.log('IndexedDB initialized successfully')
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error)
    throw error
  }
}
