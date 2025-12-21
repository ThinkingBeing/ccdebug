<template>
  <div class="timeline-container">
    <div v-if="loading" class="loading">
      <a-spin :size="32" />
      <p>加载中...</p>
    </div>
    
    <div v-else class="timeline-content">
      <!-- 空状态提示 -->
      <div v-if="!currentConversation || !currentConversation.steps || currentConversation.steps.length === 0" class="empty-state">
        <a-empty description="">
          <template #image>
            <icon-file-image :size="48" />
          </template>
          <div class="empty-message">
            <p class="empty-title">无对话数据</p>
            <p class="empty-description">未从当前会话日志中提取到对话数据，请选择其他会话。</p>
            <p class="empty-hint">此文件可能是会话摘要或尚未记录任何交互</p>
          </div>
        </a-empty>
      </div>

      <!-- 时间线 -->
      <div class="timeline-wrapper" v-else-if="currentConversation">
        <h2 class="timeline-title">{{ currentConversation.title }}</h2>
        <div class="timeline-main">
          <div 
            v-for="(step, index) in processedSteps" 
            :key="step.id"
            class="timeline-item"
            :class="[
              `step-${step.type.toLowerCase().replace('_', '-')}`,
              { 
                'selected': selectedStep?.id === step.id,
                'has-tool-result': step.toolResult,
                'expanded': isExpanded(step.id)
              }
            ]"
            @click="selectStep(step)"
          >
            <!-- 时间显示 -->
            <div class="timeline-time" v-if="formatTime(step.timestamp)">
              {{ formatTime(step.timestamp) }}
            </div>
            
            <!-- 连接线和节点 -->
            <div class="timeline-connector">
              <div 
                class="timeline-dot" 
                :style="{ backgroundColor: getNodeColor(step.type) }"
                :title="`${getNodeTypeLabel(step.type)} - ${formatTime(step.timestamp)}`"
              >
                <span class="step-number">{{ step.originalIndex }}</span>
              </div>
              <div v-if="index < processedSteps.length - 1" class="timeline-line"></div>
            </div>
            
            <!-- 内容卡片 -->
            <div class="timeline-content-card" :data-step-id="step.id">
              <div class="card-header" @click.stop="handleHeaderClick(step)">
                <div class="header-left">
                  <span 
                    class="step-type-tag"
                    :title="getStepTypeDescription(step.type)"
                  >{{ getNodeTypeLabel(step.type) }}</span>
                  <span v-if="calculateDuration(step)" :class="['duration-tag', calculateDuration(step).class]">{{ calculateDuration(step).text }}</span>
                </div>
                <button 
                  v-if="shouldShowExpandButton(step)"
                  class="expand-button"
                  @click.stop="toggleExpanded(step.id)"
                >
                  {{ isExpanded(step.id) ? '收起' : '展开' }}
                </button>
              </div>
              
              <div 
                class="card-content"
                :class="{ 
                  'content-collapsed': !isExpanded(step.id) && shouldShowExpandButton(step),
                  'content-expanded': isExpanded(step.id)
                }"
              >
                <!-- User Query 节点 -->
                <div v-if="step.type === 'user_message'" class="user-query-content">
                  <div class="content-text">{{ getDisplayContent(step) }}</div>
                </div>
                
                <!-- Agent Thinking 节点 -->
                <div v-else-if="step.type === 'assistant_thinking'" class="agent-thinking-content">
                  <div class="thinking-indicator">
                    <span>思考中...</span>
                  </div>
                  <div class="content-text">{{ getDisplayContent(step) }}</div>
                </div>
                
                <!-- Agent Message 节点 -->
                <div v-else-if="step.type === 'assistant_message'" class="agent-message-content">
                  <div class="content-text">{{ getDisplayContent(step) }}</div>
                </div>
                
                <!-- Tool Use 节点 -->
                <div v-else-if="step.type === 'tool_call'" class="tool-use-content">
                  <div class="tool-header">
                    <span class="tool-name">工具名称：{{ step.tool_name || '工具调用' }}</span>
                    <br/><span class="tool-name">工具参数：</span>
                  </div>
                  <div class="tool-parameters" :class="{ 'content-truncated': !isExpanded(step.id) && shouldShowExpandButton(step) && isContentTruncated(step) }">
                    <pre v-html="getHighlightedContent(step, JSON.stringify(step.parameters || {}, null, 2))"></pre>
                  </div>
                  
                  <!-- 关联的Tool Result显示 -->
                  <div v-if="step.toolResult" class="tool-result-container">
                    <div class="connection-line"></div>
                    <div class="tool-result-card">
                      <div class="result-header">
                        <span class="result-type-tag">Tool Result</span>
                      </div>
                      <div class="result-content" :class="{ 'content-truncated': !isExpanded(step.id) && shouldShowExpandButton(step) && isContentTruncated(step) }">
                        <pre v-html="getHighlightedToolResult(step, isExpanded(step.id))"></pre>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Sub Agent 节点 -->
                <div v-else-if="step.type === 'agent_child'" class="sub-agent-content">
                  <div class="sub-agent-header">
                    <span class="sub-agent-type">子代理类型：</span>
                    <a 
                      v-if="step.subagent_type && step.subagent_type !== '未知'"
                      class="sub-agent-link"
                      @click.stop="handleSubAgentClick(step)"
                      :title="`点击跳转到 ${step.subagent_type} 的日志文件`"
                    >
                      {{ step.subagent_type }}
                    </a>
                    <span v-else class="sub-agent-type-text">{{ step.subagent_type || '未知' }}</span>
                    <br/><span class="sub-agent-name">调用参数：</span>
                  </div>
                  <div class="sub-agent-parameters" :class="{ 'content-truncated': !isExpanded(step.id) && shouldShowExpandButton(step) && isContentTruncated(step) }">
                    <pre v-html="getHighlightedContent(step, JSON.stringify(step.parameters || {}, null, 2))"></pre>
                  </div>
                  
                  <!-- 关联的Tool Result显示 -->
                  <div v-if="step.toolResult" class="tool-result-container">
                    <div class="connection-line"></div>
                    <div class="tool-result-card">
                      <div class="result-header">
                        <span class="result-type-tag">Sub Agent Result</span>
                      </div>
                      <div class="result-content" :class="{ 'content-truncated': !isExpanded(step.id) && shouldShowExpandButton(step) && isContentTruncated(step) }">
                        <pre v-html="getHighlightedToolResult(step, isExpanded(step.id))"></pre>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 默认节点 -->
                <div v-else class="default-content">
                  <div class="content-text">{{ getDisplayContent(step) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineOptions } from 'vue'
import { Tooltip as ATooltip } from '@arco-design/web-vue'
import { IconFileImage } from '@arco-design/web-vue/es/icon'
import { useTimelineStore } from '../stores/timeline'
import type { ConversationStep } from '../types'

// 统一前端调试日志开关：通过URL参数 debug=1 或 localStorage.CCDEBUG_DEBUG=1 开启
const DEBUG_LOGS = (() => {
  if (typeof window !== 'undefined') {
    try {
      const params = new URL(window.location.href).searchParams
      return params.get('debug') === '1' || (window.localStorage?.getItem('CCDEBUG_DEBUG') === '1')
    } catch (_) {
      return false
    }
  }
  return false
})()
const dlog = (...args: any[]) => { if (DEBUG_LOGS) console.log(...args) }
const dwarn = (...args: any[]) => { if (DEBUG_LOGS) console.warn(...args) }

// 在Vue 3 script setup中注册组件
defineOptions({
  components: {
    ATooltip
  }
})

const timelineStore = useTimelineStore()
const loading = computed(() => timelineStore.loading)
const conversations = computed(() => timelineStore.conversations)
const currentConversation = computed(() => timelineStore.currentConversation)
const selectedStep = computed(() => timelineStore.selectedStep)

// 展开状态管理
const expandedSteps = ref<Set<string>>(new Set())

// 计算属性：处理步骤数据，将tool_result与tool_use关联
const processedSteps = computed(() => {
  if (!currentConversation.value?.steps) return []
  
  const steps = currentConversation.value.steps
  dlog('🔍 processedSteps - 原始步骤数量:', steps.length)
  
  const toolUseMap = new Map<string, ConversationStep & { toolResult?: ConversationStep }>()
  
  // 第一遍：收集所有tool_call和agent_child节点并创建扩展对象
  steps.forEach(step => {
    if (step.type === 'tool_call' || step.type === 'agent_child') {
      dlog('🔧 找到工具/子代理步骤:', {
        id: step.id,
        tool_use_id: step.tool_use_id,
        tool_name: step.tool_name,
        type: step.type
      })
      
      if (step.tool_use_id) {
        toolUseMap.set(step.tool_use_id, { ...step })
      } else {
        // 如果没有tool_use_id，使用步骤id作为fallback
        dwarn('⚠️ 工具/子代理步骤缺少tool_use_id，使用步骤id作为fallback:', step.id)
        toolUseMap.set(step.id, { ...step })
      }
    }
  })
  
  dlog('🗺️ toolUseMap大小:', toolUseMap.size)
  
  // 第二遍：将tool_result关联到对应的tool_call
  steps.forEach(step => {
    if (step.type === 'tool_result') {
      dlog('📊 找到tool_result步骤:', {
        id: step.id,
        tool_use_id: step.tool_use_id
      })
      
      let toolUseStep = null
      
      if (step.tool_use_id) {
        toolUseStep = toolUseMap.get(step.tool_use_id)
      }
      
      // 如果通过tool_use_id找不到，尝试通过位置关系找到前一个tool_call
      if (!toolUseStep) {
        const currentIndex = steps.indexOf(step)
        for (let i = currentIndex - 1; i >= 0; i--) {
          const prevStep = steps[i]
          if (prevStep.type === 'tool_call') {
            const mapKey = prevStep.tool_use_id || prevStep.id
            toolUseStep = toolUseMap.get(mapKey)
            if (toolUseStep) {
              dlog('🔗 通过位置关系关联tool_result到tool_call:', {
                toolResultId: step.id,
                toolCallId: prevStep.id
              })
              break
            }
          }
        }
      }
      
      if (toolUseStep) {
        toolUseStep.toolResult = step
        dlog('✅ 成功关联tool_result到tool_call')
      } else {
        dwarn('⚠️ 无法找到对应的tool_call步骤')
      }
    }
  })
  
  // 第三遍：按原始顺序处理所有步骤
  const processedStepsList: (ConversationStep & { toolResult?: ConversationStep })[] = []
  steps.forEach(step => {
    if (step.type === 'tool_call' || step.type === 'agent_child') {
      // 使用已经关联了toolResult的tool_call/agent_child步骤
      const mapKey = step.tool_use_id || step.id
      const enhancedStep = toolUseMap.get(mapKey)
      if (enhancedStep) {
        processedStepsList.push(enhancedStep)
        dlog('📝 添加工具/子代理步骤:', {
          id: enhancedStep.id,
          type: enhancedStep.type,
          hasToolResult: !!enhancedStep.toolResult
        })
      } else {
        processedStepsList.push(step)
        dlog('📝 添加原始工具/子代理步骤:', { id: step.id, type: step.type })
      }
    } else if (step.type === 'tool_result') {
      // tool_result步骤已经关联到tool_call或agent_child，不单独显示
      dlog('🚫 跳过tool_result步骤，应作为工具/子代理的子节点:', step.id)
    } else {
      // 其他类型的步骤直接添加
      processedStepsList.push(step)
    }
  })
  
  dlog('📋 最终处理后的步骤数量:', processedStepsList.length)
  return processedStepsList
})

const selectConversation = (conversationId: string) => {
  timelineStore.selectConversation(conversationId)
}

const selectStep = (step: ConversationStep) => {
  timelineStore.selectStep(step)
}

// 展开/收起功能
// 在模板中调用getDisplayContent时也添加调试信息
  const toggleExpanded = (stepId: string) => {
    dlog('🔄 toggleExpanded called:', stepId)
    if (expandedSteps.value.has(stepId)) {
      expandedSteps.value.delete(stepId)
      dlog('📉 Step collapsed:', stepId)
    } else {
      expandedSteps.value.add(stepId)
      dlog('📈 Step expanded:', stepId)
    }
  }

// 处理头部点击事件
const handleHeaderClick = (step: ConversationStep) => {
  if (shouldShowExpandButton(step)) {
    toggleExpanded(step.id)
  }
}

const isExpanded = (stepId: string) => {
  return expandedSteps.value.has(stepId)
}

// 判断是否需要显示展开按钮
const shouldShowExpandButton = (step: ConversationStep) => {
  const content = getContentForMeasurement(step)
  if (!content) return false
  
  // 简单估算：每行约50个字符，每行高度约20px
  const estimatedLines = Math.ceil(content.length / 50)
  const estimatedHeight = estimatedLines * 20 + 40 // 加上padding
  
  return estimatedHeight > 150 // 超过150px才显示展开按钮
}

// 获取用于测量的内容
const getContentForMeasurement = (step: ConversationStep) => {
  if (step.type === 'tool_call') {
    // 对于Tool_Use节点，需要同时考虑parameters和toolResult的内容
    let content = JSON.stringify(step.parameters || {}, null, 2)
    
    // 如果有关联的Tool_Result，也要考虑其内容长度
    if (step.toolResult) {
      const toolResultContent = getToolResultContent(step, true) // 传入true获取完整内容用于测量
      content += '\n' + toolResultContent
    }
    
    return content
  } else if (step.type === 'tool_result') {
    return getToolResultContent(step, true) // 传入true获取完整内容用于测量
  }
  return step.content || ''
}

// 计算工具调用或子代理的耗时
const calculateDuration = (step: ConversationStep & { toolResult?: ConversationStep }) => {
  if (!step.toolResult || !step.timestamp || !step.toolResult.timestamp) {
    return null
  }
  
  try {
    const startTime = new Date(step.timestamp).getTime()
    const endTime = new Date(step.toolResult.timestamp).getTime()
    
    if (isNaN(startTime) || isNaN(endTime)) {
      return null
    }
    
    const duration = endTime - startTime // 毫秒
    let durationText = ''
    let colorClass = ''
    
    // 格式化为中文显示并确定颜色
    if (duration < 1000) {
      durationText = `耗时：${duration}毫秒`
      colorClass = 'duration-fast' // 绿色
    } else if (duration < 60000) {
      const seconds = Math.floor(duration / 1000)
      const milliseconds = duration % 1000
      if (milliseconds > 0) {
        durationText = `耗时：${seconds}.${Math.floor(milliseconds / 100)}秒`
      } else {
        durationText = `耗时：${seconds}秒`
      }
      // 根据秒数确定颜色
      if (duration < 3000) {
        colorClass = 'duration-fast' // 绿色
      } else if (duration < 30000) {
        colorClass = 'duration-medium' // 蓝色
      } else {
        colorClass = 'duration-slow' // 浅红色
      }
    } else {
      const minutes = Math.floor(duration / 60000)
      const seconds = Math.floor((duration % 60000) / 1000)
      if (seconds > 0) {
        durationText = `耗时：${minutes}分${seconds}秒`
      } else {
        durationText = `耗时：${minutes}分钟`
      }
      // 根据分钟数确定颜色
      if (duration < 120000) {
        colorClass = 'duration-slow' // 浅红色
      } else {
        colorClass = 'duration-very-slow' // 深红色
      }
    }
    
    return { text: durationText, class: colorClass }
  } catch (error) {
    console.warn('计算耗时失败:', error)
    return null
  }
}

// JSON语法高亮
const highlightJson = (jsonString: string) => {
  if (!jsonString) return ''
  
  // 直接应用正则表达式高亮，不验证JSON格式
  // 这样即使截断后的JSON片段也能保持高亮
  return jsonString
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
      // 匹配键和字符串值
      if (match.endsWith(':')) {
        // 这是一个键
        return '<span class="json-key">' + match.slice(0, -1) + '</span>:'
      } else {
        // 这是一个字符串值
        return '<span class="json-string">' + match + '</span>'
      }
    })
    .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
    .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
    .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>')
    .replace(/([{}[\],])/g, '<span class="json-bracket">$1</span>')
}

