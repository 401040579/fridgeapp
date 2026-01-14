import { db } from '@/db'
import type { SyncQueueItem } from '@/types/sync'
import { v4 as uuidv4 } from 'uuid'

export type CreateSyncQueueInput = Omit<SyncQueueItem, 'id'>

export const syncQueueRepository = {
  async getAll(): Promise<SyncQueueItem[]> {
    return db.syncQueue.toArray()
  },

  async getPending(limit: number = 10): Promise<SyncQueueItem[]> {
    return db.syncQueue.orderBy('timestamp').limit(limit).toArray()
  },

  async getByEntityId(entityId: string): Promise<SyncQueueItem[]> {
    return db.syncQueue.where('entityId').equals(entityId).toArray()
  },

  async add(input: CreateSyncQueueInput): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      ...input,
      id: uuidv4(),
    }

    await db.syncQueue.add(item)
    return item
  },

  async update(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    await db.syncQueue.update(id, updates)
  },

  async delete(id: string): Promise<void> {
    await db.syncQueue.delete(id)
  },

  async deleteByEntityId(entityId: string): Promise<void> {
    await db.syncQueue.where('entityId').equals(entityId).delete()
  },

  async clear(): Promise<void> {
    await db.syncQueue.clear()
  },

  async count(): Promise<number> {
    return db.syncQueue.count()
  },
}
