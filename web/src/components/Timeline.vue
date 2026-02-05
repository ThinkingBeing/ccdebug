<template>
  <div class="timeline-container" @click="hideContextMenu">
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
                'expanded': timelineStore.isExpanded(step.id)
              }
            ]"
            @click="selectStep(step)"
          >
            <!-- 时间显示 -->
            <div class="timeline-time" v-if="formatTime(step.timestamp)">
              {{ formatTime(step.timestamp) }}
              <!-- 基础耗时显示 -->
              <div class="timeline-elapsed" v-if="calculateElapsedTime(step)">
                {{ calculateElapsedTime(step) }}
              </div>
            </div>
            
            <!-- 连接线和节点 -->
            <div class="timeline-connector">
              <div 
                class="timeline-dot" 
                :class="{ 'duration-node': timelineStore.isDurationNode(step.id) }"
                :style="{ backgroundColor: getNodeColor(step.type) }"
                :title="`${getNodeTypeLabel(step.type)} - ${formatTime(step.timestamp)}`"
                @contextmenu.prevent="showContextMenu($event, step)"
              >
                <span class="step-number">{{ step.originalIndex }}</span>
              </div>
              <div v-if="index < processedSteps.length - 1" class="timeline-line"></div>
              
              <!-- 耗时统计连接线 -->
              <div 
                v-if="timelineStore.isDurationNode(step.id) && getNextDurationNode(index)"
                class="duration-connector"
                :data-from-id="step.id"
                :data-to-id="getNextDurationNode(index)?.id"
              >
                <div class="duration-label">
                  {{ calculateDurationBetweenNodes(step, getNextDurationNode(index)) }}
                </div>
              </div>
            </div>
            
            <!-- 内容卡片 -->
            <div class="timeline-content-card" :data-step-id="step.id">
              <div class="card-header" @click.stop="handleHeaderClick(step)">
                <div class="header-left">
                  <!-- 收起状态：显示标签和摘要信息 -->
                  <template v-if="!timelineStore.isExpanded(step.id) && isCollapsible(step)">
                    <div class="tag-duration-group">
                  
                      <span class="step-type-tag">{{ getNodeTypeLabel(step.type) }}</span>
                    </div>
                    <a-tooltip :content="getSummaryTooltip(step)" position="tl" background-color="#3491FA" theme="light">
                      <span class="summary-text">
                        <span v-if="step.type === 'tool_call'" class="tool-name-highlight">
                          {{ step.tool_name || '未知工具' }}
                        </span>
                        <span v-else-if="step.type === 'agent_child'" class="subagent-type-highlight">
                          {{ step.subagent_type || '未知' }}
                        </span>
                        <span class="separator"> | </span>
                        <span v-if="step.type === 'tool_call'" class="tool-specific-info">
                          {{ getToolSpecificInfo(step) }}
                        </span>
                        <span v-else-if="step.type === 'agent_child'" class="subagent-prompt">
                          {{ truncateText(extractPromptParam(step.parameters), 80) }}
                        </span>
                      </span>
                    </a-tooltip>
                    <span v-if="calculateDuration(step)" :class="['duration-tag', calculateDuration(step).class]">{{ calculateDuration(step).text }}</span>
                  </template>
                  <!-- 展开状态或其他节点：显示标签和工具名称 -->
                  <template v-else>
                    <div class="tag-duration-group">
                      <span 
                        v-if="!isCollapsible(step) || timelineStore.isExpanded(step.id)"
                        class="step-type-tag"
                        :title="getStepTypeDescription(step.type)"
                      >{{ getNodeTypeLabel(step.type) }}</span>
                    </div>
                    <!-- 展开状态下显示工具名称或子代理类型 -->
                    <span 
                      v-if="timelineStore.isExpanded(step.id) && isCollapsible(step)"
                      class="header-info"
                    >
                      <span v-if="step.type === 'tool_call'" class="tool-name-header">
                        {{ step.tool_name || '未知工具' }}
                      </span>
                      <span v-else-if="step.type === 'agent_child'" class="subagent-name-header">
                        {{ step.subagent_type || '未知' }}
                      </span>
                    </span>
                    <span v-if="calculateDuration(step)" :class="['duration-tag', calculateDuration(step).class]">{{ calculateDuration(step).text }}</span>
                  </template>
                </div>
                <!-- 状态图标 -->
                <div 
                  v-if="shouldShowExpandButton(step)"
                  class="expand-icon"
                  @click.stop="timelineStore.toggleExpanded(step.id)"
                  :class="{ 'expanded': timelineStore.isExpanded(step.id) }"
                >
                  {{ timelineStore.isExpanded(step.id) ? '▼' : '▶' }}
                </div>
              </div>
              
              <div 
                v-if="!isCollapsible(step) || timelineStore.isExpanded(step.id)"
                class="card-content"
                :class="{ 
                  'content-collapsed': !timelineStore.isExpanded(step.id) && shouldShowExpandButton(step),
                  'content-expanded': timelineStore.isExpanded(step.id)
                }"
              >
                <!-- User Query 节点 -->
                <div v-if="step.type === 'user_message'" class="user-query-content">
                  <div class="content-text" v-html="getDisplayContent(step)"></div>
                </div>
                
                <!-- Agent Thinking 节点 -->
                <div v-else-if="step.type === 'assistant_thinking'" class="agent-thinking-content">
                  <div class="thinking-indicator">
                    <span>思考中...</span>
                  </div>
                  <div class="content-text" v-html="getDisplayContent(step)"></div>
                </div>
                
                <!-- Agent Message 节点 -->
                <div v-else-if="step.type === 'assistant_message'" class="agent-message-content">
                  <div class="content-text" v-html="getDisplayContent(step)"></div>
                </div>
                
                <!-- Tool Use 节点 -->
                <div v-else-if="step.type === 'tool_call'" class="tool-use-content">
                  <!-- 展开状态：显示完整详情 -->
                  <div v-if="timelineStore.isExpanded(step.id)" class="tool-details-expanded">
                    <div class="tool-header">
                      <span class="tool-name">工具名称：{{ step.tool_name || '工具调用' }}</span>
                      <br/><span class="tool-name">工具参数：</span>
                    </div>
                    <div class="tool-parameters">
                      <pre v-html="getHighlightedContent(step, JSON.stringify(step.parameters || {}, null, 2))"></pre>
                    </div>
                    
                    <!-- 关联的Tool Result显示 -->
                    <div v-if="step.toolResult" class="tool-result-container">
                      <div class="connection-line"></div>
                      <div class="tool-result-card">
                        <div class="result-header">
                          <span class="result-type-tag">Tool Result</span>
                        </div>
                        <div class="result-content">
                          <pre v-html="getHighlightedToolResult(step, true)"></pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Sub Agent 节点 -->
                <div v-else-if="step.type === 'agent_child'" class="sub-agent-content">
                  <!-- 展开状态：显示完整详情 -->
                  <div v-if="timelineStore.isExpanded(step.id)" class="sub-agent-details-expanded">
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
                    <div class="sub-agent-parameters">
                      <pre v-html="getHighlightedContent(step, JSON.stringify(step.parameters || {}, null, 2))"></pre>
                    </div>
                    
                    <!-- 关联的Tool Result显示 -->
                    <div v-if="step.toolResult" class="tool-result-container">
                      <div class="connection-line"></div>
                      <div class="tool-result-card">
                        <div class="result-header">
                          <span class="result-type-tag">Sub Agent Result</span>
                        </div>
                        <div class="result-content">
                          <pre v-html="getHighlightedToolResult(step, true)"></pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 默认节点 -->
                <div v-else class="default-content">
                  <div class="content-text" v-html="getDisplayContent(step)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenuVisible" 
      class="context-menu"
      :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
      @click.stop
    >
      <div 
        v-if="contextMenuStep && !timelineStore.isDurationNode(contextMenuStep.id)"
        class="context-menu-item" 
        @click="setAsDurationNode"
      >
        设置为耗时统计节点
      </div>
      <div 
        v-if="contextMenuStep && timelineStore.isDurationNode(contextMenuStep.id)"
        class="context-menu-item" 
        @click="removeDurationNode"
      >
        取消耗时节点设置
      </div>
      <div class="context-menu-item" @click="clearAllDurationNodes">
        清除所有耗时节点设置
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, defineOptions } from 'vue'
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
const searchKeyword = computed(() => timelineStore.searchKeyword)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuStep = ref<ConversationStep | null>(null)