// 获取显示内容（根据展开状态决定是否截断）
const getDisplayContent = (step: ConversationStep, customContent?: string) => {
  const isStepExpanded = isExpanded(step.id)
  
  // 根据step类型获取内容
  let content = customContent
  if (!content) {
    if (step.type === 'tool_result') {
      content = getToolResultContent(step, isStepExpanded)
    } else if (step.type === 'tool_call' && step.toolResult) {
      content = getToolResultContent(step, isStepExpanded)
    } else {
      content = step.content || ''
    }
  }
  
  if (!shouldShowExpandButton(step)) {
    // 不需要展开按钮的内容，直接返回完整内容
    return content
  }
  
  if (isStepExpanded) {
    // 展开状态：显示完整内容，不截断
    return content
  } else {
    // 收起状态：显示部分内容
    return truncateContentByHeight(content, 150)
  }
}

// 获取高亮显示内容（用于JSON）
const getHighlightedContent = (step: ConversationStep, customContent?: string) => {
  // 先获取完整内容
  let content = customContent
  if (!content) {
    content = step.content || ''
  }
  
  // 直接返回高亮后的完整内容，使用CSS控制显示
  return highlightJson(content)
}

// 获取Tool Result的高亮内容
const getHighlightedToolResult = (step: ConversationStep, isExpanded: boolean = false) => {
  // 先获取Tool Result内容
  const content = getToolResultContent(step, true) // 总是获取完整内容
  // 直接返回高亮后的完整内容，使用CSS控制显示
  return highlightJson(content)
}


