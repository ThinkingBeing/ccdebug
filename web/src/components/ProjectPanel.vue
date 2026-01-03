<template>
  <div class="file-selector">
    <a-card title="项目信息" :bordered="false" size="small" class="file-card">
      <template #extra>
        <a-button type="primary" size="small" @click="showProjectDialog" :loading="projectsLoading">
          选择项目
        </a-button>
      </template>
      <div class="info-item">
        <span class="label">项目路径:</span>
        <span class="value">{{ currentProject?.path || "未知" }}</span>
      </div>
      <div class="info-item">
        <span class="label">日志目录:</span>
        <span class="value">{{ currentProject?.logDir || "未知" }}</span>
      </div>
    </a-card>

    <a-card title="日志文件" :bordered="false" size="small" class="file-card">
      <template #extra>
        <a-button type="primary" size="small" @click="showMainLogDialog" :loading="mainLogsLoading">
          选择会话
        </a-button>
      </template>
      <div class="file-selector-content">
        <a-select
          v-model="selectedFileId"
          placeholder="请选择日志文件"
          :loading="loading"
          :disabled="availableFiles.length === 0"
          @change="handleFileChange"
          class="file-select"
          :popup-container="'.file-selector'"
          :popup-props="{
            class: 'custom-select-popup'
          }"
        >
          <a-option
            v-for="file in availableFiles"
            :key="file.id"
            :value="file.id"
            :label="getFileDisplayName(file)"
          >
            <div class="file-option">
              <div class="file-name">{{ getFileDisplayName(file) }}<span class="step-count">({{ getFileStepCount(file) }}步)</span></div>
            </div>
          </a-option>
        </a-select>

        <div v-if="availableFiles.length === 0 && !loading" class="no-files">
          <a-empty description="未找到日志文件" />
        </div>
      </div>
    </a-card>

    <!-- 主日志选择对话框 -->
    <MainLogSelectDialog
      v-model:visible="mainLogDialogVisible"
      :main-logs="mainLogs"
      :loading="mainLogsLoading"
      @select="handleMainLogSelect"
    />

    <!-- 项目选择对话框 -->
    <ProjectSelectDialog
      v-model:visible="projectDialogVisible"
      :projects="availableProjects"
      :current-project="currentProject?.path"
      :loading="projectsLoading"
      @select="handleProjectSelect"
    />
    <div v-if="selectedFileId">
      <a-card title="日志信息" :bordered="false" size="small" class="file-card">
        <div class="detail-item">
          <span class="label">文件名:</span>
          <span class="value">{{ getCurrentFileDisplayName() }}</span>
        </div>
        <div class="detail-item">
          <span class="label">开始时间:</span>
          <span class="value">{{
            currentConversation?.timestamp ? formatDateTime(currentConversation.timestamp) : '-'
          }}</span>
        </div>
        <div class="detail-item">
          <span class="label">步骤数量:</span>
          <span class="value">{{
            currentConversation?.steps ? currentConversation.steps.filter((s) => s.type !== "tool_result").length : 0
          }}</span>
        </div>
      </a-card>
      <a-card v-if="currentConversation?.steps && currentConversation.steps.length > 0" title="步骤概览" :bordered="false" class="file-card" size="small">
        <!-- 节点类型过滤器 -->
        <template #extra>
          <a-popover trigger="click" position="bottom">
            <template #content>
              <div class="step-type-filter">
                <div class="filter-header">选择要显示的节点类型</div>
                <a-tree
                  v-model:checked-keys="checkedKeys"
                  :data="treeData"
                  :checkable="true"
                  :default-expand-all="true"
                  :show-line="false"
                  size="mini"
                  :block-node="true"
                >
                  <template #icon="{ node }">
                    <div 
                      class="tree-node-color" 
                      :style="{ 
                        backgroundColor: node.key.startsWith('tool:') 
                          ? '#722ed1' 
                          : availableStepTypes.find(t => t.value === node.key)?.color 
                      }"
                    ></div>
                  </template>
                </a-tree>
                <div class="filter-actions">
                  <a-button 
                    size="mini" 
                    @click="selectAllStepTypes"
                  >
                    全选
                  </a-button>
                  <a-button 
                    size="mini" 
                    @click="clearAllStepTypes"
                  >
                    清空
                  </a-button>
                </div>
              </div>
            </template>
            <a-button type="text" size="small">
              <template #icon>
                <icon-filter />
              </template>
              过滤 ({{ filteredSteps.length }})
            </a-button>
          </a-popover>
        </template>
        
        <div class="steps-chart">
          <div
            v-for="(step, index) in filteredSteps"
            :key="step.id"
            class="step-bar"
            :class="{ selected: selectedStep?.id === step.id }"
            :style="{
              backgroundColor: getNodeLightColor(step.type),
              borderColor: getNodeColor(step.type),
              color: getNodeColor(step.type),
            }"
            :title="`${step.type} - ${formatTime(step.timestamp)}`"
            @click="selectStep(step)"
          >
            <span class="step-index">{{ step.originalIndex }}</span>
          </div>
        </div>
        
        <!-- 显示过滤统计信息 -->
        <div v-if="currentConversation" class="filter-stats">
          显示 {{ filteredSteps.length }} / {{ currentConversation.steps.filter(s => s.type !== 'tool_result').length }} 个步骤
        </div>
      </a-card>
    </div>
    <!-- 添加用户提示信息 -->
        <div v-else
          class="file-hint"
        >
          <a-alert>选择一个日志文件以查看对话时间线和详细信息</a-alert>
        </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { 
  Button as AButton, 
  Card as ACard, 
  Select as ASelect, 
  Option as AOption,
  Checkbox as ACheckbox,
  CheckboxGroup as ACheckboxGroup,
  Popover as APopover,
  Empty as AEmpty,
  Tag as ATag,
  Tree as ATree
} from '@arco-design/web-vue'
import { 
  IconFilter, 
  IconDown, 
  IconUp 
} from '@arco-design/web-vue/es/icon'
import MainLogSelectDialog from './MainLogSelectDialog.vue'
import ProjectSelectDialog from './ProjectSelectDialog.vue'
import { useTimelineStore } from '../stores/timeline'
import { getNodeColor, getNodeLightColor } from '../utils/colors'

