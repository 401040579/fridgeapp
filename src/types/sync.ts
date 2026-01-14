/** 同步操作类型 */
export type SyncOperation = 'create' | 'update' | 'delete'

/** 同步队列项 */
export interface SyncQueueItem {
  id: string
  entityType: 'food' | 'recipe'
  entityId: string
  operation: SyncOperation
  data: Record<string, unknown>
  timestamp: string
  retryCount: number
  lastError?: string
}

/** 同步冲突 */
export interface SyncConflict {
  id: string
  entityType: 'food' | 'recipe'
  entityId: string
  localData: Record<string, unknown>
  remoteData: Record<string, unknown>
  localTimestamp: string
  remoteTimestamp: string
}