// 检查内容是否被截断
const isContentTruncated = (step: ConversationStep, customContent?: string) => {
  // 在客户端环境中，通过DOM元素检查实际截断情况
  if (typeof window !== 'undefined') {
    const cardElement = document.querySelector(`[data-step-id="${step.id}"] .card-content`)
    if (cardElement) {
      const scrollHeight = cardElement.scrollHeight
      const clientHeight = cardElement.clientHeight
      return scrollHeight > clientHeight
    }
  }
  
  // 服务端渲染或找不到元素时的回退逻辑
  const content = customContent || step.content || ''
  
  if (!shouldShowExpandButton(step)) {
    // 不需要展开按钮的内容，检查是否超过350px高度
    const maxLines = Math.floor((350 - 40) / 20)
    const maxChars = maxLines * 50
    return content.length > maxChars
  }
  
  if (isExpanded(step.id)) {
    // 展开状态：检查是否超过350px高度
    const maxLines = Math.floor((350 - 40) / 20)
    const maxChars = maxLines * 50
    return content.length > maxChars
  } else {
    // 收起状态：检查是否超过150px高度
    const maxLines = Math.floor((150 - 40) / 20)
    const maxChars = maxLines * 50
    return content.length > maxChars
  }
}

// 根据高度截断内容
const truncateContentByHeight = (content: string, maxHeight: number) => {
  if (!content) return ''
  
  // 估算可显示的字符数（每行约50字符，每行20px高度）
  const maxLines = Math.floor((maxHeight - 40) / 20) // 减去padding
  const maxChars = maxLines * 50
  
  if (content.length <= maxChars) return content
  
  // 截断并添加省略号
  const truncated = content.substring(0, maxChars)
  const lastNewlineIndex = truncated.lastIndexOf('\n')
  
  if (lastNewlineIndex > maxChars * 0.8) {
    // 如果最后一个换行符位置合适，在那里截断
    return truncated.substring(0, lastNewlineIndex) + '\n...'
  } else {
    // 否则直接截断并添加省略号
    return truncated + '...'
  }
}