// 统一前端调试开关：URL ?debug=1 或 localStorage.CCDEBUG_DEBUG=1
const DEBUG_LOGS = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1' || window.localStorage.getItem('CCDEBUG_DEBUG') === '1';
  } catch {
    return false;
  }
})();
const dlog = (...args: any[]) => { if (DEBUG_LOGS) console.log(...args); };
const dwarn = (...args: any[]) => { if (DEBUG_LOGS) console.warn(...args); };

const timelineStore = useTimelineStore();

// 计算属性
const currentProject = computed(() => timelineStore.currentProject);
const availableFiles = computed(() => timelineStore.availableFiles);
const currentFileId = computed(() => timelineStore.currentFileId);
const conversations = computed(() => timelineStore.conversations);
const currentConversation = computed(() => timelineStore.currentConversation);
const selectedStep = computed(() => timelineStore.selectedStep);
const loading = computed(() => timelineStore.loading);
const isConnected = computed(() => timelineStore.isConnected);
const mainLogs = computed(() => timelineStore.mainLogs);
const mainLogsLoading = computed(() => timelineStore.mainLogsLoading);

// 本地状态
const selectedFileId = ref<string | null>(null)
const currentSessionId = ref<string | null>(null);
const mainLogDialogVisible = ref(false);
const projectDialogVisible = ref(false);
const availableProjects = ref<AvailableProjectInfo[]>([]);
const projectsLoading = ref(false);

// 节点类型过滤器状态
const availableStepTypes = [
  { value: 'user_message', label: '用户消息', color: '#1890ff' },
  { value: 'assistant_thinking', label: '助手思考', color: '#faad14' },
  { value: 'assistant_message', label: '助手消息', color: '#52c41a' },
  { value: 'tool_call', label: '工具调用', color: '#722ed1' },
  { value: 'sub_agent', label: '子代理', color: '#eb2f96' }
];

// 默认选中所有类型（除了tool_result，保持原有行为）
const selectedStepTypes = ref<string[]>([
  'user_message', 
  'assistant_thinking', 
  'assistant_message', 
  'tool_call', 
  'sub_agent'
]);

// Tree组件的选中节点
const checkedKeys = ref<string[]>([]);

// 动态获取当前会话中所有唯一的工具名称
const availableToolNames = computed(() => {
  if (!currentConversation.value?.steps) return [];
  
  const toolNames = new Set<string>();
  currentConversation.value.steps.forEach(step => {
    if (step.type === 'tool_call' && step.tool_name) {
      toolNames.add(step.tool_name);
    }
  });
  
  return Array.from(toolNames).sort();
});

