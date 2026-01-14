<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useFoodStore } from '@/stores/foodStore'
import type { FoodItem, FoodCategory, StorageLocation, FoodUnit } from '@/types/food'
import { CATEGORY_LABELS, LOCATION_LABELS, DEFAULT_EXPIRY_DAYS } from '@/types/food'

const props = defineProps<{
  show: boolean
  food: FoodItem | null
  defaultLocation?: StorageLocation
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  close: []
}>()

const foodStore = useFoodStore()

const formData = ref({
  name: '',
  category: 'other' as FoodCategory,
  location: 'refrigerated' as StorageLocation,
  quantity: 1,
  unit: '个' as FoodUnit,
  purchaseDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  notes: '',
})

const isEdit = computed(() => !!props.food)
const title = computed(() => (isEdit.value ? '编辑食材' : '添加食材'))

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, text]) => ({
  text,
  value,
}))

const locationOptions = Object.entries(LOCATION_LABELS).map(([value, text]) => ({
  text,
  value,
}))

const unitOptions = ['个', '根', '颗', '片', '包', '盒', '袋', 'g', 'kg', 'ml', 'L'].map(
  (u) => ({ text: u, value: u })
)

const showCategoryPicker = ref(false)
const showLocationPicker = ref(false)
const showUnitPicker = ref(false)
const showPurchaseDatePicker = ref(false)
const showExpiryDatePicker = ref(false)

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      if (props.food) {
        formData.value = {
          name: props.food.name,
          category: props.food.category,
          location: props.food.location,
          quantity: props.food.quantity,
          unit: props.food.unit,
          purchaseDate: props.food.purchaseDate.split('T')[0] ?? '',
          expiryDate: props.food.expiryDate.split('T')[0] ?? '',
          notes: props.food.notes || '',
        }
      } else {
        const defaultExpiryDays = DEFAULT_EXPIRY_DAYS['other']
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + defaultExpiryDays)

        formData.value = {
          name: '',
          category: 'other',
          location: props.defaultLocation || 'refrigerated',
          quantity: 1,
          unit: '个',
          purchaseDate: new Date().toISOString().split('T')[0] ?? '',
          expiryDate: expiryDate.toISOString().split('T')[0] ?? '',
          notes: '',
        }
      }
    }
  }
)

watch(
  () => formData.value.category,
  (newCategory) => {
    if (!isEdit.value && formData.value.purchaseDate) {
      const days = DEFAULT_EXPIRY_DAYS[newCategory]
      const expiryDate = new Date(formData.value.purchaseDate)
      expiryDate.setDate(expiryDate.getDate() + days)
      formData.value.expiryDate = expiryDate.toISOString().split('T')[0] ?? ''
    }
  }
)

async function handleSubmit() {
  if (!formData.value.name.trim()) {
    return
  }

  const data = {
    name: formData.value.name.trim(),
    category: formData.value.category,
    location: formData.value.location,
    quantity: formData.value.quantity,
    unit: formData.value.unit,
    purchaseDate: new Date(formData.value.purchaseDate || Date.now()).toISOString(),
    expiryDate: new Date(formData.value.expiryDate || Date.now()).toISOString(),
    notes: formData.value.notes.trim() || undefined,
  }

  if (isEdit.value && props.food) {
    await foodStore.updateFood(props.food.id, data)
  } else {
    await foodStore.addFood(data)
  }

  emit('update:show', false)
  emit('close')
}

function handleClose() {
  emit('update:show', false)
  emit('close')
}

function onCategoryConfirm({ selectedOptions }: { selectedOptions: { value: string }[] }) {
  const selected = selectedOptions[0]
  if (selected) {
    formData.value.category = selected.value as FoodCategory
  }
  showCategoryPicker.value = false
}

function onLocationConfirm({ selectedOptions }: { selectedOptions: { value: string }[] }) {
  const selected = selectedOptions[0]
  if (selected) {
    formData.value.location = selected.value as StorageLocation
  }
  showLocationPicker.value = false
}

function onUnitConfirm({ selectedOptions }: { selectedOptions: { value: string }[] }) {
  const selected = selectedOptions[0]
  if (selected) {
    formData.value.unit = selected.value as FoodUnit
  }
  showUnitPicker.value = false
}

function onPurchaseDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  formData.value.purchaseDate = selectedValues.join('-')
  showPurchaseDatePicker.value = false
}

function onExpiryDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  formData.value.expiryDate = selectedValues.join('-')
  showExpiryDatePicker.value = false
}
</script>

<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    :style="{ height: '80%' }"
    @update:show="$emit('update:show', $event)"
  >
    <div class="food-form">
      <van-nav-bar :title="title" @click-left="handleClose">
        <template #left>
          <van-icon name="cross" size="20" />
        </template>
        <template #right>
          <van-button type="primary" size="small" @click="handleSubmit">
            保存
          </van-button>
        </template>
      </van-nav-bar>

      <van-form>
        <van-cell-group inset>
          <van-field
            v-model="formData.name"
            label="名称"
            placeholder="请输入食材名称"
            required
          />

          <van-field
            v-model="CATEGORY_LABELS[formData.category]"
            label="分类"
            placeholder="请选择分类"
            readonly
            is-link
            @click="showCategoryPicker = true"
          />

          <van-field
            v-model="LOCATION_LABELS[formData.location]"
            label="存储位置"
            placeholder="请选择存储位置"
            readonly
            is-link
            @click="showLocationPicker = true"
          />

          <van-field label="数量">
            <template #input>
              <van-stepper v-model="formData.quantity" min="1" />
            </template>
            <template #button>
              <van-button size="small" @click="showUnitPicker = true">
                {{ formData.unit }}
              </van-button>
            </template>
          </van-field>

          <van-field
            v-model="formData.purchaseDate"
            label="购买日期"
            readonly
            is-link
            @click="showPurchaseDatePicker = true"
          />

          <van-field
            v-model="formData.expiryDate"
            label="过期日期"
            readonly
            is-link
            @click="showExpiryDatePicker = true"
          />

          <van-field
            v-model="formData.notes"
            label="备注"
            type="textarea"
            rows="2"
            placeholder="可选"
          />
        </van-cell-group>
      </van-form>
    </div>

    <!-- Pickers -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round>
      <van-picker
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showLocationPicker" position="bottom" round>
      <van-picker
        :columns="locationOptions"
        @confirm="onLocationConfirm"
        @cancel="showLocationPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showUnitPicker" position="bottom" round>
      <van-picker
        :columns="unitOptions"
        @confirm="onUnitConfirm"
        @cancel="showUnitPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showPurchaseDatePicker" position="bottom" round>
      <van-date-picker
        :model-value="(formData.purchaseDate || '').split('-')"
        @confirm="onPurchaseDateConfirm"
        @cancel="showPurchaseDatePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showExpiryDatePicker" position="bottom" round>
      <van-date-picker
        :model-value="(formData.expiryDate || '').split('-')"
        @confirm="onExpiryDateConfirm"
        @cancel="showExpiryDatePicker = false"
      />
    </van-popup>
  </van-popup>
</template>

<style scoped lang="scss">
.food-form {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
</style>