// 格式化日期
// const formatDate = (timestamp: string) => {
//   if (!timestamp) return ''
  
//   const date = new Date(timestamp)
//   if (isNaN(date.getTime())) {
//     return '' // 如果时间戳无效，返回空字符串
//   }
  
//   return date.toLocaleDateString('zh-CN', {
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit'
//   })
// }

// 格式化时间 (HH:MM:SS)
const formatTime = (timestamp: string) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) {
    return '' // 如果时间戳无效，返回空字符串
  }
  
  //转换为中国时区 (UTC+8)
  //const chinaTime = new Date(date.getTime() + (8 * 60 * 60 * 1000))
  return date.toLocaleTimeString({
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 格式化完整日期时间
// const formatDateTime = (timestamp: string) => {
//   const date = new Date(timestamp)
//   return date.toLocaleString('zh-CN')
// }

// 获取节点类型标签
const getNodeTypeLabel = (type: string) => {
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

// 获取节点tooltip
const getNodeTooltip = (step: ConversationStep) => {
  const label = getNodeTypeLabel(step.type)
  const time = formatTime(step.timestamp)
  return `${label} - ${time}`
}

// 获取节点颜色
const getNodeColor = (type: string) => {
  const colors: Record<string, string> = {
    'user_message': '#1890ff',      // 蓝色 - 用户查询
    'assistant_thinking': '#faad14', // 橙色 - AI思考
    'assistant_message': '#52c41a',  // 绿色 - AI回复
    'tool_call': '#722ed1',         // 紫色 - 工具调用
    'tool_result': '#13c2c2',       // 青色 - 工具结果
    'agent_child': '#eb2f96',       // 粉红色 - 子代理
    'agent_end': '#eb2f96',         // 粉红色 - 代理结束（合并为子代理）
    'sub_agent': '#eb2f96'          // 粉红色 - 子代理（统一类型）
  }
  return colors[type] || '#d9d9d9'
}

// 获取步骤类型描述
const getStepTypeDescription = (type: string) => {
  const descriptions: Record<string, string> = {
    'user_message': '用户查询 - 用户向AI助手提出的问题或请求',
    'assistant_thinking': 'AI思考 - AI助手的内部思考过程',
    'assistant_message': 'AI回复 - AI助手对用户的回应',
    'tool_call': '工具调用 - AI助手调用外部工具或函数',
    'tool_result': '工具结果 - 外部工具返回的执行结果',
    'agent_child': '子代理 - 启动的子代理进程',
    'agent_end': '对话结束 - 当前对话会话结束',
    'sub_agent': '子代理 - 启动的子代理进程'
  }
  return descriptions[type] || type
}

// 截断内容
const truncateContent = (content: string, maxLength: number = 500) => {
  if (!content) return ''
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

// 获取Tool Result节点的显示内容
const getToolResultContent = (step: ConversationStep, isExpanded: boolean = false) => {
  // 调试信息：记录函数调用
  dlog('🔍 getToolResultContent called:', {
    stepId: step.id,
    stepType: step.type,
    isExpanded,
    hasToolResult: !!step.toolResult,
    hasContent: !!step.content,
    contentLength: step.content?.length || 0,
    rawLogEntry: step.rawLogEntry ? Object.keys(step.rawLogEntry) : []
  })
  
  // 如果这是一个tool_call或agent_child步骤且有关联的toolResult，使用toolResult的内容
  if ((step.type === 'tool_call' || step.type === 'agent_child') && step.toolResult) {
    dlog('🎯 使用关联的toolResult内容')
    
    // 直接获取toolUseResult并序列化为JSON字符串
    const toolResultRawLogEntry = step.toolResult.rawLogEntry
    if (toolResultRawLogEntry?.toolUseResult) {
      try {
        const content = JSON.stringify(toolResultRawLogEntry.toolUseResult, null, 2)
        if (!isExpanded && content.length > 500) {
          dlog('📏 toolUseResult JSON truncated (collapsed):', content.length)
          // 直接截断JSON字符串
          return content.substring(0, 500) + '...'
        }
        dlog('📄 toolUseResult JSON full content (expanded):', content.length)
        return content
      } catch (error) {
        dwarn('toolUseResult JSON序列化失败:', error)
        return ''
      }
    }
    
    // 如果取不到toolUseResult则返回空
    dlog('⚠️ 未找到toolUseResult，返回空内容')
    return ''
  }
  
  // 如果这不是tool_call/agent_child步骤或没有关联的toolResult，返回空内容
  dlog('⚠️ 无法提取Tool Result内容，使用兜底显示')
  return 'No result content available'
}

onMounted(() => {
  // 移除重复的初始化调用，App.vue已经调用了
  // timelineStore.initialize()
})

// 处理子代理链接点击事件
const handleSubAgentClick = async (step: ConversationStep) => {
  if (!step.subagent_type || step.subagent_type === '未知') {
    return
  }

  try {
    // 获取当前选中的主日志信息
    const mainLog = timelineStore.selectedMainLog
    if (!mainLog || !mainLog.agentLogs) {
      console.warn('未找到当前主日志或其子代理日志列表')
      return
    }

    // 在主日志的子代理列表中查找匹配的agent日志
    // 优先通过subagent_type匹配agentName
    let targetAgentLog = mainLog.agentLogs.find(agent => agent.agentName === step.subagent_type)
    
    // 如果没找到，尝试通过rawLogEntry中的agentId匹配
    if (!targetAgentLog && step.rawLogEntry?.toolUseResult?.agentId) {
      const agentId = step.rawLogEntry.toolUseResult.agentId
      targetAgentLog = mainLog.agentLogs.find(agent => agent.agentId === agentId)
    }

    if (targetAgentLog) {
      console.log(`跳转到子代理日志: ${targetAgentLog.name} (${targetAgentLog.id})`)
      // 加载对应的子代理日志文件
      await timelineStore.loadFile(targetAgentLog.id)
    } else {
      console.warn(`未找到匹配的子代理日志: ${step.subagent_type}`)
      // 可以在这里添加用户提示，比如使用消息组件显示警告
    }
  } catch (error) {
    console.error('跳转到子代理日志失败:', error)
  }
}

// 确保所有方法都被正确暴露给模板
defineExpose({
  formatTime,
  getNodeTypeLabel,
  getNodeTooltip,
  getNodeColor,
  getStepTypeDescription,
  truncateContent,
  getToolResultContent,
  selectConversation,
  selectStep,
  toggleExpanded,
  isExpanded,
  shouldShowExpandButton,
  getContentForMeasurement,
  getDisplayContent,
  isContentTruncated,
  truncateContentByHeight
})
</script>

<style scoped>
.timeline-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  padding: 60px 20px;
  width:100%;
}

.empty-message {
  margin-top: 16px;
  text-align: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.no-files-alert {
  max-width: 400px;
}

.timeline-content {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* 时间线样式 */
.timeline-wrapper {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.timeline-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
}

.timeline-main {
  position: relative;
}

.timeline-item {
  display: flex;
  margin-bottom: 20px;
  cursor: pointer;
}

.timeline-time {
  width: 80px;
  flex-shrink: 0;
  font-size: 12px;
  color: #666;
  text-align: right;
  padding-right: 12px;
  line-height: 1.2;
}

.timeline-connector {
  width: 20px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #e8e8e8;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.step-number {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: #e8e8e8;
  margin-top: 8px;
  min-height: 20px;
}

.timeline-content-card {
  flex: 1;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin-left: 16px;
  transition: all 0.2s ease;
}

.timeline-content-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-header:hover {
  background-color: #f5f5f5;
}

.card-header:active {
  background-color: #e8e8e8;
}

.step-type-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  background: #f0f0f0;
  color: #666;
}

.duration-tag {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse 2s infinite;
}

.duration-fast {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  box-shadow: 0 2px 4px rgba(82, 196, 26, 0.3);
}

.duration-medium {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
}

.duration-slow {
  background: linear-gradient(135deg, #ff7875 0%, #ff9c6e 100%);
  box-shadow: 0 2px 4px rgba(255, 120, 117, 0.3);
}

.duration-very-slow {
  background: linear-gradient(135deg, #cf1322 0%, #f5222d 100%);
  box-shadow: 0 2px 4px rgba(207, 19, 34, 0.3);
}

@keyframes pulse {
  0% {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  50% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  100% {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.expand-button {
  background: none;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.expand-button:hover {
  border-color: #1890ff;
  color: #1890ff;
}

/* 内容区域高度控制 */
.card-content {
  font-size: 14px;
  line-height: 1.5;
  position: relative;
}

/* 收起状态下的内容高度限制 */
:deep(.timeline-item:not(.expanded) .tool-parameters pre),
:deep(.timeline-item:not(.expanded) .sub-agent-parameters pre),
:deep(.timeline-item:not(.expanded) .result-content pre) {
  max-height: 150px !important;
  overflow: hidden !important;
  position: relative;
}

/* 收起状态下显示渐变遮罩 - 只在实际内容被截断时显示 */
:deep(.timeline-item:not(.expanded) .tool-parameters.content-truncated pre::after),
:deep(.timeline-item:not(.expanded) .sub-agent-parameters.content-truncated pre::after),
:deep(.timeline-item:not(.expanded) .result-content.content-truncated pre::after) {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(transparent, white);
  pointer-events: none;
}

/* 内容区域滚动控制 - 针对具体的内容元素 */
:deep(.content-text),
:deep(.tool-parameters),
:deep(.result-content),
:deep(.tool-result-container) {
  max-height: 350px !important;
  overflow-y: auto !important;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 transparent;
}

/* 展开状态下移除高度限制，但Tool Result保持350px限制和滚动条 */
:deep(.timeline-item.expanded .content-text),
:deep(.timeline-item.expanded .tool-parameters),
:deep(.timeline-item.expanded .sub-agent-parameters) {
  max-height: none !important;
  overflow-y: visible !important;
}

/* 普通result-content在展开状态下移除限制 */
:deep(.timeline-item.expanded .result-content) {
  max-height: none !important;
  overflow-y: visible !important;
}

:deep(.timeline-item.expanded .tool-result-container) {
  max-height: none !important;
  /* 不设置overflow-y，让内部的result-content自己控制滚动 */
}

/* Tool Result在所有状态下都保持350px高度限制和滚动条 - 使用更高优先级 */
:deep(.timeline-item .tool-result-container .result-content),
:deep(.timeline-item.expanded .tool-result-container .result-content) {
  max-height: 350px !important;
  overflow-y: auto !important;
}

/* 内容高度小于150px时的自适应高度 */
:deep(.content-text:not(.content-collapsed)),
:deep(.tool-parameters:not(.content-collapsed)),
:deep(.result-content:not(.content-collapsed)),
:deep(.tool-result-container:not(.content-collapsed)) {
  min-height: auto;
  height: auto;
}

/* Webkit浏览器滚动条样式 */
:deep(.content-text::-webkit-scrollbar),
:deep(.tool-parameters::-webkit-scrollbar),
:deep(.result-content::-webkit-scrollbar),
:deep(.tool-result-container::-webkit-scrollbar) {
  width: 6px;
}

:deep(.content-text::-webkit-scrollbar-track),
:deep(.tool-parameters::-webkit-scrollbar-track),
:deep(.result-content::-webkit-scrollbar-track),
:deep(.tool-result-container::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.content-text::-webkit-scrollbar-thumb),
:deep(.tool-parameters::-webkit-scrollbar-thumb),
:deep(.result-content::-webkit-scrollbar-thumb),
:deep(.tool-result-container::-webkit-scrollbar-thumb) {
  background-color: #d9d9d9;
  border-radius: 3px;
}

:deep(.content-text::-webkit-scrollbar-thumb:hover),
:deep(.tool-parameters::-webkit-scrollbar-thumb:hover),
:deep(.result-content::-webkit-scrollbar-thumb:hover),
:deep(.tool-result-container::-webkit-scrollbar-thumb:hover) {
  background-color: #bfbfbf;
}

/* 收起状态下的内容元素 */
:deep(.content-collapsed .content-text),
:deep(.content-collapsed .tool-parameters),
:deep(.content-collapsed .result-content),
:deep(.content-collapsed .tool-result-container .result-content) {
  max-height: 150px !important;
  overflow: hidden !important;
}

/* 收起状态下的tool-result-container本身不应该有滚动条 */
:deep(.content-collapsed .tool-result-container) {
  overflow: hidden !important;
}

/* 确保Tool_Result内容区域在展开状态下有正确的样式 */
:deep(.timeline-item:not(.collapsed) .tool-result-container .result-content) {
  max-height: 350px !important;
  overflow-y: auto !important;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 transparent;
}

:deep(.tool-result-container .result-content::-webkit-scrollbar) {
  width: 6px;
}

:deep(.tool-result-container .result-content::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.tool-result-container .result-content::-webkit-scrollbar-thumb) {
  background-color: #d9d9d9;
  border-radius: 3px;
}

:deep(.tool-result-container .result-content::-webkit-scrollbar-thumb:hover) {
  background-color: #bfbfbf;
}

/* 确保内容区域的子元素也遵循高度限制 */
.card-content .content-text,
.card-content .tool-parameters pre,
.card-content .result-content pre {
  margin: 0;
  white-space: pre-wrap;
  /* 更强的断词与换行，避免长串导致横向溢出 */
  word-wrap: break-word; /* 兼容旧属性 */
  overflow-wrap: anywhere;
  word-break: break-all;
  line-height: 1.5;
}

/* 不同节点类型的样式 */
.step-user-message .step-type-tag {
  background: #e6f7ff;
  color: #1890ff;
}

.step-assistant-thinking .step-type-tag {
  background: #fff7e6;
  color: #faad14;
}

.step-assistant-message .step-type-tag {
  background: #f6ffed;
  color: #52c41a;
}

.step-tool-call .step-type-tag {
  background: #f9f0ff;
  color: #722ed1;
}

.step-tool-result .step-type-tag {
  background: #e6fffb;
  color: #13c2c2;
}

.step-agent-child .step-type-tag {
  background: #fff1f0;
  color: #f5222d;
}

.step-agent-end .step-type-tag {
  background: #f5f5f5;
  color: #8c8c8c;
}

/* 用户查询内容 */
.user-query-content .content-text {
  color: #333;
  font-weight: 500;
}

/* AI思考内容 */
.agent-thinking-content .thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #faad14;
  font-size: 12px;
}

.agent-thinking-content .content-text {
  color: #666;
  font-style: italic;
}

/* AI回复内容 */
.agent-message-content .content-text {
  color: #333;
  margin-bottom: 8px;
}

.token-info {
  font-size: 11px;
  color: #999;
  text-align: right;
}

/* JSON语法高亮样式 */
.json-key {
  color: #0066cc;
  font-weight: bold;
}

.json-string {
  color: #009900;
}

.json-number {
  color: #cc6600;
}

.json-boolean {
  color: #cc0066;
  font-weight: bold;
}

.json-null {
  color: #999999;
  font-weight: bold;
}

.json-bracket {
  color: #666666;
  font-weight: bold;
}

/* 工具调用内容 */
.tool-use-content .tool-header {
  margin-bottom: 8px;
}

.tool-name {
  font-weight: 500;
  color: #722ed1;
  font-size: 12px;
}

/* 子代理内容样式 */
.sub-agent-content .sub-agent-header {
  margin-bottom: 8px;
}

.sub-agent-type {
  font-weight: 500;
  color: #eb2f96;
  font-size: 12px;
}

.sub-agent-type-text {
  font-weight: 500;
  color: #eb2f96;
  font-size: 12px;
}

.sub-agent-link {
  font-weight: 500;
  color: #eb2f96;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sub-agent-link:hover {
  color: #c41d7f;
  text-decoration: none;
  background-color: rgba(235, 47, 150, 0.1);
  padding: 2px 4px;
  border-radius: 2px;
}

.sub-agent-name {
  font-weight: 500;
  color: #eb2f96;
  font-size: 12px;
}

/* 展开状态下的tool-parameters样式 */
.timeline-item:not(.collapsed) .tool-parameters,
.timeline-item:not(.collapsed) .sub-agent-parameters {
  background: #f8f8f8;
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  max-height: 350px !important;
  overflow-y: auto !important;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 transparent;
}

/* 收起状态下的tool-parameters样式 */
.timeline-item.collapsed .tool-parameters,
.timeline-item.collapsed .sub-agent-parameters {
  background: #f8f8f8;
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  max-height: 150px !important;
  overflow: hidden !important;
}

.timeline-item:not(.collapsed) .tool-parameters::-webkit-scrollbar,
.timeline-item:not(.collapsed) .sub-agent-parameters::-webkit-scrollbar {
  width: 6px;
}

.timeline-item:not(.collapsed) .tool-parameters::-webkit-scrollbar-track,
.timeline-item:not(.collapsed) .sub-agent-parameters::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-item:not(.collapsed) .tool-parameters::-webkit-scrollbar-thumb,
.timeline-item:not(.collapsed) .sub-agent-parameters::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 3px;
}

.timeline-item:not(.collapsed) .tool-parameters::-webkit-scrollbar-thumb:hover,
.timeline-item:not(.collapsed) .sub-agent-parameters::-webkit-scrollbar-thumb:hover {
  background-color: #bfbfbf;
}

.tool-parameters pre,
.sub-agent-parameters pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Tool Result 关联显示样式 */
.tool-result-container {
  position: relative;
  margin-top: 16px;
  padding-left: 20px;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 transparent;
}

/* 收起状态下的高度限制 */
.timeline-item.collapsed .tool-result-container .result-content {
  max-height: 150px !important;
  overflow: hidden !important;
}

/* 注释掉冲突的规则 - Tool Result应该始终保持350px高度限制 */
/* .timeline-item:not(.collapsed) .tool-result-container .result-content {
  max-height: none !important;
  overflow-y: visible !important;
} */

.tool-result-container::-webkit-scrollbar {
  width: 6px;
}

.tool-result-container::-webkit-scrollbar-track {
  background: transparent;
}

.tool-result-container::-webkit-scrollbar-thumb {
  background-color: #d9d9d9;
  border-radius: 3px;
}

.tool-result-container::-webkit-scrollbar-thumb:hover {
  background-color: #bfbfbf;
}

.connection-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #722ed1, #13c2c2);
  border-radius: 1px;
}

.tool-result-card {
  background: #f8fffe;
  border: 1px solid #b7f7f5;
  border-radius: 6px;
  padding: 12px;
}

.result-header {
  margin-bottom: 8px;
}

.result-type-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
  background: #e6fffb;
  color: #13c2c2;
}

.result-content {
  font-size: 12px;
}

.result-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #333;
}

/* 默认内容样式 */
.default-content .content-text {
  color: #333;
}

/* 选中状态 */
.timeline-item.selected .timeline-content-card {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .timeline-time {
    width: 60px;
    font-size: 10px;
  }
  
  .timeline-content-card {
    margin-left: 12px;
    padding: 12px;
  }
}
</style>