// 监听availableStepTypes和availableToolNames变化，设置默认选中
watch([() => availableStepTypes, availableToolNames], ([stepTypes, toolNames]) => {
  if (stepTypes.length > 0 && checkedKeys.value.length === 0) {
    // 默认选中所有步骤类型和工具名称
    const allKeys = stepTypes.map(t => t.value);
    const toolKeys = toolNames.map(name => `tool:${name}`);
    checkedKeys.value = [...allKeys, ...toolKeys];
  }
}, { immediate: true });

// 构建Tree组件的数据结构
const treeData = computed(() => {
  return availableStepTypes.map(stepType => {
    if (stepType.value === 'tool_call') {
      // 工具调用类型有子节点
      return {
        key: stepType.value,
        title: stepType.label,
        children: availableToolNames.value.map(toolName => ({
          key: `tool:${toolName}`,
          title: toolName
        }))
      };
    }
    return {
      key: stepType.value,
      title: stepType.label
    };
  });
});

// 计算过滤后的步骤
const filteredSteps = computed(() => {
  if (!currentConversation.value?.steps) return [];
  
  return currentConversation.value.steps.filter(step => {
    // 将 agent_child 和 agent_end 类型映射为 sub_agent
    const stepType = step.type === 'agent_child' || step.type === 'agent_end' ? 'sub_agent' : step.type;
    
    // 对于工具调用类型，需要特殊处理
    if (stepType === 'tool_call') {
      // 获取选中的具体工具
      const selectedTools = checkedKeys.value
        .filter(key => key.startsWith('tool:'))
        .map(key => key.substring(5)); // 移除 'tool:' 前缀
      
      // 如果选中了具体的工具，需要进一步过滤
      if (selectedTools.length > 0) {
        // 调试：打印日志
        dlog('过滤工具调用:', {
          stepToolName: step.tool_name,
          selectedTools,
          match: selectedTools.includes(step.tool_name || '')
        });
        return selectedTools.includes(step.tool_name || '');
      }
      
      // 如果没有选中具体工具，检查是否选中了工具调用父节点
      return checkedKeys.value.includes('tool_call');
    }
    
    // 对于其他类型，检查是否被选中
    return checkedKeys.value.includes(stepType);
  });
});

// 全选步骤类型
const selectAllStepTypes = () => {
  const allKeys = availableStepTypes.map(t => t.value);
  // 添加工具名称子节点
  const toolKeys = availableToolNames.value.map(name => `tool:${name}`);
  checkedKeys.value = [...allKeys, ...toolKeys];
};

// 清空步骤类型
const clearAllStepTypes = () => {
  checkedKeys.value = [];
};

// 监听checkedKeys变化，同步到selectedStepTypes（用于显示过滤数量）
watch(checkedKeys, (keys) => {
  selectedStepTypes.value = keys.filter(key => !key.startsWith('tool:'));
}, { immediate: true });
watch(
  currentFileId,
  (newFileId) => {
    dlog("🔍 调试测试: currentFileId变化", {
      newFileId,
      oldSelectedFileId: selectedFileId.value,
    });
    selectedFileId.value = newFileId;
  },
  { immediate: true }
);

// 事件处理
const handleFileChange = (fileId: string) => {
  dlog("🔍 调试测试: 文件切换", {
    fileId,
    currentFileId: currentFileId.value,
  });
  selectedFileId.value = fileId;
  if (fileId !== currentFileId.value) {
    timelineStore.loadFile(fileId);
  }
};

const handleRefresh = () => {
  dlog("🔄 调试测试: 刷新操作");
  timelineStore.refreshFiles();
};

const selectStep = (step: ConversationStep) => {
  timelineStore.selectStep(step);

  // 滚动到对应的时间线节点
  scrollToTimelineNode(step.id);
};

