<template>
  <div class="search-panel">
    <!-- 搜索框区域 -->
    <div class="search-header">
      <a-input-search
        v-model="searchKeyword"
        placeholder="请输入搜索关键字"
        :loading="searchLoading"
        @search="handleSearch"
        @clear="handleClear"
        class="search-input"
      />
      <div v-if="searchResults.length > 0" class="search-summary">
        找到 {{ totalResultCount }} 个结果，分布在 {{ searchResults.length }} 个文件中
      </div>
    </div>

    <!-- 搜索结果展示 -->
    <div class="search-content">
      <!-- 加载状态 -->
      <div v-if="searchLoading" class="loading-container">
        <a-spin size="large" />
        <p>正在搜索中...</p>
      </div>

      <!-- 无结果状态 -->
      <div v-else-if="!searchLoading && searchKeyword && searchResults.length === 0" class="empty-state">
        <a-empty description="未找到匹配的结果" />
      </div>

      <!-- 搜索结果列表 -->
      <div v-else-if="searchResults.length > 0" class="results-container">
        <a-collapse 
          v-model:active-key="activeKeys" 
          :bordered="false"
          class="search-collapse"
        >
          <a-collapse-item 
            v-for="fileResult in searchResults" 
            :key="fileResult.fileId"
            :header="`${fileResult.fileName} (${fileResult.resultCount}个结果)`"
            class="file-result-item"
          >
            <div class="file-results">
              <div 
                v-for="(result, index) in fileResult.results" 
                :key="result.stepId"
                class="result-item"
                @click="handleResultClick(result)"
              >
                <!-- 标题层 -->
                <div class="result-header">
                  <a-tag 
                    :color="getStepTypeColor(result.stepType, result)"
                    size="small"
                    class="step-type-tag"
                  >
                    {{ getStepTypeLabel(result.stepType, result) }}
                  </a-tag>
                  <span class="step-index">#{{ result.stepIndex }}</span>
                  <span class="step-time">{{ formatTime(result.timestamp) }}</span>
                </div>
                
                <!-- 内容层 -->
                <div class="result-content">
                  <div 
                    class="matched-text" 
                    v-html="highlightKeyword(result.matchedContent)"
                  ></div>
                  <div class="matched-field">匹配字段: {{ result.matchedField }}</div>
                </div>
              </div>
            </div>
          </a-collapse-item>
        </a-collapse>
      </div>

      <!-- 初始状态 -->
      <div v-else class="initial-state">
        <a-empty description="请输入关键字开始搜索" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTimelineStore } from '../stores/timeline'
import { Message } from '@arco-design/web-vue'
import type { FileSearchResult, SearchResultItem } from '../types/index'

const timelineStore = useTimelineStore()

// 响应式数据
const searchKeyword = ref('')
const searchLoading = ref(false)
const searchResults = ref<FileSearchResult[]>([])
const activeKeys = ref<string[]>([])

// 计算属性
const totalResultCount = computed(() => {
  return searchResults.value.reduce((total, file) => total + file.resultCount, 0)
})

// 搜索处理
const handleSearch = async (keyword: string) => {
  if (!keyword.trim()) {
    Message.warning('请输入搜索关键字')
    return
  }
  
  searchLoading.value = true
  activeKeys.value = []
  
  try {
    // 调用 store 的搜索方法
    searchResults.value = await timelineStore.performSearch(keyword.trim())
    
    // 默认展开第一个有结果的文件
    if (searchResults.value.length > 0) {
      activeKeys.value = [searchResults.value[0].fileId]
    }
  } catch (error) {
    console.error('搜索失败:', error)
    Message.error('搜索失败，请重试')
  } finally {
    searchLoading.value = false
  }
}

// 清空搜索
const handleClear = () => {
  searchKeyword.value = ''
  searchResults.value = []
  activeKeys.value = []
  // 同时清除 store 中的搜索关键字
  timelineStore.searchKeyword = ''
}

// 点击搜索结果
const handleResultClick = async (result: SearchResultItem) => {
  try {
    // 如果结果不在当前文件中，需要切换文件
    if (result.fileId !== timelineStore.currentFileId) {
      await timelineStore.loadFile(result.fileId)
    }
    
    // 等待文件加载完成后，定位到对应步骤
    setTimeout(() => {
      let targetStep = timelineStore.currentConversation?.steps.find(s => s.id === result.stepId)
      
      // 如果是 tool_result 或 agent_child_result 类型，需要找到对应的节点
      if (targetStep && (targetStep.type === 'tool_result' || targetStep.type === 'agent_child_result')) {
        // tool_result 和 agent_child_result 已经被合并到对应的节点中
        const parentStep = timelineStore.currentConversation?.steps.find(s => {
          if ((s.type === 'tool_call' || s.type === 'agent_child') && s.tool_use_id) {
            // 检查 tool_use_id 是否匹配
            return s.tool_use_id === targetStep.tool_use_id;
          }
          return false
        })
        
        if (parentStep) {
          targetStep = parentStep
        } else {
          // 如果没找到，可能需要通过其他方式关联
          console.warn(`无法找到对应的父节点，${targetStep.type} id:`, targetStep.id)
        }
      }
      
      if (targetStep) {
        // 先选中步骤
        timelineStore.selectStep(targetStep)
        
        // 确保该步骤是展开状态
        timelineStore.ensureStepExpanded(targetStep.id)
        
        // 切换到详情面板 Tab
        setTimeout(() => {
          const detailTab = document.querySelector('.detail-tabs [data-key="detail"]') as HTMLElement
          if (detailTab) {
            detailTab.click()
          }
        }, 100)
      }
    }, 200)
  } catch (error) {
    console.error('跳转失败:', error)
    Message.error('跳转失败，请重试')
  }
}

