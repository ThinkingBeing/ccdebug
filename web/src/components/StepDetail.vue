<template>
  <div class="step-detail">
    <div v-if="selectedStep" class="step-detail-content">
      <a-card :bordered="false" class="step-info-card">
        <template #title>
          <div class="step-info-header">
            <span>步骤信息</span>
            <!-- 调试按钮 - 只在Agent_Message和Tool_Use节点显示 -->
            <a-button 
              v-if="shouldShowDebugButton(selectedStep)" 
              type="primary" 
              size="small" 
              @click="openDebugPage"
              class="debug-button"
            >
              <template #icon>
                <icon-bug />
              </template>
              调试
            </a-button>
          </div>
        </template>
        <div class="detail-item">
          <span class="label">步骤ID:</span>
          <span class="value">{{ selectedStep.id }}</span>
        </div>
        <div class="detail-item">
          <span class="label">类型:</span>
          <span class="value">{{ selectedStep.type }}</span>
        </div>
        <div class="detail-item">
          <span class="label">时间:</span>
          <span class="value">{{ formatDateTime(selectedStep.timestamp) }}</span>
        </div>
        <div v-if="selectedStep.tool_name" class="detail-item">
          <span class="label">工具名称:</span>
          <span class="value">{{ selectedStep.tool_name }}</span>
        </div>
      </a-card>

      <!-- 元数据 -->
      <div v-if="selectedStep.metadata && Object.keys(selectedStep.metadata).length > 0" class="metadata-section">
        <h4>元数据</h4>
        <div class="metadata-grid">
          <div
            v-for="[key, value] in Object.entries(selectedStep.metadata)"
            :key="key"
            class="metadata-item"
          >
            <span class="metadata-key">{{ key }}:</span>
            <span class="metadata-value">{{ formatMetadataValue(value) }}</span>
          </div>
        </div>
      </div>

      <!-- 完整日志 -->
      <a-card title="完整日志" :bordered="false" class="log-card">
        <div class="content-container">
          <div class="content-display">
            <!-- 如果是Tool_Use节点且有关联的Tool_Result，显示两者的完整日志 -->
            <div v-if="selectedStep.type === 'tool_call'">
              <!-- Tool_Use 日志 -->
              <div class="log-section">
                <h5 class="log-section-title">Tool_Use 日志</h5>
                <pre class="json-content" v-html="formatJsonWithHighlight(selectedStep.rawLogEntry || {})"></pre>
              </div>
              
              <!-- Tool_Result 日志 (如果存在关联的Tool_Result) -->
              <div v-if="selectedStep.toolResult" class="log-section">
                <h5 class="log-section-title">Tool_Result 日志</h5>
                <pre class="json-content" v-html="formatJsonWithHighlight(selectedStep.toolResult.rawLogEntry || {})"></pre>
              </div>
            </div>
            
            <!-- 其他类型节点显示原有的完整日志 -->
            <div v-else>
              <pre class="json-content" v-html="formatJsonWithHighlight(selectedStep.rawLogEntry || {})"></pre>
            </div>
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '../stores/timeline'
import { Message } from '@arco-design/web-vue'
import { IconCopy, IconBug } from '@arco-design/web-vue/es/icon'

const timelineStore = useTimelineStore()

// 计算属性
const selectedStep = computed(() => timelineStore.selectedStep)
const currentFileId = computed(() => timelineStore.currentFileId)

// 判断是否显示调试按钮
const shouldShowDebugButton = (step: any) => {
  if (!step) return false
  return step.type === 'assistant_message' || step.type === 'tool_call'
}

// 打开调试页面
const openDebugPage = () => {
  if (!selectedStep.value || !currentFileId.value) return
  
  // 构建调试页面URL，传递必要参数
  const debugUrl = `/debug.html?fileId=${currentFileId.value}&stepId=${selectedStep.value.id}&stepType=${selectedStep.value.type}`
  
  // 在新标签页中打开调试页面
  window.open(debugUrl, '_blank')
}

