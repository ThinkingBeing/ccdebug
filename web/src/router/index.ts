import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../components/MainLayout.vue'
import DebugPage from '../components/DebugPage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: MainLayout
  },
  {
    path: '/debug',
    name: 'Debug',
    component: DebugPage
  },
  {
    path: '/debug.html',
    name: 'DebugHtml',
    component: DebugPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router