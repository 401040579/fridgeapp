import { createApp } from 'vue'
import { pinia } from '@/stores'
import router from '@/router'
import App from './App.vue'

// Vant 样式
import 'vant/lib/index.css'

const app = createApp(App)

app.use(pinia)
app.use(router)

app.mount('#app')