// 展开状态管理现在使用 store 中的状态

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
  // 处理卡片头部点击事件
const handleHeaderClick = (step: ConversationStep) => {
  if (isCollapsible(step)) {
    timelineStore.toggleExpanded(step.id)
    // 展开/收起后更新连接线高度
    updateDurationConnectorHeights()
    timelineStore.selectStep(step)
  }
}

// 判断节点是否需要显示展开按钮
const shouldShowExpandButton = (step: ConversationStep) => {
  // 用户消息、助手思考、助手消息节点不显示展开按钮
  if (step.type === 'user_message' || step.type === 'assistant_thought' || step.type === 'assistant_message') {
    return false
  }
  
  // 对于tool_call和agent_child节点，总是显示展开按钮（因为现在默认收起）
  if (step.type === 'tool_call' || step.type === 'agent_child') {
    return true
  }
  
  const content = getContentForMeasurement(step)
  if (!content) return false
  
  // 简单估算：每行约50个字符，每行高度约20px
  const estimatedLines = Math.ceil(content.length / 50)
  const estimatedHeight = estimatedLines * 20 + 40 // 加上padding
  
  return estimatedHeight > 150 // 超过150px才显示展开按钮
}

// 判断节点是否可收起（新增方法）
const isCollapsible = (step: ConversationStep): boolean => {
  // 只有 tool_call 和 agent_child 类型可收起
  return step.type === 'tool_call' || step.type === 'agent_child'
}

