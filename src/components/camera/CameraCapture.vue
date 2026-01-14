<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { RecognizedFood } from '@/types/food'

const emit = defineEmits<{
  recognized: [foods: RecognizedFood[]]
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const capturedImage = ref<string | null>(null)
const isCameraActive = ref(false)
const isRecognizing = ref(false)
const error = ref<string | null>(null)

let stream: MediaStream | null = null

onMounted(() => {
  startCamera()
})

onUnmounted(() => {
  stopCamera()
})

async function startCamera() {
  try {
    error.value = null
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })

    if (videoRef.value) {
      videoRef.value.srcObject = stream
      isCameraActive.value = true
    }
  } catch (e) {
    error.value = '无法访问相机，请检查权限设置'
    console.error('Camera error:', e)
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  isCameraActive.value = false
}

function captureImage() {
  if (!videoRef.value || !canvasRef.value) return

  const video = videoRef.value
  const canvas = canvasRef.value
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(video, 0, 0)
    capturedImage.value = canvas.toDataURL('image/jpeg', 0.8)
    stopCamera()
  }
}

function retake() {
  capturedImage.value = null
  startCamera()
}

async function handleFileSelect(file: { content: string }) {
  capturedImage.value = file.content
  stopCamera()
}

async function recognize() {
  if (!capturedImage.value) return

  isRecognizing.value = true
  error.value = null

  try {
    // TODO: 调用 Claude Vision API
    // 暂时使用模拟数据
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockFoods: RecognizedFood[] = [
      {
        name: '番茄',
        confidence: 0.95,
        suggestedCategory: 'vegetable',
        suggestedLocation: 'refrigerated',
        suggestedExpiryDays: 7,
      },
      {
        name: '黄瓜',
        confidence: 0.88,
        suggestedCategory: 'vegetable',
        suggestedLocation: 'refrigerated',
        suggestedExpiryDays: 5,
      },
      {
        name: '鸡蛋',
        confidence: 0.92,
        suggestedCategory: 'other',
        suggestedLocation: 'refrigerated',
        suggestedExpiryDays: 14,
      },
    ]

    emit('recognized', mockFoods)
  } catch (e) {
    error.value = '识别失败，请重试'
    console.error('Recognition error:', e)
  } finally {
    isRecognizing.value = false
  }
}
</script>

<template>
  <div class="camera-capture">
    <!-- 预览区域 -->
    <div class="preview-area">
      <video
        v-show="isCameraActive && !capturedImage"
        ref="videoRef"
        autoplay
        playsinline
        class="camera-preview"
      />

      <img
        v-if="capturedImage"
        :src="capturedImage"
        class="captured-image"
        alt="captured"
      />

      <div v-if="!isCameraActive && !capturedImage" class="placeholder">
        <van-icon name="photograph" size="48" color="#999" />
        <p>点击下方按钮开始拍照</p>
      </div>

      <div v-if="error" class="error-overlay">
        <van-icon name="warning-o" size="48" color="#f44336" />
        <p>{{ error }}</p>
        <van-button size="small" @click="startCamera">重试</van-button>
      </div>
    </div>

    <!-- 隐藏的 canvas 用于截图 -->
    <canvas ref="canvasRef" style="display: none" />

    <!-- 控制按钮 -->
    <div class="controls">
      <template v-if="!capturedImage">
        <van-button
          type="primary"
          round
          size="large"
          icon="photograph"
          :disabled="!isCameraActive"
          @click="captureImage"
        >
          拍照
        </van-button>

        <van-uploader
          :after-read="handleFileSelect"
          :max-count="1"
          accept="image/*"
          class="album-btn"
        >
          <van-button round icon="photo-o">相册</van-button>
        </van-uploader>
      </template>

      <template v-else>
        <van-button round @click="retake">重拍</van-button>
        <van-button
          type="primary"
          round
          :loading="isRecognizing"
          loading-text="识别中..."
          @click="recognize"
        >
          确认识别
        </van-button>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.camera-capture {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  overflow: hidden;
}

.camera-preview,
.captured-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.placeholder {
  text-align: center;
  color: #999;

  p {
    margin-top: 12px;
  }
}

.error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;

  p {
    margin: 12px 0;
  }
}

.controls {
  padding: 20px;
  display: flex;
  justify-content: center;
  gap: 16px;
  background: #fff;
}

.album-btn {
  :deep(.van-uploader__input-wrapper) {
    width: auto;
  }
}
</style>
