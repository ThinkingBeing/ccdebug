<template>
  <div class="debug-page">
    <div class="header">
      <h1>LLM请求调试</h1>
      <div class="params-info">
        <div class="param-item">
          <span class="label">文件ID:</span>
          <span class="value">{{ fileId || '-' }}</span>
        </div>
        <div class="param-item">
          <span class="label">步骤ID:</span>
          <span class="value">{{ stepId || '-' }}</span>
        </div>
        <div class="param-item">
          <span class="label">步骤类型:</span>
          <span class="value">{{ stepType || '-' }}</span>
        </div>
        <div class="param-item">
          <span class="label">消息ID:</span>
          <span class="value">{{ messageId || '-' }}</span>
        </div>
      </div>
    </div>

    <div class="content">
      <div v-if="loading" class="loading">
        正在加载LLM请求日志...
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
        <button @click="loadLLMLog" class="retry-button">重试</button>
      </div>
      
      <div v-else-if="llmLogData" class="llm-log-container">
        <div class="main-layout">
          <!-- 左侧：请求数据 -->
          <div class="left-panel">
            <div class="section">
              <div class="section-header">
                <h2>LLM请求数据</h2>
              </div>
              
              <div class="user-messages">
                <div class="user-messages-header">
                  <a-alert title="您可以修改请求数据，并重新发送请求，以便反复验证LLM回复" type="info" show-icon>
                    <template #action>
                      <button @click="addMessage" class="add-message-btn-top">添加消息</button>
                    </template>
                  </a-alert>
                </div>
                <div class="messages-container">
                  <div v-for="(message, index) in editableMessages" :key="index" class="message-item">
                    <div class="message-header">
                      <select v-model="message.role" class="role-select">
                        <option value="user">user</option>
                        <option value="assistant">assistant</option>
                        <option value="system">system</option>
                      </select>
                      <button @click="deleteMessage(index)" class="delete-btn">删除</button>
                    </div>
                    
                    <!-- 处理多个content的情况 -->
                    <div v-if="Array.isArray(message.content)" class="content-list">
                      <div v-for="(content, contentIndex) in message.content" :key="contentIndex" class="content-item">
                        <div class="content-header">
                          <span class="content-type">{{ content.type || 'text' }}</span>
                          <button @click="deleteContent(index, contentIndex)" class="delete-content-btn">删除内容</button>
                        </div>
                        <textarea v-if="content.type === 'text'"
                          v-model="content.text" 
                          class="content-textarea"
                          placeholder="请输入工具使用的内容..."
                        ></textarea>
                        <textarea v-if="content.type === 'tool_use'"
                          :value="JSON.stringify(content.input, null, 2)"
                          @input="val => { try { content.input = JSON.parse(val.target.value) } catch(e) { content.input = val.target.value } }"
                          class="content-textarea-tool_use"
                          placeholder="输入内容..."
                        ></textarea>
                        <textarea v-if="content.type === 'tool_result'"
                          v-model="content.content" 
                          class="content-textarea-tool_use"
                          placeholder="输入内容..."
                        ></textarea>
                      </div>
                      <button @click="addContent(index)" class="add-content-btn">添加内容</button>
                    </div>
                    
                    <!-- 单个content的情况 -->
                    <div v-else class="single-content">
                      <textarea 
                        v-model="message.content" 
                        class="message-content"
                        rows="4"
                        placeholder="输入消息内容..."
                      ></textarea>
                      <button @click="convertToMultiContent(index)" class="convert-btn">转换为多内容</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：响应数据 -->
          <div class="right-panel">
            <div class="section">
              <div class="section-header">
                <h2>LLM响应数据</h2>
              </div>
              
              <div class="response-tabs">
                <div class="tab-headers">
                  <div 
                    v-for="(tab, index) in responseTabs" 
                    :key="index"
                    :class="['tab-header', { active: activeTabIndex === index }]"
                    @click="activeTabIndex = index"
                  >
                    {{ tab.title }}
                    <button 
                      v-if="index > 0" 
                      @click.stop="closeTab(index)" 
                      class="close-tab-btn"
                    >×</button>
                  </div>
                </div>
                
                <div class="tab-content">
                  <div v-if="responseTabs[activeTabIndex]" class="response-content">
                    <pre class="json-display" v-html="formatJsonWithHighlight(responseTabs[activeTabIndex].data)"></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button 
            @click="saveRequest" 
            :disabled="saving"
            class="save-button"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button 
            @click="sendRequest" 
            :disabled="sending"
            class="send-button"
          >
            {{ sending ? '发送中...' : '单次请求' }}
          </button>
          <button 
            @click="viewFullLog" 
            class="view-log-button"
          >
            查看请求完整数据
          </button>
        </div>
      </div>
      
      <div v-else class="no-data">
        暂无数据
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 响应式数据
const llmLogData = ref<any>(null)
const fileId = ref<string>('')
const stepId = ref<string>('')
const stepType = ref<string>('')
const messageId = ref<string>('')
const loading = ref(false)
const error = ref<string>('')
const saving = ref(false)
const sending = ref(false)

