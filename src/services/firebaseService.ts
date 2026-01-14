/**
 * Firebase 服务 - 云同步功能
 */

import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type Firestore,
  type DocumentData,
  Timestamp,
} from 'firebase/firestore'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import type { FoodItem, SyncStatus } from '@/types/food'
import type { SyncQueueItem, SyncOperation } from '@/types/sync'
import { syncQueueRepository } from '@/db/repositories/syncQueueRepository'
import { foodRepository } from '@/db/repositories/foodRepository'

// Firebase 配置
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Firebase 实例
let app: FirebaseApp | null = null
let firestore: Firestore | null = null
let auth: Auth | null = null
let currentUser: User | null = null

// 同步状态
let isSyncing = false
let syncListeners: Array<(status: SyncServiceStatus) => void> = []

export interface SyncServiceStatus {
  isInitialized: boolean
  isAuthenticated: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime: string | null
  error: string | null
}

/**
 * 检查 Firebase 是否已配置
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  )
}

/**
 * 初始化 Firebase
 */
export async function initFirebase(): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase 未配置，跳过云同步初始化')
    return false
  }

  try {
    app = initializeApp(firebaseConfig)
    firestore = getFirestore(app)
    auth = getAuth(app)

    // 监听认证状态
    onAuthStateChanged(auth, (user) => {
      currentUser = user
      notifyListeners()
    })

    // 匿名登录
    await signInAnonymously(auth)
    console.log('Firebase 初始化成功')
    return true
  } catch (error) {
    console.error('Firebase 初始化失败:', error)
    return false
  }
}

/**
 * 获取当前用户 ID
 */
function getUserId(): string | null {
  return currentUser?.uid || null
}

/**
 * 获取用户的食材集合引用
 */
function getFoodsCollectionPath(): string {
  const userId = getUserId()
  if (!userId) throw new Error('用户未认证')
  return `users/${userId}/foods`
}

/**
 * 通知状态监听器
 */
async function notifyListeners(): Promise<void> {
  const status = await getSyncStatus()
  syncListeners.forEach((listener) => listener(status))
}

/**
 * 添加状态监听器
 */
export function addSyncStatusListener(
  listener: (status: SyncServiceStatus) => void
): () => void {
  syncListeners.push(listener)
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener)
  }
}

/**
 * 获取同步状态
 */
export async function getSyncStatus(): Promise<SyncServiceStatus> {
  const pendingCount = await syncQueueRepository.count()
  const lastSyncTime = localStorage.getItem('last_sync_time')

  return {
    isInitialized: !!app,
    isAuthenticated: !!currentUser,
    isSyncing,
    pendingCount,
    lastSyncTime,
    error: null,
  }
}

/**
 * 将食材添加到同步队列
 */
export async function queueFoodSync(
  food: FoodItem,
  operation: SyncOperation
): Promise<void> {
  if (!isFirebaseConfigured()) return

  await syncQueueRepository.add({
    entityType: 'food',
    entityId: food.id,
    operation,
    data: food as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  })

  // 更新本地食材的同步状态
  await foodRepository.update(food.id, { syncStatus: 'pending' })

  // 尝试立即同步（如果在线）
  if (navigator.onLine) {
    processSyncQueue()
  }
}

/**
 * 处理同步队列
 */
export async function processSyncQueue(): Promise<void> {
  if (!firestore || !currentUser || isSyncing) return

  isSyncing = true
  notifyListeners()

  try {
    const pendingItems = await syncQueueRepository.getPending(20)

    for (const item of pendingItems) {
      try {
        await processSyncItem(item)
        await syncQueueRepository.delete(item.id)
      } catch (error) {
        // 更新重试计数
        const newRetryCount = item.retryCount + 1
        if (newRetryCount >= 3) {
          // 超过重试次数，标记为错误
          await foodRepository.update(item.entityId, { syncStatus: 'error' })
          await syncQueueRepository.delete(item.id)
        } else {
          await syncQueueRepository.update(item.id, {
            retryCount: newRetryCount,
            lastError: error instanceof Error ? error.message : '未知错误',
          })
        }
      }
    }

    // 更新最后同步时间
    localStorage.setItem('last_sync_time', new Date().toISOString())
  } finally {
    isSyncing = false
    notifyListeners()
  }
}

