import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FoodItem, StorageLocation, FoodCategory, RecognizedFood, FoodUnit } from '@/types/food'
import { foodRepository, type CreateFoodInput } from '@/db/repositories/foodRepository'
import { DEFAULT_EXPIRY_DAYS } from '@/types/food'

export const useFoodStore = defineStore('food', () => {
  // State
  const foods = ref<FoodItem[]>([])
  const isLoading = ref(false)
  const currentLocationFilter = ref<StorageLocation | null>(null)
  const currentCategoryFilter = ref<FoodCategory | null>(null)

  // Getters
  const activeFoods = computed(() => foods.value.filter((f) => !f.deletedAt))

  const foodsByLocation = computed(() => {
    return (location: StorageLocation) => activeFoods.value.filter((f) => f.location === location)
  })

  const foodsByCategory = computed(() => {
    return (category: FoodCategory) => activeFoods.value.filter((f) => f.category === category)
  })

  const filteredFoods = computed(() => {
    let result = activeFoods.value
    if (currentLocationFilter.value) {
      result = result.filter((f) => f.location === currentLocationFilter.value)
    }
    if (currentCategoryFilter.value) {
      result = result.filter((f) => f.category === currentCategoryFilter.value)
    }
    return result
  })

  const expiringFoods = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)

    return activeFoods.value.filter((f) => {
      const expiry = new Date(f.expiryDate)
      return expiry <= threeDaysLater && expiry >= today
    })
  })

  const expiredFoods = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return activeFoods.value.filter((f) => new Date(f.expiryDate) < today)
  })

  const stats = computed(() => ({
    total: activeFoods.value.length,
    expiring: expiringFoods.value.length,
    expired: expiredFoods.value.length,
    byLocation: {
      refrigerated: foodsByLocation.value('refrigerated').length,
      frozen: foodsByLocation.value('frozen').length,
      pantry: foodsByLocation.value('pantry').length,
    },
  }))

  // Actions
  async function loadFoods() {
    isLoading.value = true
    try {
      foods.value = await foodRepository.getAll()
    } finally {
      isLoading.value = false
    }
  }

  async function addFood(input: CreateFoodInput): Promise<FoodItem> {
    const newFood = await foodRepository.create(input)
    foods.value.push(newFood)
    return newFood
  }

  async function updateFood(id: string, updates: Partial<FoodItem>): Promise<FoodItem> {
    const updated = await foodRepository.update(id, updates)
    const index = foods.value.findIndex((f) => f.id === id)
    if (index !== -1) {
      foods.value[index] = updated
    }
    return updated
  }

  async function deleteFood(id: string): Promise<void> {
    await foodRepository.softDelete(id)
    const index = foods.value.findIndex((f) => f.id === id)
    if (index !== -1) {
      foods.value[index].deletedAt = new Date().toISOString()
    }
  }

  async function addFoodsFromRecognition(recognizedFoods: RecognizedFood[]): Promise<FoodItem[]> {
    const inputs: CreateFoodInput[] = recognizedFoods.map((rf) => {
      const purchaseDate = new Date()
      const expiryDate = new Date(purchaseDate.getTime() + rf.suggestedExpiryDays * 24 * 60 * 60 * 1000)

      return {
        name: rf.name,
        category: rf.suggestedCategory,
        location: rf.suggestedLocation,
        quantity: 1,
        unit: '个' as FoodUnit,
        purchaseDate: purchaseDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
      }
    })

    const newFoods = await foodRepository.bulkCreate(inputs)
    foods.value.push(...newFoods)
    return newFoods
  }

  function setLocationFilter(location: StorageLocation | null) {
    currentLocationFilter.value = location
  }

  function setCategoryFilter(category: FoodCategory | null) {
    currentCategoryFilter.value = category
  }

  return {
    // State
    foods,
    isLoading,
    currentLocationFilter,
    currentCategoryFilter,
    // Getters
    activeFoods,
    foodsByLocation,
    foodsByCategory,
    filteredFoods,
    expiringFoods,
    expiredFoods,
    stats,
    // Actions
    loadFoods,
    addFood,
    updateFood,
    deleteFood,
    addFoodsFromRecognition,
    setLocationFilter,
    setCategoryFilter,
  }
})