// 滚动到时间线节点
const scrollToTimelineNode = (stepId: string) => {
  // 使用nextTick确保DOM更新完成
  setTimeout(() => {
    const timelineNode = document.querySelector(`[data-step-id="${stepId}"]`);
    if (timelineNode) {
      timelineNode.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, 100);
};

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatDateTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// 获取当前文件的显示名称
const getCurrentFileDisplayName = (): string => {
  if (!selectedFileId.value) return '';
  
  // 首先在 availableFiles 中查找
  let file = availableFiles.value.find(f => f.id === selectedFileId.value);
  
  // 如果没找到，在所有主日志的 agentLogs 中查找
  if (!file) {
    for (const mainLog of mainLogs.value) {
      const agentFile = mainLog.agentLogs?.find(f => f.id === selectedFileId.value);
      if (agentFile) {
        file = agentFile;
        break;
      }
    }
  }
  
  // 如果找到了文件，使用 getFileDisplayName 获取显示名称
  if (file) {
    return getFileDisplayName(file);
  }
  
  // 如果还是没找到，返回文件ID（去掉扩展名）
  const name = selectedFileId.value;
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex > -1 ? name.substring(0, lastDotIndex) : name;
};

// 获取文件显示名称（子agent显示名称，主日志显示文件名）
const getFileDisplayName = (file: LogFileInfo | any): string => {
  // 如果文件有 agentName 属性（子agent日志），显示 agentName
  if (file.agentName) {
    return file.agentName;
  }
  // 否则显示文件名（去掉扩展名）
  const name = file.name;
  const lastDotIndex = name.lastIndexOf('.');
  return lastDotIndex > -1 ? name.substring(0, lastDotIndex) : name;
};

// 获取文件的步骤数量
const getFileStepCount = (file: LogFileInfo | any): number => {
  // 优先使用后端返回的stepCount字段
  if (file.stepCount !== undefined) {
    return file.stepCount;
  }
  
  // 如果没有stepCount，从 conversations 中查找对应的对话数据（兼容旧逻辑）
  const conversation = conversations.value.find(c => c.id === file.id);
  if (conversation?.steps) {
    // 过滤掉 tool_result 类型，只计算有效步骤
    return conversation.steps.filter((s) => s.type !== "tool_result").length;
  }
  return 0;
};

// 显示主日志选择对话框
const showMainLogDialog = async () => {
  // 加载主日志列表
  await timelineStore.fetchMainLogs();
  mainLogDialogVisible.value = true;
};

// 处理主日志选择
const handleMainLogSelect = async (mainLog: MainLogSummary) => {
  dlog("📋 选择主日志:", mainLog);
  await timelineStore.selectMainLog(mainLog);
};

// 显示项目选择对话框
const showProjectDialog = async () => {
  projectsLoading.value = true;
  try {
    // 调用API获取可用项目列表
    availableProjects.value = await timelineStore.fetchAvailableProjects();
  } catch (error) {
    console.error("获取项目列表失败:", error);
  } finally {
    projectsLoading.value = false;
  }
  projectDialogVisible.value = true;
};

// 处理项目选择
const handleProjectSelect = async (projectPath: string) => {
  dlog("📁 选择项目:", projectPath);
  try {
    await timelineStore.switchProject(projectPath);
    projectDialogVisible.value = false;
  } catch (error) {
    console.error("切换项目失败:", error);
  }
};

// 组件挂载时检查URL参数
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionid');
  if (sessionId) {
    currentSessionId.value = sessionId;
  }
});
</script>

<style scoped>
.file-selector {
  background: #f5f5f5;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}
.custom-select-popup .arco-select-option-content {
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
}

.project-info {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  background: white;
  flex-shrink: 0;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-weight: 500;
  color: #666;
  margin-right: 8px;
}

.value {
  color: #333;
}

.file-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin: 0;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid #e8e8e8;
  background: white;
}

.file-selector-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.file-select {
  width: 100%;
}

/* 增加下拉面板宽度 */
.file-select :deep(.arco-select-popup) {
  min-width: 800px !important;
  width: auto !important;
}

.file-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.file-name {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.step-count {
  font-size: 12px;
  color: #999;
  font-weight: normal;
  margin-left: 4px;
}

.no-files {
  text-align: center;
  padding: 20px;
}

.file-hint {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.conversation-stats {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stats-item:last-child {
  margin-bottom: 0;
}

.stats-label {
  font-size: 12px;
  color: #666;
}

.stats-value {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.conversation-info {
  margin-top: 16px;
}

.conversation-detail {
  margin-bottom: 16px;
}

.detail-header {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item .label {
  color: #666;
  font-weight: normal;
}

.detail-item .value {
  color: #333;
  font-weight: 500;
}

.connection-status {
  font-size: 12px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  margin: 16px 0;
}

.detail-card {
  margin-bottom: 16px;
}

.steps-overview-card {
  margin-top: 16px;
}

.steps-chart {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.step-bar {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--color-border-2);
}

.step-bar:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.step-bar.selected {
  border-width: 2px;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  transform: scale(1.1);
}

.step-index {
  font-size: 10px;
  font-weight: 500;
}

/* 过滤器样式 */
.step-type-filter {
  width: 200px;
  padding: 0px;
}

.filter-header {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
  font-size: 13px;
}

.tree-node-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tree-node-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
  display: inline-block;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.filter-stats {
  margin-top: 8px;
  font-size: 11px;
  color: #666;
  text-align: center;
}

.session-filter {
  background-color: #e6f7ff;
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 12px;
}
</style>
