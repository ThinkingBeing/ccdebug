import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import {
  LogFileInfo,
  ProjectInfo,
  ConversationData,
  ConversationStep,
  FilesApiResponse,
  ApiResponse,
  MainLogSummary,
  AvailableProjectInfo,
  ProjectsApiResponse
} from '../types/index'

// 前端调试日志开关：URL ?debug=1 或 localStorage.CCDEBUG_DEBUG=1
const hasWindow = typeof window !== 'undefined'
const DEBUG_LOGS = hasWindow && (
  new URLSearchParams(window.location.search).get('debug') === '1' ||
  window.localStorage.getItem('CCDEBUG_DEBUG') === '1'
)
const dlog = (...args: any[]) => { if (DEBUG_LOGS) console.log(...args) }
const dwarn = (...args: any[]) => { if (DEBUG_LOGS) console.warn(...args) }

export const useTimelineStore = defineStore('timeline', () => {
  // 状态
  const currentProject = ref<ProjectInfo | null>(null)
  const availableFiles = ref<LogFileInfo[]>([])
  const currentFileId = ref<string | null>(null)
  const conversations = ref<ConversationData[]>([])
  const currentConversation = ref<ConversationData | null>(null)
  const selectedStep = ref<ConversationStep | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const socket = ref<Socket | null>(null)

  // 主日志相关状态
  const mainLogs = ref<MainLogSummary[]>([])
  const selectedMainLog = ref<MainLogSummary | null>(null)
  const mainLogsLoading = ref(false)

  // 计算属性
  const currentConversationData = computed(() => {
    if (!currentConversation.value) return null
    return currentConversation.value
  })

  const currentStepData = computed(() => {
    if (!selectedStep.value) return null
    return selectedStep.value
  })

  const isConnected = computed(() => {
    return socket.value?.connected || false
  })

  // Actions
  const initialize = async () => {
    loading.value = true
    error.value = null

    try {
      // 获取项目信息
      const projectResponse = await axios.get<ApiResponse<ProjectInfo>>('/api/project/info')
      if (projectResponse.data.success && projectResponse.data.data) {
        currentProject.value = projectResponse.data.data
      }

      // 检查URL参数中的sessionId
      const urlParams = new URLSearchParams(window.location.search)
      const sessionId = urlParams.get('sessionid')

      // 如果有sessionId参数，使用旧的逻辑
      if (sessionId) {
        const filesUrl = `/api/files?sessionId=${encodeURIComponent(sessionId)}`
        const filesResponse = await axios.get<ApiResponse<FilesApiResponse>>(filesUrl)
        if (filesResponse.data.success && filesResponse.data.data) {
          const { files } = filesResponse.data.data
          availableFiles.value = files

          // 如果存在sessionId且只有一个匹配文件，自动加载
          if (files.length === 1) {
            dlog(`找到唯一匹配sessionId ${sessionId} 的文件，自动加载: ${files[0].id}`)
            await loadFile(files[0].id)
          }
        }
      } else {
        // 获取主日志列表
        await fetchMainLogs()

        // 默认选中第一个主日志
        if (mainLogs.value.length > 0) {
          await selectMainLog(mainLogs.value[0])
        }
      }

      // 初始化WebSocket连接
      initializeWebSocket()

    } catch (err) {
      console.error('初始化失败:', err)
      error.value = '初始化失败，请检查服务器连接'
    } finally {
      loading.value = false
    }
  }

  const loadFile = async (fileId: string) => {
    if (currentFileId.value === fileId && currentConversation.value !== null) return

    loading.value = true
    error.value = null

    // 先清空旧数据，避免显示上一个会话的内容
    currentConversation.value = null
    selectedStep.value = null
    conversations.value = []

    try {
      const response = await axios.get<ApiResponse<ConversationData>>(`/api/conversations/${fileId}`)

      if (response.data.success && response.data.data) {
        // 将单个对话数据包装成数组
        conversations.value = [response.data.data]
        currentFileId.value = fileId

        // 设置当前对话（即使没有步骤也要设置，这样才能显示空状态提示）
        currentConversation.value = response.data.data

        // 如果有步骤，自动选择第一个步骤
        if (response.data.data.steps && response.data.data.steps.length > 0) {
          selectedStep.value = response.data.data.steps[0]
        } else {
          selectedStep.value = null
        }
      } else {
        // 如果加载失败，保持清空状态
        currentFileId.value = fileId
        throw new Error(response.data.error || '加载文件失败')
      }
    } catch (err) {
      console.error('加载文件失败:', err)
      error.value = '加载文件失败，请重试'
      // 确保出错时也清空数据
      currentConversation.value = null
      selectedStep.value = null
      conversations.value = []
    } finally {
      loading.value = false
    }
  }

  const selectConversation = (conversation: ConversationData) => {
    currentConversation.value = conversation
    
    // 自动选择第一个步骤
    if (conversation.steps.length > 0) {
      selectedStep.value = conversation.steps[0]
    } else {
      selectedStep.value = null
    }
  }

  const selectStep = (step: ConversationStep | null) => {
    selectedStep.value = step
    
    // 如果选择了步骤，自动滚动到对应的时间线节点
    if (step) {
      scrollToStep(step.id)
    }
  }

  const scrollToStep = (stepId: string) => {
    // 使用nextTick确保DOM已更新
    setTimeout(() => {
      const stepElement = document.querySelector(`[data-step-id="${stepId}"]`)
      if (stepElement) {
        stepElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }, 100)
  }

  const initializeWebSocket = () => {
    if (socket.value) {
      socket.value.disconnect()
    }
    
    // 使用当前页面的端口，而不是硬编码的3001
    const currentPort = window.location.port || '3003'
    const socketUrl = `http://localhost:${currentPort}`
    
    socket.value = io(socketUrl, {
      transports: ['websocket', 'polling']
    })

    socket.value.on('connect', () => {
      dlog('WebSocket连接成功')
    })

    socket.value.on('disconnect', () => {
      dlog('WebSocket连接断开')
    })

    socket.value.on('file:updated', async (data) => {
      dlog('文件更新:', data)
      
      // 更新文件列表
      if (data.data.files) {
        availableFiles.value = data.data.files
      }
      
      // 如果当前文件被更新且有新的对话数据
      if (currentFileId.value && data.data.fileId === currentFileId.value) {
        if (data.data.conversations) {
          // 直接使用服务器提供的最新对话数据
          conversations.value = data.data.conversations
          
          // 保持当前选中的对话和步骤（如果仍然存在）
          if (currentConversation.value) {
            const updatedConversation = data.data.conversations.find(
              (conv: ConversationData) => conv.id === currentConversation.value?.id
            )
            if (updatedConversation) {
              currentConversation.value = updatedConversation
              
              // 保持当前选中的步骤（如果仍然存在）
              if (selectedStep.value) {
                // 获取当前选中步骤的 ID（处理字符串和对象两种情况）
                const currentStepId = typeof selectedStep.value === 'string' 
                  ? selectedStep.value 
                  : selectedStep.value.id
                
                const updatedStep = updatedConversation.steps.find(
                  (step: ConversationStep) => step.id === currentStepId
                )
                if (updatedStep) {
                  selectedStep.value = updatedStep
                } else {
                  // 如果当前步骤不存在了，选择最后一个步骤
                  selectedStep.value = updatedConversation.steps[updatedConversation.steps.length - 1] || null
                }
              }
            } else {
              // 如果当前对话不存在了，选择第一个对话
              if (data.data.conversations.length > 0) {
                selectConversation(data.data.conversations[0])
              } else {
                currentConversation.value = null
                selectedStep.value = null
              }
            }
          } else if (data.data.conversations.length > 0) {
            // 如果没有选中对话，自动选择第一个
            selectConversation(data.data.conversations[0])
          }
        } else {
          // 如果没有提供对话数据，重新加载文件
          await loadFile(currentFileId.value)
        }
      }
    })

    socket.value.on('project:changed', (data) => {
      dlog('项目变更:', data)
      // 重新初始化
      initialize()
    })
  }

  const refreshFiles = async () => {
    try {
      // 检查URL参数中的sessionId
      const urlParams = new URLSearchParams(window.location.search)
      const sessionId = urlParams.get('sessionid')

      const filesUrl = sessionId ? `/api/files?sessionId=${encodeURIComponent(sessionId)}` : '/api/files'
      const response = await axios.get<ApiResponse<FilesApiResponse>>(filesUrl)

      if (response.data.success && response.data.data) {
        availableFiles.value = response.data.data.files

        // 移除自动选择最新文件的逻辑，让用户手动选择
        // if (!currentFileId.value && response.data.data.files.length > 0) {
        //   const latestFile = response.data.data.files[0]
        //   await loadFile(latestFile.id)
        // }
      }
    } catch (err) {
      console.error('刷新文件列表失败:', err)
      error.value = '刷新文件列表失败'
    }
  }

  const clearError = () => {
    error.value = null
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
  }

  // 获取主日志列表
  const fetchMainLogs = async () => {
    mainLogsLoading.value = true
    error.value = null

    try {
      const response = await axios.get<ApiResponse<{mainLogs: MainLogSummary[], logDir: string}>>('/api/main-logs')

      if (response.data.success && response.data.data) {
        mainLogs.value = response.data.data.mainLogs
        dlog(`获取到 ${mainLogs.value.length} 个主日志`)
      } else {
        throw new Error(response.data.error || '获取主日志列表失败')
      }
    } catch (err) {
      console.error('获取主日志列表失败:', err)
      error.value = '获取主日志列表失败，请重试'
    } finally {
      mainLogsLoading.value = false
    }
  }

  // 选择主日志，刷新文件列表
  const selectMainLog = async (mainLog: MainLogSummary) => {
    selectedMainLog.value = mainLog
    loading.value = true
    error.value = null

    try {
      // 获取该主日志及其子agent日志的文件列表
      const filesUrl = `/api/files?mainLogId=${encodeURIComponent(mainLog.id)}`
      const response = await axios.get<ApiResponse<FilesApiResponse>>(filesUrl)

      if (response.data.success && response.data.data) {
        availableFiles.value = response.data.data.files
        dlog(`选中主日志 ${mainLog.id}，共 ${availableFiles.value.length} 个文件`)

        // 自动加载主日志文件
        if (availableFiles.value.length > 0) {
          await loadFile(mainLog.id)
        }
      } else {
        throw new Error(response.data.error || '获取文件列表失败')
      }
    } catch (err) {
      console.error('选择主日志失败:', err)
      error.value = '选择主日志失败，请重试'
    } finally {
      loading.value = false
    }
  }

  // 获取可用项目列表
  const fetchAvailableProjects = async (): Promise<AvailableProjectInfo[]> => {
    try {
      const response = await axios.get<ApiResponse<ProjectsApiResponse>>('/api/projects')
      if (response.data.success && response.data.data) {
        dlog(`获取到 ${response.data.data.projects.length} 个可用项目`)
        return response.data.data.projects
      }
      throw new Error(response.data.error || '获取项目列表失败')
    } catch (err) {
      console.error('获取项目列表失败:', err)
      error.value = '获取项目列表失败，请重试'
      throw err
    }
  }

  // 切换项目
  const switchProject = async (projectPath: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post<ApiResponse<{ projectDir: string; logDir: string }>>(
        '/api/project/switch',
        { projectPath }
      )

      if (response.data.success && response.data.data) {
        console.log(`项目已切换到: ${response.data.data.projectDir}`)
        console.log(`日志目录: ${response.data.data.logDir}`)

        // 切换项目前先清空所有旧数据
        currentFileId.value = null
        currentConversation.value = null
        selectedStep.value = null
        conversations.value = []
        availableFiles.value = []
        mainLogs.value = []
        selectedMainLog.value = null

        // 切换成功后重新初始化
        await initialize()
      } else {
        throw new Error(response.data.error || '切换项目失败')
      }
    } catch (err) {
      console.error('切换项目失败:', err)
      error.value = '切换项目失败，请重试'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    currentProject,
    availableFiles,
    currentFileId,
    conversations,
    currentConversation,
    selectedStep,
    loading,
    error,
    mainLogs,
    selectedMainLog,
    mainLogsLoading,

    // 计算属性
    currentConversationData,
    currentStepData,
    isConnected,

    // Actions
    initialize,
    loadFile,
    selectConversation,
    selectStep,
    scrollToStep,
    refreshFiles,
    clearError,
    disconnect,
    fetchMainLogs,
    selectMainLog,
    fetchAvailableProjects,
    switchProject
  }
})