// 编辑相关数据
const editableMessages = ref<Array<{role: string, content: string}>>([])
const otherRequestData = ref<any>({})

// 计算属性：完整的请求数据（实时更新）
const fullRequestData = computed(() => {
  if (!otherRequestData.value) return {}
  
  // 构建完整的请求对象
  const fullRequest = {
    ...otherRequestData.value,
    body: {
      ...otherRequestData.value.body,
      messages: editableMessages.value
    }
  }
  
  return fullRequest
})

// 响应标签页数据
const responseTabs = ref<Array<{title: string, data: any}>>([])
const activeTabIndex = ref(0)

// 从URL参数获取信息
function getUrlParams() {
  return {
    fileId: route.query.fileId as string,
    stepId: route.query.stepId as string,
    stepType: route.query.stepType as string
  }
}

// JSON语法高亮格式化
function formatJsonWithHighlight(obj: any): string {
  if (!obj) return ''
  
  const jsonString = JSON.stringify(obj, null, 2)
  
  // 简单的语法高亮
  return jsonString
    .replace(/(".*?")\s*:/g, '<span class="json-key">$1</span>:')
    .replace(/:\s*(".*?")/g, ': <span class="json-string">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
}

// 处理LLM日志数据，分离请求和响应
function processLLMLogData(data: any) {
  if (!data) return

  // 提取用户消息数据
  const messages = data.request?.body?.messages || []
  editableMessages.value = messages.map((msg: any) => ({
    role: msg.role || 'user',
    content: typeof msg.content === 'string' ? msg.content : msg.content
  }))

  // 保存完整的请求数据（不删除messages，因为会通过计算属性动态合并）
  otherRequestData.value = JSON.parse(JSON.stringify(data.request || {}))

  // 初始化响应标签页
  responseTabs.value = [
    {
      title: '原始响应',
      data: data.response || {}
    }
  ]
  activeTabIndex.value = 0
}

// 添加消息
function addMessage() {
  editableMessages.value.push({
    role: 'user',
    content: ''
  })
}

// 删除消息
function deleteMessage(index: number) {
  editableMessages.value.splice(index, 1)
}

// 添加内容到消息
function addContent(messageIndex: number) {
  const message = editableMessages.value[messageIndex]
  if (!Array.isArray(message.content)) {
    message.content = [{ type: 'text', text: message.content || '' }]
  }
  message.content.push({ type: 'text', text: '' })
}

// 删除消息中的内容
function deleteContent(messageIndex: number, contentIndex: number) {
  const message = editableMessages.value[messageIndex]
  if (Array.isArray(message.content)) {
    message.content.splice(contentIndex, 1)
    if (message.content.length === 1) {
      // 如果只剩一个内容，转换回单个内容格式
      message.content = message.content[0].text
    }
  }
}

// 转换为多内容格式
function convertToMultiContent(messageIndex: number) {
  const message = editableMessages.value[messageIndex]
  if (!Array.isArray(message.content)) {
    message.content = [{ type: 'text', text: message.content || '' }]
  }
}

// 查看完整日志
function viewFullLog() {
  if (!llmLogData.value) {
    alert('暂无日志数据')
    return
  }
  
  // 创建新窗口显示完整日志
  const newWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
  if (newWindow) {
    const logContent = JSON.stringify(llmLogData.value.request, null, 2)
    
    // JSON语法高亮函数
    const highlightJson = (json: string) => {
      return json
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
          let cls = 'json-number'
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key'
            } else {
              cls = 'json-string'
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean'
          } else if (/null/.test(match)) {
            cls = 'json-null'
          }
          return '<span class="' + cls + '">' + match + '</span>'
        })
    }
    
    const highlightedContent = highlightJson(logContent)
    
    const htmlContent = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '  <title>完整LLM请求日志</title>',
      '  <' + 'style>',
      '    body { ',
      '      font-family: "Monaco", "Menlo", "Consolas", "Courier New", monospace; ',
      '      margin: 20px; ',
      '      background: #f8f9fa; ',
      '      line-height: 1.5;',
      '    }',
      '    .container {',
      '      max-width: 100%;',
      '      background: white;',
      '      border-radius: 8px;',
      '      box-shadow: 0 2px 10px rgba(0,0,0,0.1);',
      '      overflow: hidden;',
      '    }',
      '    .header {',
      '      background: #2c3e50;',
      '      color: white;',
      '      padding: 15px 20px;',
      '      margin: 0;',
      '      font-size: 18px;',
      '      font-weight: 500;',
      '    }',
      '    pre { ',
      '      background: #ffffff; ',
      '      padding: 20px; ',
      '      margin: 0;',
      '      overflow: auto; ',
      '      white-space: pre-wrap; ',
      '      word-break: break-all;',
      '      font-size: 13px;',
      '      line-height: 1.6;',
      '    }',
      '    ',
      '    /* JSON语法高亮样式 */',
      '    .json-key {',
      '      color: #0066cc;',
      '      font-weight: 600;',
      '    }',
      '    .json-string {',
      '      color: #22863a;',
      '    }',
      '    .json-number {',
      '      color: #005cc5;',
      '    }',
      '    .json-boolean {',
      '      color: #d73a49;',
      '      font-weight: 600;',
      '    }',
      '    .json-null {',
      '      color: #6f42c1;',
      '      font-weight: 600;',
      '    }',
      '    ',
      '    /* 复制按钮 */',
      '    .copy-btn {',
      '      position: fixed;',
      '      top: 20px;',
      '      right: 20px;',
      '      background: #28a745;',
      '      color: white;',
      '      border: none;',
      '      padding: 10px 15px;',
      '      border-radius: 5px;',
      '      cursor: pointer;',
      '      font-size: 14px;',
      '      z-index: 1000;',
      '    }',
      '    .copy-btn:hover {',
      '      background: #218838;',
      '    }',
      '    .copy-btn:active {',
      '      background: #1e7e34;',
      '    }',
      '  </' + 'style>',
      '</' + 'head>',
      '<body>',
      '  <button class="copy-btn" onclick="copyToClipboard()">复制JSON</button>',
      '  <div class="container">',
      '    <h1 class="header">完整LLM请求日志</h1>',
      '    <pre id="json-content">' + highlightedContent + '</pre>',
      '  </div>',
      '  ',
      '  <' + 'script>',
      '    function copyToClipboard() {',
      '      const jsonText = ' + JSON.stringify(logContent) + ';',
      '      navigator.clipboard.writeText(jsonText).then(() => {',
      '        const btn = document.querySelector(".copy-btn");',
      '        const originalText = btn.textContent;',
      '        btn.textContent = "已复制!";',
      '        btn.style.background = "#17a2b8";',
      '        setTimeout(() => {',
      '          btn.textContent = originalText;',
      '          btn.style.background = "#28a745";',
      '        }, 2000);',
      '      }).catch(err => {',
      '        console.error("复制失败:", err);',
      '        alert("复制失败，请手动选择文本复制");',
      '      });',
      '    }',
      '  </' + 'script>',
      '</' + 'body>',
      '</' + 'html>'
    ].join('\n')
    
    newWindow.document.write(htmlContent)
    newWindow.document.close()
  }
}