// 文本截断工具函数
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 提取prompt参数
const extractPromptParam = (parameters: any): string => {
  if (!parameters) return ''
  // 根据实际数据结构提取prompt相关字段
  return parameters.prompt || parameters.query || parameters.input || parameters.message || ''
}

// 格式化TodoWrite任务变化
const formatTodoChanges = (step: ConversationStep): string => {
  const formatTodos = (todos: any[]) => {
    if (!Array.isArray(todos)) return '任务总数:0; completed:0; in_progress:0; pending:0'
    
    const total = todos.length
    const completed = todos.filter(t => t.status === 'completed').length
    const inProgress = todos.filter(t => t.status === 'in_progress').length
    const pending = todos.filter(t => t.status === 'pending').length
    
    return `任务总数:${total}; pending:${pending}; in_progress:${inProgress}; completed:${completed}`
  }
  
  // 尝试从toolResult中获取数据
  let oldTodos: any[] = []
  let newTodos: any[] = []
  
  if (step.toolResult && step.toolResult.rawLogEntry.toolUseResult) {
    oldTodos = step.toolResult.rawLogEntry.toolUseResult.oldTodos;
    newTodos = step.toolResult.rawLogEntry.toolUseResult.newTodos;
  } else {
    // 回退到parameters
    oldTodos = step.parameters?.old_todos || []
    newTodos = step.parameters?.todos || []
  }
  
  const oldTodosStr = formatTodos(oldTodos)
  const newTodosStr = formatTodos(newTodos)
  
  return `调用前(${oldTodosStr}) -> 调用后(${newTodosStr})`
}

// 获取工具特定信息
const getToolSpecificInfo = (step: ConversationStep): string => {
  const params = step.parameters || {}
  const toolName = step.tool_name?.toLowerCase() || ''
  
  switch (toolName) {
    case 'edit':
      return params.filePath || params.file_path || ''
    
    case 'glob':
      return params.pattern || ''
    
    case 'grep':
      const path = params.path || ''
      const pattern = params.pattern || ''
      return `${path} | ${pattern}`
    
    case 'read':
      return params.file_path || ''
    
    case 'skill':
      return params.skill || ''
    
    case 'todowrite':
      return formatTodoChanges(step)
    
    case 'write':
      return params.file_path || ''
    
    case 'bash':
      return params.command || ''
    
    default:
      // 默认显示第一个参数的值
      const firstKey = Object.keys(params)[0]
      return firstKey ? String(params[firstKey]) : ''
  }
}