// 本地状态
// 复制内容到剪贴板事件处理
const copyContent = async () => {
  if (!selectedStep.value) return
  
  try {
    let contentToCopy = ''
    
    if (selectedStep.value.type === 'tool_call') {
      // 对于Tool_Use节点，复制Tool_Use和Tool_Result的完整日志
      contentToCopy += 'Tool_Use 日志:\n'
      contentToCopy += JSON.stringify(selectedStep.value.rawLogEntry || {}, null, 2)
      
      if (selectedStep.value.toolResult) {
        contentToCopy += '\n\n---\n\nTool_Result 日志:\n'
        contentToCopy += JSON.stringify(selectedStep.value.toolResult.rawLogEntry || {}, null, 2)
      }
    } else {
      // 其他类型节点复制原有的完整日志
      contentToCopy = JSON.stringify(selectedStep.value.rawLogEntry || {}, null, 2)
    }
    
    await navigator.clipboard.writeText(contentToCopy)
    Message.success('内容已复制到剪贴板')
  } catch (error) {
    Message.error('复制失败')
  }
}

// JSON语法高亮函数
const formatJsonWithHighlight = (obj: any): string => {
  if (!obj) return ''
  
  // 访问 searchKeyword 以建立响应式依赖
  const currentKeyword = timelineStore.searchKeyword
  
  const jsonString = JSON.stringify(obj, null, 2)
  
  // 先进行JSON语法高亮
  let result = jsonString
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
      let cls = 'json-number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key';
        } else {
          cls = 'json-string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    })
  
  // 如果有搜索关键字，再高亮搜索关键字
  if (currentKeyword) {
    const keyword = currentKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${keyword})`, 'gi')
    result = result.replace(regex, '<mark class="search-highlight-keyword">$1</mark>')
  }
  
  return result
}

// 工具函数
const formatDateTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getStepTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'user_message': 'User_Query',
    'assistant_thinking': 'Agent_Thinking', 
    'assistant_message': 'Agent_Message',
    'tool_call': 'Tool_Use',
    'tool_result': 'Tool_Result',
    'agent_child': 'Sub_Agent',
    'agent_end': 'Sub_Agent',
    'sub_agent': 'Sub_Agent'
  }
  return labels[type] || type
}

const formatMetadataValue = (value: any): string => {
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}
</script>

<style scoped>
.step-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.step-detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-info-card {
  margin-bottom: 16px;
}

.step-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.debug-button {
  margin-left: 16px;
  flex-shrink: 0;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.label {
  font-weight: 500;
  color: var(--color-text-2);
  min-width: 80px;
  flex-shrink: 0;
}

.value {
  color: var(--color-text-1);
  word-break: break-all;
}

.metadata-section {
  margin-top: 0px;
}

.metadata-section h4 {
  margin: 0 0 12px 0;
  color: var(--color-text-1);
  font-size: 14px;
}

.metadata-grid {
  display: grid;
  gap: 8px;
}

.metadata-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--color-fill-1);
  border-radius: 4px;
}

.metadata-key {
  font-weight: 500;
  color: var(--color-text-2);
  min-width: 100px;
  flex-shrink: 0;
}

.metadata-value {
  color: var(--color-text-1);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  word-break: break-all;
}

.content-container {
  height: 100%; /* 使用100%高度而不是固定1200px */
  max-height: calc(100vh - 450px); /* 限制最大高度，为头部和底部留出空间 */
  display: flex;
  flex-direction: column;
  gap: 0px;
}

.content-actions {
  display: flex;
  gap: 0px;
}

/* JSON语法高亮样式 */
.json-content {
  background: var(--color-fill-1);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  width: 100%;
  box-sizing: border-box;
}

/* 日志分区样式 */
.log-section {
  margin-bottom: 20px;
}

.log-section:last-child {
  margin-bottom: 0;
}

.log-section-title {
  margin: 0 0 8px 0;
  color: var(--color-text-1);
  font-size: 13px;
  font-weight: 500;
  padding: 4px 8px;
  background: var(--color-fill-2);
  border-radius: 4px;
  border-left: 3px solid var(--color-primary);
}

:deep(.json-key) {
  color: #0066cc;
  font-weight: 500;
}

:deep(.json-string) {
  color: #22863a;
}

:deep(.json-number) {
  color: #005cc5;
}

:deep(.json-boolean) {
  color: #d73a49;
  font-weight: 500;
}

:deep(.json-null) {
  color: #6f42c1;
  font-weight: 500;
}

:deep(.json-bracket) {
  color: #24292e;
  font-weight: bold;
}

/* 搜索关键字高亮样式 */
:deep(.search-highlight-keyword) {
  background-color: #fffb8f;
  color: #d32f2f;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

.content-display {
  margin-bottom: 0px;
}
</style>
