<template>
  <div class="main-layout">
    <a-layout class="layout">
      <!-- 头部 -->
      <a-layout-header class="header">
        <div class="header-content">
          <h1 class="title">Claude Code Debug</h1>
          <div class="header-actions">
            <a-button 
              type="outline" 
              size="small"
              :disabled="!timelineStore.currentFileId"
              @click="copyShareLink"
              title="复制分享链接"
            >
              <template #icon>
                <icon-share-alt />
              </template>
              复制链接
            </a-button>
          </div>
        </div>
      </a-layout-header>

      <!-- 主体 -->
      <a-layout class="body">
        <!-- 左侧边栏 - 文件选择器 -->
        <a-layout-sider 
          :width="sidebarWidth" 
          :collapsed="false"
          :collapsible="false"
          class="sidebar"
        >
          <ProjectPanel />
        </a-layout-sider>

        <!-- 左侧拖拽分隔条 -->
        <div 
          class="resize-handle resize-handle-left"
          @mousedown="startResizeSidebar"
        ></div>

        <!-- 主内容区域 -->
        <a-layout-content class="main-content">
          <div class="content-wrapper">
            <!-- 时间线 -->
            <div class="timeline-section">
              <Timeline />
            </div>
            
            <!-- 拖拽分隔条 -->
            <div 
              v-if="!detailPanelCollapsed"
              class="resize-handle"
              @mousedown="startResize"
            ></div>
            
            <!-- 详情面板 -->
            <div 
              v-if="!detailPanelCollapsed" 
              class="detail-section"
              :style="{ width: detailPanelWidth + 'px' }"
            >
              <DetailPanel />
            </div>
          </div>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useTimelineStore } from '../stores/timeline'
import { Message } from '@arco-design/web-vue'
import { IconShareAlt } from '@arco-design/web-vue/es/icon'
import ProjectPanel from './ProjectPanel.vue'
import Timeline from './Timeline.vue'
import DetailPanel from './DetailPanel.vue'

const timelineStore = useTimelineStore()

// 面板状态
const detailPanelCollapsed = ref(false)
const detailPanelWidth = ref(500) // 默认宽度
const sidebarWidth = ref(360) // 左侧面板默认宽度

// 拖拽状态
const isResizing = ref(false)
const isResizingSidebar = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 复制分享链接功能
const copyShareLink = async () => {
  try {
    // 构建分享链接URL
    const url = new URL(window.location.href)
    
    // 清除之前的参数
    url.searchParams.delete('project')
    url.searchParams.delete('file')
    url.searchParams.delete('step')
    url.searchParams.delete('sessionid') // 清除旧的sessionId参数
    
    // 添加当前状态参数
    if (timelineStore.currentFileId) {
      url.searchParams.set('file', timelineStore.currentFileId)
      
      // 如果有选中的步骤，添加步骤ID
      if (timelineStore.selectedStep) {
        url.searchParams.set('step', timelineStore.selectedStep.id)
      }
      
      // 总是添加项目路径，确保链接可以在任何地方使用
      // 优先使用 store 中的项目信息，如果没有则从当前 URL 获取
      let projectDir = null
      if (timelineStore.currentProject?.projectDir) {
        projectDir = timelineStore.currentProject.projectDir
      } else {
        // 从当前 URL 中获取 project 参数
        const currentUrl = new URL(window.location.href)
        projectDir = currentUrl.searchParams.get('project')
      }
      
      if (projectDir) {
        url.searchParams.set('project', projectDir)
      }
    }
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(url.toString())
    
    // 显示成功提示
    Message.success('分享链接已复制到剪贴板')
  } catch (err) {
    console.error('复制链接失败:', err)
    Message.error('复制链接失败，请重试')
  }
}

// 切换面板显示状态
const toggleDetailPanel = () => {
  detailPanelCollapsed.value = !detailPanelCollapsed.value
}

// 拖拽调整详情面板宽度
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = detailPanelWidth.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// 拖拽调整左侧面板宽度
const startResizeSidebar = (e: MouseEvent) => {
  isResizingSidebar.value = true
  startX.value = e.clientX
  startWidth.value = sidebarWidth.value
  
  document.addEventListener('mousemove', handleResizeSidebar)
  document.addEventListener('mouseup', stopResizeSidebar)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  
  const deltaX = startX.value - e.clientX // 向左拖拽为正值
  const newWidth = startWidth.value + deltaX
  
  // 限制最小和最大宽度
  const minWidth = 300
  const maxWidth = window.innerWidth * 0.6
  
  detailPanelWidth.value = Math.max(minWidth, Math.min(maxWidth, newWidth))
}

const handleResizeSidebar = (e: MouseEvent) => {
  if (!isResizingSidebar.value) return
  
  const deltaX = e.clientX - startX.value // 向右拖拽为正值
  const newWidth = startWidth.value + deltaX
  
  // 限制最小和最大宽度
  const minWidth = 200
  const maxWidth = window.innerWidth * 0.5
  
  sidebarWidth.value = Math.max(minWidth, Math.min(maxWidth, newWidth))
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const stopResizeSidebar = () => {
  isResizingSidebar.value = false
  document.removeEventListener('mousemove', handleResizeSidebar)
  document.removeEventListener('mouseup', stopResizeSidebar)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 初始化
onMounted(() => {
  timelineStore.initialize()
})

// 清理事件监听器
onUnmounted(() => {
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('mousemove', handleResizeSidebar)
  document.removeEventListener('mouseup', stopResizeSidebar)
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.layout {
  height: 100vh;
  background: var(--color-bg-1);
}

.header {
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border-2);
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  margin: 0;
  color: var(--color-text-1);
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.body {
  height: calc(100vh - 64px);
}

.sidebar {
  background: var(--color-bg-1);
  border-right: 1px solid var(--color-border-2);
}

.main-content {
  background: var(--color-bg-1);
  overflow: hidden;
}

.content-wrapper {
  height: 100%;
  display: flex;
}

.timeline-section {
  flex: 1;
  overflow: hidden;
}

.resize-handle {
  width: 4px;
  background: var(--color-border-2);
  cursor: col-resize;
  transition: background-color 0.2s;
  position: relative;
}

.resize-handle:hover {
  background: var(--color-primary);
}

.resize-handle-left {
  width: 4px;
  background: var(--color-border-2);
  cursor: col-resize;
  transition: background-color 0.2s;
  position: relative;
  flex-shrink: 0;
}

.resize-handle-left:hover {
  background: var(--color-primary);
}

.resize-handle::before {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
}

.detail-section {
  background: var(--color-bg-1);
  border-left: 1px solid var(--color-border-2);
  overflow: hidden;
  min-width: 300px;
  max-width: 60vw;
  height: 100%;
}
</style>