// 高亮关键字
const highlightKeyword = (text: string): string => {
  if (!searchKeyword.value) return text
  
  const keyword = searchKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

// 获取步骤类型标签颜色
const getStepTypeColor = (type: string, result?: SearchResultItem): string => {
  //如果是tool_result，而且其tool_use_id存在对应的agent_child类型的日志，则当前类型改为agent_child_result
  if (type === 'tool_result' && result && result.tool_use_id) {
    // 查找当前对话中是否有对应的 agent_child
    const agentChild = timelineStore.currentConversation?.steps.find(s => 
      s.type === 'agent_child' && s.tool_use_id === result.tool_use_id
    )
    if (agentChild) {
      type = 'agent_child_result'
    }
  }
  
  const colorMap: Record<string, string> = {
    'user_message': '#1890ff',
    'assistant_thinking': '#faad14',
    'assistant_message': '#52c41a',
    'tool_call': '#722ed1',
    'tool_result': '#722ed1',
    'agent_child': '#eb2f96',
    'agent_child_result': 'cyan',
    'agent_end': 'cyan',
    'sub_agent': 'cyan'
  }
  return colorMap[type] || 'gray'
}

// 获取步骤类型标签文本
const getStepTypeLabel = (type: string, result?: SearchResultItem): string => {
  //如果是tool_result，而且其tool_use_id存在对应的agent_child类型的日志，则当前类型改为agent_child_result
  if (type === 'tool_result' && result && result.tool_use_id) {
    // 查找当前对话中是否有对应的 agent_child
    const agentChild = timelineStore.currentConversation?.steps.find(s => 
      s.type === 'agent_child' && s.tool_use_id === result.tool_use_id
    )
    if (agentChild) {
      type = 'agent_child_result'
    }
  }
  
  const labels: Record<string, string> = {
    'user_message': 'User_Query',
    'assistant_thinking': 'Agent_Thinking',
    'assistant_message': 'Agent_Message',
    'tool_call': 'Tool_Use',
    'tool_result': 'Tool_Result',
    'agent_child': 'Sub_Agent',
    'agent_child_result': 'Sub_Agent_Result',
    'agent_end': 'Sub_Agent',
    'sub_agent': 'Sub_Agent'
  }
  const resultLabel = labels[type] || type
  return resultLabel
}

// 格式化时间
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 防抖搜索
let searchTimer: NodeJS.Timeout | null = null
watch(searchKeyword, (newKeyword) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  
  if (newKeyword.trim()) {
    searchTimer = setTimeout(() => {
      handleSearch(newKeyword)
    }, 300)
  } else {
    handleClear()
  }
})
</script>

<style scoped>
.search-panel {
  height: 100%; /* 使用100%高度而不是固定1200px */
  max-height: calc(100vh - 120px); /* 限制最大高度，为头部和底部留出空间 */
  display: flex;
  flex-direction: column;
  background: var(--color-bg-1);
  overflow: hidden; /* 防止内容溢出 */
}

.search-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
  flex-shrink: 0; /* 防止头部被压缩 */
}

.search-input {
  margin-bottom: 8px;
}

.search-summary {
  font-size: 12px;
  color: var(--color-text-3);
}

.search-content {
  flex: 1;
  overflow-y: auto; /* 自动显示滚动条 */
  padding: 16px;
  min-height: 0; /* 确保flex子元素能正确收缩 */
  position: relative; /* 创建层叠上下文 */
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 16px;
}

.empty-state,
.initial-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.results-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-collapse {
  background: transparent;
}

.search-collapse :deep(.arco-collapse-item) {
  margin-bottom: 8px;
}

.search-collapse :deep(.arco-collapse-item-content-box) {
  padding: 0;
}

.file-result-item {
  background: var(--color-fill-1);
  border-radius: 6px;
  margin-bottom: 8px;
}

.file-result-item :deep(.arco-collapse-item-header) {
  background: var(--color-fill-2);
  border-radius: 6px 6px 0 0;
  font-weight: 500;
}

.file-result-item :deep(.arco-collapse-item-content) {
  padding: 0;
  background: var(--color-fill-1);
  border-radius: 0 0 6px 6px;
}

.file-results {
  padding: 8px;
  max-height: 500px; /* 设置最大高度，超过时显示滚动条 */
  overflow-y: auto; /* 垂直方向自动滚动 */
}

.result-item {
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid var(--color-border-1);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: var(--color-fill-2);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.step-type-tag {
  flex-shrink: 0;
}

.step-index {
  font-size: 12px;
  color: var(--color-text-3);
  font-weight: 500;
}

.step-time {
  font-size: 12px;
  color: var(--color-text-3);
  margin-left: auto;
}

.result-content {
  font-size: 13px;
  line-height: 1.5;
}

.matched-text {
  color: var(--color-text-1);
  margin-bottom: 4px;
  word-break: break-all;
}

.matched-field {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 关键字高亮样式 */
:deep(.search-highlight) {
  background: #fff3cd;
  color: #856404;
  padding: 1px 2px;
  border-radius: 2px;
}
</style>
