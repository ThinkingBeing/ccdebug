import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ArcoVue from '@arco-design/web-vue'
import router from './router'
import App from './App.vue'
import '@arco-design/web-vue/dist/arco.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ArcoVue)
app.use(router)

app.mount('#app')