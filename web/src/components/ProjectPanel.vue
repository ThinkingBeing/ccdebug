<template>
  <div class="file-selector">
    <a-card title="项目信息" :bordered="false" size="small" class="file-card">
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
        <a-button
          type="text"
          size="small"
          @click="handleRefresh"
          :loading="loading"
        >
          <template #icon>
            <icon-refresh />
          </template>
          刷新
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
        >
          <a-option
            v-for="file in availableFiles"
            :key="file.id"
            :value="file.id"
            :label="file.name"
          >
            <div class="file-option">
              <div class="file-name">{{ file.name }}</div>
            </div>
          </a-option>
        </a-select>

        <div v-if="availableFiles.length === 0 && !loading" class="no-files">
          <a-empty description="未找到日志文件" />
        </div>
      </div>
    </a-card>
    <div v-if="currentConversation && selectedFileId">
      <a-card title="对话信息" :bordered="false" size="small" class="file-card">
        <div class="detail-item">
          <span class="label">对话ID:</span>
          <span class="value">{{ currentConversation.id }}</span>
        </div>
        <div class="detail-item">
          <span class="label">开始时间:</span>
          <span class="value">{{
            formatDateTime(currentConversation.timestamp)
          }}</span>
        </div>
        <div class="detail-item">
          <span class="label">步骤数量:</span>
          <span class="value">{{
            currentConversation.steps.filter((s) => s.type !== "tool_result")
              .length
          }}</span>
        </div>
      </a-card>
      <a-card title="步骤概览" :bordered="false" class="file-card" size="small">
        <!-- 节点类型过滤器 -->
        <template #extra>
          <a-popover trigger="click" position="bottom">
            <template #content>
              <div class="step-type-filter">
                <div class="filter-header">选择要显示的节点类型</div>
                <a-checkbox-group v-model="selectedStepTypes" direction="vertical">
                  <a-checkbox 
                    v-for="stepType in availableStepTypes" 
                    :key="stepType.value"
                    :value="stepType.value"
                  >
                    <div class="step-type-option">
                      <div 
                        class="step-type-color" 
                        :style="{ backgroundColor: stepType.color }"
                      ></div>
                      <span>{{ stepType.label }}</span>
                    </div>
                  </a-checkbox>
                </a-checkbox-group>
                <div class="filter-actions">
                  <a-button 
                    size="mini" 
                    @click="selectedStepTypes = availableStepTypes.map(t => t.value)"
                  >
                    全选
                  </a-button>
                  <a-button 
                    size="mini" 
                    @click="selectedStepTypes = []"
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
              过滤 ({{ selectedStepTypes.length }})
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
            <span class="step-index">{{ index + 1 }}</span>
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
import { computed, ref, watch } from "vue";
import { useTimelineStore } from "../stores/timeline";
import { IconRefresh, IconFilter } from "@arco-design/web-vue/es/icon";
import { ConversationStep } from "../types/index";
import { getNodeColor, getNodeLightColor } from "../utils/colors";

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

// 本地状态
const selectedFileId = ref<string | null>(null);

// 节点类型过滤器状态
const availableStepTypes = [
  { value: 'user_message', label: '用户消息', color: '#1890ff' },
  { value: 'assistant_thinking', label: '助手思考', color: '#722ed1' },
  { value: 'assistant_message', label: '助手消息', color: '#52c41a' },
  { value: 'tool_call', label: '工具调用', color: '#fa8c16' },
  { value: 'agent_child', label: '代理子节点', color: '#eb2f96' },
  { value: 'agent_end', label: '代理结束', color: '#f5222d' }
];

// 默认选中所有类型（除了tool_result，保持原有行为）
const selectedStepTypes = ref<string[]>([
  'user_message', 
  'assistant_thinking', 
  'assistant_message', 
  'tool_call', 
  'agent_child', 
  'agent_end'
]);

// 计算过滤后的步骤
const filteredSteps = computed(() => {
  if (!currentConversation.value?.steps) return [];
  
  return currentConversation.value.steps.filter(step => 
    selectedStepTypes.value.includes(step.type)
  );
});

// 监听currentFileId的变化，同步到selectedFileId
watch(
  currentFileId,
  (newFileId) => {
    console.log("🔍 调试测试: currentFileId变化", {
      newFileId,
      oldSelectedFileId: selectedFileId.value,
    });
    selectedFileId.value = newFileId;
  },
  { immediate: true }
);

// 事件处理
const handleFileChange = (fileId: string) => {
  console.log("🔍 调试测试: 文件切换", {
    fileId,
    currentFileId: currentFileId.value,
  });
  selectedFileId.value = fileId;
  if (fileId !== currentFileId.value) {
    timelineStore.loadFile(fileId);
  }
};

const handleRefresh = () => {
  console.log("🔄 调试测试: 刷新操作");
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
</script>

<style scoped>
.file-selector {
  background: #f5f5f5;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
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

.file-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-name {
  font-weight: 500;
}

.no-files {
  text-align: center;
  padding: 20px;
}

.file-hint {
  margin-top: 12px;
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
  padding: 12px;
}

.filter-header {
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
  font-size: 13px;
}

.step-type-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-type-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.filter-stats {
  margin-top: 8px;
  font-size: 11px;
  color: #666;
  text-align: center;
}
</style>