// 关闭标签页
function closeTab(index: number) {
  if (index === 0) return // 不能关闭原始响应标签页
  responseTabs.value.splice(index, 1)
  if (activeTabIndex.value >= index) {
    activeTabIndex.value = Math.max(0, activeTabIndex.value - 1)
  }
}

// 保存请求数据
async function saveRequest() {
  if (!messageId.value) {
    alert('缺少消息ID')
    return
  }

  saving.value = true
  try {
    // 构建完整的请求数据
    const requestData = {
      ...otherRequestData.value,
      body: {
        ...otherRequestData.value.body,
        messages: editableMessages.value
      }
    }

    const response = await fetch(`/api/llm-requests/${messageId.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error('保存失败')
    }

    alert('保存成功')
  } catch (err: any) {
    console.error('保存失败:', err)
    alert('保存失败: ' + err.message)
  } finally {
    saving.value = false
  }
}

// 发送单次请求
async function sendRequest() {
  sending.value = true
  try {
    // 构建请求数据 - 直接使用body中的数据
    const requestData = llmLogData.value.request

    const response = await (await fetch('/api/llm-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    })).json();

    if (!response.success) {
      throw new Error(`请求失败:${response.error}`)
    }
    
    // 创建新的响应标签页用于显示流式内容
    const newTabTitle = `请求 ${responseTabs.value.length}`
    const newTab = {
      title: newTabTitle,
      data: response.data
    }

    responseTabs.value.push(newTab)
    activeTabIndex.value = responseTabs.value.length - 1

  } catch (err: any) {
    console.error('发送请求失败:', err)
    alert('发送请求失败: ' + err.message)
    
    // 如果已经创建了标签页，更新为错误状态
    if (responseTabs.value.length > 0) {
      responseTabs.value[activeTabIndex.value].data = {
        success: false,
        error: err.message
      }
    }
  } finally {
    sending.value = false
  }
}

// 加载LLM请求日志
async function loadLLMLog() {
  const params = getUrlParams()
  
  if (!params.fileId || !params.stepId) {
    error.value = '缺少必要的参数'
    return
  }

  // 更新显示的参数信息
  fileId.value = params.fileId
  stepId.value = params.stepId
  stepType.value = params.stepType || ''

  loading.value = true
  error.value = ''

  try {
    let msgId = params.messageId || params.stepId // 优先使用messageId参数，否则使用stepId

    // 如果没有直接提供messageId，尝试从步骤信息中获取
    if (!params.messageId) {
      try {
        const stepResponse = await fetch(`/api/conversations/${params.fileId}/steps/${params.stepId}`)
        
        if (stepResponse.ok) {
          const stepResult = await stepResponse.json()
          
          if (stepResult.success && stepResult.data && stepResult.data.rawLogEntry?.message?.id) {
            msgId = stepResult.data.rawLogEntry.message.id
          }
        }
      } catch (stepErr) {
        console.warn('无法获取步骤信息，使用stepId作为messageId:', stepErr)
      }
    }

    // 更新消息ID显示
    messageId.value = msgId

    // 根据sessionid（即fileId）查找LLM请求日志文件
    const llmLogResponse = await (await fetch(`/api/conversations/${params.fileId}/llm-logs/${msgId}`)).json();
    
    if (!llmLogResponse.success) {
      throw new Error(llmLogResponse.error);
    }

    llmLogData.value = llmLogResponse.data;
    processLLMLogData(llmLogResponse.data);

  } catch (err: any) {
    console.error('加载LLM日志失败:', err)
    error.value = err.message || '加载LLM日志失败'
  } finally {
    loading.value = false
  }
}

// 页面加载时自动加载数据
onMounted(() => {
  loadLLMLog()
})
</script>

<style scoped>
.debug-page {
  padding: 10;
  min-height: 100vh;
  margin: 0;
  box-sizing: border-box;
  width: 100%;
  max-width: none;
}

.header {
  margin-bottom: 20px;
  margin-left: 20px;
  border-bottom: 1px solid #e8e8e8;
  padding: 15px 0; /* 移除左右padding，只保留上下padding */
}

.header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 24px;
}

.content {
  padding: 0; /* 完全移除padding */
}

.params-info {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.param-item .label {
  font-weight: 500;
  color: #666;
}

.param-item .value {
  color: #333;
  font-family: 'Monaco', 'Menlo', monospace;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #ff4d4f;
}

.retry-button {
  margin-left: 10px;
  padding: 6px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background: #40a9ff;
}

.main-layout {
  display: flex;
  gap: 0; /* 移除gap，避免影响全宽 */
  height: calc(100vh - 180px);
  /* 移除width设置，让它自然占满宽度 */
  margin: 0;
  padding: 0;
}

.left-panel, .right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.section {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  height: 100%;
  display: flex;
  flex-direction: column;
  margin: 0; /* 确保没有外边距 */
}

.section-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  border-radius: 6px 6px 0 0;
}

.section-header h2 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.user-messages {
  padding: 5px 5px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-messages h3 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
  flex-shrink: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.message-item {
  margin-bottom: 15px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 10px;
  background: #fafafa;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.role-select {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-size: 12px;
}

.delete-btn {
  padding: 4px 8px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}

.delete-btn:hover {
  background: #ff7875;
}

.message-content {
  width: 100%;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  resize: vertical;
  min-height: 120px;
}

.user-messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-messages-header h3 {
  margin: 0;
}

.add-message-btn-top {
  padding: 6px 12px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.add-message-btn-top:hover {
  background: #73d13d;
}

.add-message-btn {
  padding: 8px 16px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.add-message-btn:hover {
  background: #73d13d;
}

.content-list {
  margin-top: 8px;
}

.content-item {
  margin-bottom: 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
  background: #ffffff;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.content-type {
  font-size: 11px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 2px;
}

.delete-content-btn {
  padding: 2px 6px;
  background: #ef8514;
  color: white;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-size: 11px;
}

.delete-content-btn:hover {
  background: #ff4d4f;
}

.content-textarea {
  width: 100%;
  height: 120px;
  padding: 6px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
}

.content-textarea-tool_use {
  width: 100%;
  height: 240px;
  padding: 6px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  resize: vertical;
  min-height: 60px;
}

.add-content-btn {
  padding: 4px 8px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  margin-top: 5px;
}

.add-content-btn:hover {
  background: #73d13d;
}

.single-content {
  margin-top: 8px;
}

.convert-btn {
  padding: 4px 8px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  margin-top: 5px;
}

.convert-btn:hover {
  background: #40a9ff;
}

.view-log-button {
  background: #722ed1;
  color: white;
}

.view-log-button:hover:not(:disabled) {
  background: #9254de;
}

.other-request-data {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.json-display {
  background: #f8f8f8;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 15px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow: auto;
  flex: 1;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.response-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-headers {
  display: flex;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.tab-header {
  padding: 10px 15px;
  cursor: pointer;
  border-right: 1px solid #e8e8e8;
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.tab-header.active {
  background: white;
  color: #1890ff;
  border-bottom: 2px solid #1890ff;
  margin-bottom: -1px;
}

.tab-header:hover {
  background: #e6f7ff;
}

.close-tab-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.close-tab-btn:hover {
  background: #ff4d4f;
  color: white;
}

.tab-content {
  flex: 1;
  overflow: hidden;
}

.response-content {
  height: 100%;
  overflow: auto;
  padding: 15px 20px;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

.save-button, .send-button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.save-button {
  background: #52c41a;
  color: white;
}

.save-button:hover:not(:disabled) {
  background: #73d13d;
}

.send-button {
  background: #1890ff;
  color: white;
}

.send-button:hover:not(:disabled) {
  background: #40a9ff;
}

.save-button:disabled, .send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* JSON 语法高亮 */
.json-display :deep(.json-key) {
  color: #0066cc;
  font-weight: bold;
}

.json-display :deep(.json-string) {
  color: #009900;
}

.json-display :deep(.json-number) {
  color: #cc6600;
}

.json-display :deep(.json-boolean) {
  color: #cc0066;
  font-weight: bold;
}

.json-display :deep(.json-null) {
  color: #999999;
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-layout {
    flex-direction: column;
    height: auto;
    gap: 10px;
  }
  
  .left-panel, .right-panel {
    height: 500px;
  }
}

@media (max-width: 768px) {
  
  .params-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .main-layout {
    gap: 5px;
  }
  
  .left-panel, .right-panel {
    height: 400px;
  }
}
</style>