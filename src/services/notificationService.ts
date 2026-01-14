/**
 * 通知服务 - 处理推送通知和过期提醒
 */

import type { FoodItem } from '@/types/food'
import { CATEGORY_LABELS } from '@/types/food'

// 默认设置
const DEFAULT_SETTINGS = {
  enabled: false,
  reminderDays: 3,
  checkIntervalMs: 60 * 60 * 1000, // 每小时检查一次
}

// 存储键名
const STORAGE_KEY = 'notification_settings'

// 检查定时器
let checkTimer: number | null = null

/**
 * 通知设置
 */
export interface NotificationSettings {
  enabled: boolean
  reminderDays: number
}

/**
 * 加载通知设置
 */
export function loadSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    console.error('加载通知设置失败')
  }
  return { ...DEFAULT_SETTINGS }
}

/**
 * 保存通知设置
 */
export function saveSettings(settings: Partial<NotificationSettings>): NotificationSettings {
  const current = loadSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

/**
 * 检查通知权限
 */
export function checkPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * 请求通知权限
 */
export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知')
    return false
  }

  const permission = await Notification.requestPermission()
  const granted = permission === 'granted'

  if (granted) {
    saveSettings({ enabled: true })
  }

  return granted
}

/**
 * 发送本地通知
 */
export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (checkPermission() !== 'granted') {
    return null
  }

  const notification = new Notification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'fridge-app',
    ...options,
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }

  return notification
}

/**
 * 发送过期提醒通知
 */
export function sendExpiryReminder(foods: FoodItem[]): void {
  if (foods.length === 0) return

  const settings = loadSettings()
  if (!settings.enabled) return

  if (foods.length === 1) {
    const food = foods[0]
    sendNotification('食材即将过期', {
      body: `${food.name}（${CATEGORY_LABELS[food.category]}）将在近日过期，请及时处理。`,
      tag: `expiry-${food.id}`,
    })
  } else {
    const foodNames = foods.slice(0, 3).map(f => f.name).join('、')
    const moreText = foods.length > 3 ? `等 ${foods.length} 种食材` : ''
    sendNotification('多种食材即将过期', {
      body: `${foodNames}${moreText}将在近日过期，请及时处理。`,
      tag: 'expiry-batch',
    })
  }
}

/**
 * 发送已过期通知
 */
export function sendExpiredNotification(foods: FoodItem[]): void {
  if (foods.length === 0) return

  const settings = loadSettings()
  if (!settings.enabled) return

  if (foods.length === 1) {
    const food = foods[0]
    sendNotification('食材已过期', {
      body: `${food.name}（${CATEGORY_LABELS[food.category]}）已过期，请尽快处理。`,
      tag: `expired-${food.id}`,
    })
  } else {
    const foodNames = foods.slice(0, 3).map(f => f.name).join('、')
    const moreText = foods.length > 3 ? `等 ${foods.length} 种食材` : ''
    sendNotification('多种食材已过期', {
      body: `${foodNames}${moreText}已过期，请尽快处理。`,
      tag: 'expired-batch',
    })
  }
}

/**
 * 获取即将过期的食材
 */
export function getExpiringFoods(foods: FoodItem[], reminderDays: number): FoodItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const futureDate = new Date(today.getTime() + reminderDays * 24 * 60 * 60 * 1000)

  return foods.filter(food => {
    if (food.deletedAt) return false
    const expiry = new Date(food.expiryDate)
    return expiry >= today && expiry <= futureDate
  })
}

/**
 * 获取已过期的食材
 */
export function getExpiredFoods(foods: FoodItem[]): FoodItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return foods.filter(food => {
    if (food.deletedAt) return false
    const expiry = new Date(food.expiryDate)
    return expiry < today
  })
}

/**
 * 检查并发送过期提醒
 */
export function checkAndNotify(foods: FoodItem[]): void {
  const settings = loadSettings()
  if (!settings.enabled || checkPermission() !== 'granted') {
    return
  }

  // 获取上次通知时间
  const lastNotifyKey = 'last_expiry_notify'
  const lastNotify = localStorage.getItem(lastNotifyKey)
  const lastNotifyTime = lastNotify ? new Date(lastNotify) : null
  const now = new Date()

  // 每天只发送一次通知
  if (lastNotifyTime) {
    const sameDay =
      lastNotifyTime.getFullYear() === now.getFullYear() &&
      lastNotifyTime.getMonth() === now.getMonth() &&
      lastNotifyTime.getDate() === now.getDate()

    if (sameDay) return
  }

  const expiringFoods = getExpiringFoods(foods, settings.reminderDays)
  const expiredFoods = getExpiredFoods(foods)

  if (expiredFoods.length > 0) {
    sendExpiredNotification(expiredFoods)
  }

  if (expiringFoods.length > 0) {
    sendExpiryReminder(expiringFoods)
  }

  if (expiredFoods.length > 0 || expiringFoods.length > 0) {
    localStorage.setItem(lastNotifyKey, now.toISOString())
  }
}

/**
 * 启动定时检查
 */
export function startPeriodicCheck(getFoods: () => FoodItem[]): void {
  if (checkTimer) {
    clearInterval(checkTimer)
  }

  // 立即检查一次
  checkAndNotify(getFoods())

  // 设置定时检查
  checkTimer = window.setInterval(() => {
    checkAndNotify(getFoods())
  }, DEFAULT_SETTINGS.checkIntervalMs)
}

/**
 * 停止定时检查
 */
export function stopPeriodicCheck(): void {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}

/**
 * 初始化通知服务
 */
export async function initNotificationService(getFoods: () => FoodItem[]): Promise<void> {
  const settings = loadSettings()

  // 如果之前启用了通知，检查权限是否仍然有效
  if (settings.enabled && checkPermission() !== 'granted') {
    saveSettings({ enabled: false })
    return
  }

  if (settings.enabled) {
    startPeriodicCheck(getFoods)
  }
}