// 生成摘要文本
const getSummaryText = (step: ConversationStep): string => {
  if (step.type === 'agent_child') {
    // Sub_Agent: 子代理类型 + prompt参数
    const subagentType = step.subagent_type || '未知'
    const promptParam = extractPromptParam(step.parameters)
    return `${subagentType} | ${promptParam}`
  }
  
  if (step.type === 'tool_call') {
    const toolName = step.tool_name || '未知工具'
    const specificInfo = getToolSpecificInfo(step)
    return `${toolName} | ${specificInfo}`
  }
  
  return ''
}

// 检查文本是否被截断
const isTextTruncated = (step: ConversationStep): boolean => {
  const tooltipText = getSummaryTooltip(step)
  const summaryText = getSummaryText(step)
  
  // 如果tooltip内容为空，不需要显示
  if (!tooltipText) return false
  
  // 如果summary文本和tooltip文本相同，说明没有被截断
  if (summaryText === tooltipText) return false
  
  // 如果tooltip文本明显比summary文本长，说明被截断了
  return tooltipText.length > summaryText.length + 10
}

// 生成完整提示文本（tooltip）
const getSummaryTooltip = (step: ConversationStep): string => {
  if (step.type === 'agent_child') {
    const promptParam = extractPromptParam(step.parameters)
    return promptParam || '无参数信息'
  }
  
  if (step.type === 'tool_call') {
    const params = step.parameters || {}
    // 返回完整的参数信息
    return JSON.stringify(params, null, 2)
  }
  
  return ''
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

// 高亮搜索关键字
const highlightSearchKeyword = (text: string): string => {
  if (!searchKeyword.value || !text) return text
  
  // 确保text是字符串类型
  const textStr = typeof text === 'string' ? text : JSON.stringify(text, null, 2)
  
  const keyword = searchKeyword.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${keyword})`, 'gi')
  return textStr.replace(regex, '<mark class="search-highlight-keyword">$1</mark>')
}

// JSON语法高亮
const highlightJson = (jsonString: string) => {
  if (!jsonString) return ''
  
  // 访问 searchKeyword 以建立响应式依赖
  const currentKeyword = searchKeyword.value
  
  // 如果有搜索关键字，先高亮搜索关键字
  let highlighted = jsonString
  if (currentKeyword) {
    highlighted = highlightSearchKeyword(jsonString)
  }
  
  // 然后应用JSON语法高亮
  return highlighted
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
    .replace(/([{}[\],])/g, '<span class="json-bracket">$1</span>')
}

// 获取显示内容（根据展开状态决定是否截断）
const getDisplayContent = (step: ConversationStep, customContent?: string) => {
  // 访问 searchKeyword 以建立响应式依赖
  const currentKeyword = searchKeyword.value
  
  const isStepExpanded = timelineStore.isExpanded(step.id)
  
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
  
  // 如果是展开状态，显示完整内容
  if (isStepExpanded) {
    return highlightSearchKeyword(content)
  }
  
  // 如果是收起状态，显示截断内容
  if (shouldShowExpandButton(step)) {
    return highlightSearchKeyword(truncateContentByHeight(content, 150))
  }
  
  // 对于不需要展开按钮的内容，检查是否超过350px高度
  return highlightSearchKeyword(content)
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
  
  if (timelineStore.isExpanded(step.id)) {
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

// 计算从日志开始到当前节点的耗时
const calculateElapsedTime = (step: ConversationStep) => {
  if (!currentConversation.value?.steps || currentConversation.value.steps.length === 0) {
    return null
  }
  
  try {
    const firstStep = currentConversation.value.steps[0]
    if (!firstStep.timestamp || !step.timestamp) {
      return null
    }
    
    const startTime = new Date(firstStep.timestamp).getTime()
    const currentTime = new Date(step.timestamp).getTime()
    
    if (isNaN(startTime) || isNaN(currentTime)) {
      return null
    }
    
    const duration = currentTime - startTime // 毫秒
    return formatDuration(duration)
  } catch (error) {
    console.warn('计算耗时失败:', error)
    return null
  }
}

// 格式化耗时
const formatDuration = (duration: number): string => {
  if (duration < 1000) {
    return `${duration}ms`
  } else if (duration < 60000) {
    const seconds = (duration / 1000).toFixed(1)
    return `${seconds}s`
  } else {
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return seconds > 0 ? `${minutes}m${seconds}s` : `${minutes}m`
  }
}

// 计算两个节点之间的耗时
const calculateDurationBetweenNodes = (startStep: ConversationStep, endStep: ConversationStep | null): string => {
  if (!endStep || !startStep.timestamp || !endStep.timestamp) {
    return ''
  }
  
  try {
    const startTime = new Date(startStep.timestamp).getTime()
    const endTime = new Date(endStep.timestamp).getTime()
    
    if (isNaN(startTime) || isNaN(endTime)) {
      return ''
    }
    
    const duration = endTime - startTime
    return formatDuration(duration)
  } catch (error) {
    console.warn('计算节点间耗时失败:', error)
    return ''
  }
}

// 获取下一个耗时统计节点
const getNextDurationNode = (currentIndex: number): ConversationStep | null => {
  if (!processedSteps.value) return null
  
  for (let i = currentIndex + 1; i < processedSteps.value.length; i++) {
    const step = processedSteps.value[i]
    if (timelineStore.isDurationNode(step.id)) {
      return step
    }
  }
  return null
}

// 更新所有耗时连接线的高度
const updateDurationConnectorHeights = () => {
  if (typeof window === 'undefined') return
  
  // 使用单次requestAnimationFrame，在下一帧立即更新
  requestAnimationFrame(() => {
    const connectors = document.querySelectorAll('.duration-connector')
    
    connectors.forEach((connector: Element) => {
      const htmlConnector = connector as HTMLElement
      const fromId = htmlConnector.dataset.fromId
      const toId = htmlConnector.dataset.toId
      
      if (fromId && toId) {
        // 通过data-step-id查找对应的卡片元素
        const fromCard = document.querySelector(`[data-step-id="${fromId}"]`)
        const toCard = document.querySelector(`[data-step-id="${toId}"]`)
        
        if (fromCard && toCard) {
          // 找到对应的timeline-item
          const fromItem = fromCard.closest('.timeline-item')
          const toItem = toCard.closest('.timeline-item')
          
          if (fromItem && toItem) {
            const fromDot = fromItem.querySelector('.timeline-dot')
            const toDot = toItem.querySelector('.timeline-dot')
            
            if (fromDot && toDot) {
              const fromRect = fromDot.getBoundingClientRect()
              const toRect = toDot.getBoundingClientRect()
              const height = toRect.top - fromRect.top - 28
              
              if (height > 0) {
                htmlConnector.style.height = `${height}px`
              }
            }
          }
        }
      }
    })
  })
}

// 监听步骤变化，更新连接线高度
watch([processedSteps, () => timelineStore.durationNodes, () => timelineStore.expandedSteps], () => {
  updateDurationConnectorHeights()
}, { deep: true })

// 显示右键菜单
const showContextMenu = (event: MouseEvent, step: ConversationStep) => {
  event.preventDefault()
  contextMenuVisible.value = true
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  contextMenuStep.value = step
}

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuStep.value = null
}

// 设置为耗时统计节点
const setAsDurationNode = () => {
  if (contextMenuStep.value) {
    timelineStore.addDurationNode(contextMenuStep.value.id)
  }
  hideContextMenu()
}

// 取消耗时节点设置
const removeDurationNode = () => {
  if (contextMenuStep.value) {
    timelineStore.removeDurationNode(contextMenuStep.value.id)
  }
  hideContextMenu()
}

// 清除所有耗时节点设置
const clearAllDurationNodes = () => {
  timelineStore.clearDurationNodes()
  hideContextMenu()
}

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
    let result_content = null;
    
    if(step.toolResult) {
      if(step.toolResult.content) {
        //优先从step.toolResult.content获取
        result_content = step.toolResult.content;
      } else if(step.toolResult.rawLogEntry && step.toolResult.rawLogEntry.toolUseResult) {
        //如果获取不到，从step.toolResult.rawLogEntry.toolUseResult获取
        result_content = step.toolResult.rawLogEntry.toolUseResult;
      }
    }
    try {
      return result_content;
    } catch (error) {
      dwarn('toolUseResult JSON序列化失败:', error)
      return ''
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
  
  // 初始化时更新耗时连接线高度
  updateDurationConnectorHeights()
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
      // 加载子代理日志
      timelineStore.loadFile(targetAgentLog.id)
    }
  } catch (error) {
    console.error('加载子代理日志失败:', error)
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
  isCollapsible,
  shouldShowExpandButton,
  getContentForMeasurement,
  getDisplayContent,
  isContentTruncated,
  truncateContentByHeight,
  truncateText,
  extractPromptParam,
  getToolSpecificInfo,
  getSummaryText,
  getSummaryTooltip,
  handleSubAgentClick
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
  overflow: hidden;
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
  padding: 20px 0;
  /* 确保时间线主容器有合适的宽度限制 */
  max-width: 100%;
  overflow-x: hidden; /* 防止水平滚动 */
}

.timeline-item {
  display: flex;
  margin-bottom: 20px;
  cursor: pointer;
  min-width: 0;
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

/* 基础耗时显示 */
.timeline-elapsed {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  font-style: italic;
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
  transition: all 0.3s ease;
  cursor: pointer;
}

/* 耗时统计节点高亮样式 */
.timeline-dot.duration-node {
  width: 28px;
  height: 28px;
  border: 3px solid #fff;
  box-shadow: 0 0 0 3px #ff4d4f, 0 0 12px rgba(255, 77, 79, 0.4);
  animation: pulse-duration 2s infinite;
}

@keyframes pulse-duration {
  0%, 100% {
    box-shadow: 0 0 0 3px #ff4d4f, 0 0 12px rgba(255, 77, 79, 0.4);
  }
  50% {
    box-shadow: 0 0 0 3px #ff4d4f, 0 0 20px rgba(255, 77, 79, 0.6);
  }
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
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  margin-left: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
  /* 确保卡片不会超出容器宽度 */
  max-width: calc(100vw - 200px); /* 为左侧时间和连接线预留空间 */
  min-width: 400px; /* 设置统一的最小宽度，确保节点宽度一致 */
  width: calc(100vw - 200px); /* 设置固定宽度，让所有节点保持一致 */
  overflow: hidden; /* 防止内容溢出 */
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
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.tag-duration-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  align-items: center;
}

/* 收起状态下的摘要文本样式 */
.card-header .summary-text {
  display: block;
  flex: 1;
  max-width: calc(100% - 120px); /* 增加右侧空间，为耗时标签和展开按钮留出空间 */
  min-width: 0;
  transition: color 0.2s ease;
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-header .summary-text:hover {
  color: #1890ff;
}

/* 让摘要文本容器能够自适应宽度 */
.card-header .summary-text .tool-name-highlight,
.card-header .summary-text .subagent-type-highlight {
  display: inline;
  white-space: nowrap;
}

.card-header .summary-text .tool-specific-info,
.card-header .summary-text .subagent-prompt {
  display: inline;
  white-space: nowrap;
}

/* 移除之前的flex布局，改用inline-block */
.card-header .summary-text span {
  display: inline;
}

.tool-name-header {
  font-weight: 600;
  color: #722ed1;
  font-size: 13px;
}

.subagent-name-header {
  font-weight: 600;
  color: #eb2f96;
  font-size: 13px;
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

/* 展开收起状态图标 */
.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  min-width: 24px;
  height: 24px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #666;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: bold;
}

.expand-icon:hover {
  background-color: #f0f0f0;
  color: #1890ff;
}

.expand-icon svg {
  transition: transform 0.2s ease;
}

.expand-icon.expanded svg {
  transform: rotate(90deg);
}

.expand-button {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.expand-button:hover {
  border-color: #1890ff;
  color: #1890ff;
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

/* 用户消息、助手思考、助手消息节点的内容样式 */
.user-query-content,
.agent-thought-content,
.agent-message-content {
  padding: 8px 0;
}

.user-query-content .content-text,
.agent-thought-content .content-text,
.agent-message-content .content-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
}

/* 自定义滚动条样式 */
.user-query-content .content-text::-webkit-scrollbar,
.agent-thought-content .content-text::-webkit-scrollbar,
.agent-message-content .content-text::-webkit-scrollbar {
  width: 6px;
}

.user-query-content .content-text::-webkit-scrollbar-track,
.agent-thought-content .content-text::-webkit-scrollbar-track,
.agent-message-content .content-text::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.user-query-content .content-text::-webkit-scrollbar-thumb,
.agent-thought-content .content-text::-webkit-scrollbar-thumb,
.agent-message-content .content-text::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.user-query-content .content-text::-webkit-scrollbar-thumb:hover,
.agent-thought-content .content-text::-webkit-scrollbar-thumb:hover,
.agent-message-content .content-text::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 收起状态的摘要行样式 */
.card-summary {
  padding: 8px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-summary .step-type-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  background: #f0f0f0;
  color: #666;
  flex-shrink: 0;
}

.summary-text {
  display: flex;
  align-items: center;
  max-width: 100%;
  cursor: help;
  transition: color 0.2s ease;
  gap: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1;
}

.summary-text:hover {
  color: #1890ff;
}

/* 突出显示工具名称 */
.tool-name-highlight {
  font-weight: 600;
  color: #722ed1;
  font-size: 13px;
}

/* 突出显示子代理类型 */
.subagent-type-highlight {
  font-weight: 600;
  color: #eb2f96;
  font-size: 13px;
}

/* 分隔符样式 */
.separator {
  color: #999;
  font-size: 12px;
  margin: 0 2px;
}

/* 工具特定信息样式 */
.tool-specific-info {
  color: #333;
  font-size: 12px;
}

/* 子代理prompt样式 */
.subagent-prompt {
  color: #333;
  font-size: 12px;
}

/* 展开状态的完整内容样式 */
.tool-details-expanded,
.sub-agent-details-expanded {
  padding: 8px 0;
}

.tool-details-expanded .tool-parameters,
.sub-agent-details-expanded .sub-agent-parameters {
  background: #f8f8f8;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  max-height: none;
  overflow-y: visible;
  margin-top: 8px;
}

.tool-details-expanded .tool-parameters pre,
.sub-agent-details-expanded .sub-agent-parameters pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

/* Tool Result区域保持滚动 */
.tool-details-expanded .tool-result-container,
.sub-agent-details-expanded .tool-result-container {
  position: relative;
  margin-top: 16px;
  padding-left: 20px;
}

.tool-details-expanded .tool-result-container .result-content,
.sub-agent-details-expanded .tool-result-container .result-content {
  max-height: 350px;
  overflow-y: auto;
  font-size: 12px;
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
:deep(.json-key) {
  color: #0066cc;
}

:deep(.json-string) {
  color: #009900;
}

:deep(.json-number) {
  color: #cc6600;
}

:deep(.json-boolean) {
  color: #cc0066;
}

:deep(.json-null) {
  color: #999999;
}

:deep(.json-bracket) {
  color: #666666;
}

/* 搜索关键字高亮样式 */
:deep(.search-highlight-keyword) {
  background-color: #fffb8f;
  color: #d32f2f;
  padding: 1px 2px;
  border-radius: 2px;
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

/* 耗时统计连接线 */
.duration-connector {
  position: absolute;
  left: 50%;
  top: 28px;
  transform: translateX(-50%);
  width: 3px;
  min-height: 100px;
  background: linear-gradient(to bottom, #ff4d4f, #ff7875);
  border-radius: 2px;
  z-index: 9; /* 提高z-index层级，确保连接线显示在节点卡片之上 */
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.3);
}

/* 耗时标签 */
.duration-label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
  color: #fff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.4);
  z-index: 10; /* 提高z-index层级，确保显示在节点卡片之上 */
  border: 2px solid #fff;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 180px;
  padding: 4px 0;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  padding: 8px 16px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.context-menu-item:hover {
  background: #f5f5f5;
  color: #1890ff;
}

.context-menu-item:active {
  background: #e8e8e8;
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
    /* 移动端设置固定宽度，确保节点一致性 */
    width: calc(100vw - 120px);
    min-width: 280px; /* 移动端最小宽度 */
    max-width: calc(100vw - 120px);
  }
  
  .timeline-elapsed {
    font-size: 10px;
  }
  
  .duration-label {
    font-size: 10px;
    padding: 3px 8px;
  }
  
  /* 移动端摘要文本进一步缩小最大宽度 */
  .card-header .summary-text {
    max-width: calc(100% - 80px);
    font-size: 12px;
  }
}
</style>