/**
 * 处理单个同步项
 */
async function processSyncItem(item: SyncQueueItem): Promise<void> {
  if (!firestore) throw new Error('Firestore 未初始化')

  const collectionPath = getFoodsCollectionPath()
  const docRef = doc(firestore, collectionPath, item.entityId)

  switch (item.operation) {
    case 'create':
    case 'update':
      await setDoc(docRef, {
        ...item.data,
        syncStatus: 'synced',
        serverUpdatedAt: serverTimestamp(),
      })
      await foodRepository.update(item.entityId, { syncStatus: 'synced' })
      break

    case 'delete':
      await deleteDoc(docRef)
      break
  }
}

/**
 * 从云端拉取数据
 */
export async function pullFromCloud(): Promise<FoodItem[]> {
  if (!firestore || !currentUser) return []

  try {
    const collectionPath = getFoodsCollectionPath()
    const querySnapshot = await getDocs(collection(firestore, collectionPath))

    const remoteFoods: FoodItem[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData
      remoteFoods.push({
        id: doc.id,
        name: data.name,
        category: data.category,
        location: data.location,
        quantity: data.quantity,
        unit: data.unit,
        purchaseDate: data.purchaseDate,
        expiryDate: data.expiryDate,
        imageUrl: data.imageUrl,
        notes: data.notes,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        syncStatus: 'synced' as SyncStatus,
        deletedAt: data.deletedAt,
      })
    })

    return remoteFoods
  } catch (error) {
    console.error('拉取云端数据失败:', error)
    return []
  }
}

/**
 * 全量同步 - 合并本地和云端数据
 */
export async function fullSync(): Promise<void> {
  if (!firestore || !currentUser) return

  isSyncing = true
  notifyListeners()

  try {
    // 获取本地数据
    const localFoods = await foodRepository.getAll()

    // 获取云端数据
    const remoteFoods = await pullFromCloud()

    // 创建 ID 映射
    const localMap = new Map(localFoods.map((f) => [f.id, f]))
    const remoteMap = new Map(remoteFoods.map((f) => [f.id, f]))

    // 处理本地有但云端没有的（上传）
    for (const food of localFoods) {
      if (!remoteMap.has(food.id)) {
        await queueFoodSync(food, 'create')
      }
    }

    // 处理云端有但本地没有的（下载）
    for (const food of remoteFoods) {
      if (!localMap.has(food.id)) {
        await foodRepository.create({
          ...food,
          syncStatus: 'synced',
        })
      }
    }

    // 处理双方都有的（冲突解决 - 使用最新的）
    for (const food of localFoods) {
      const remoteFood = remoteMap.get(food.id)
      if (remoteFood) {
        const localTime = new Date(food.updatedAt).getTime()
        const remoteTime = new Date(remoteFood.updatedAt).getTime()

        if (localTime > remoteTime) {
          // 本地更新，上传到云端
          await queueFoodSync(food, 'update')
        } else if (remoteTime > localTime) {
          // 云端更新，更新本地
          await foodRepository.update(food.id, {
            ...remoteFood,
            syncStatus: 'synced',
          })
        }
      }
    }

    // 处理同步队列
    await processSyncQueue()

    localStorage.setItem('last_sync_time', new Date().toISOString())
  } finally {
    isSyncing = false
    notifyListeners()
  }
}

/**
 * 监听网络状态变化
 */
export function setupNetworkListener(): void {
  window.addEventListener('online', () => {
    console.log('网络已连接，开始同步...')
    processSyncQueue()
  })
}

/**
 * 初始化同步服务
 */
export async function initSyncService(): Promise<void> {
  const initialized = await initFirebase()
  if (initialized) {
    setupNetworkListener()
    // 初始化时执行一次全量同步
    if (navigator.onLine) {
      await fullSync()
    }
  }
}
