<template>
  <a-modal
    v-model:visible="dialogVisible"
    title="选择会话日志"
    width="1020px"
    :mask-closable="false"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="main-log-dialog">
      <a-table
        :columns="columns"
        :data="props.mainLogs"
        :loading="props.loading"
        :pagination="false"
        :scroll="{ y: 400 }"
        row-key="id"
        :row-selection="rowSelection"
        v-model:selected-keys="selectedKeys"
      >
        <template #fileName="{ record }">
          <div class="file-name-cell">
            <span class="file-id">{{ record.id }}</span>
          </div>
        </template>

        <template #startTime="{ record }">
          <span>{{ formatTime(record.startTime) }}</span>
        </template>

        <template #endTime="{ record }">
          <span>{{ formatTime(record.endTime) }}</span>
        </template>

        <template #inputPreview="{ record }">
          <a-tooltip :content="record.inputFull" position="top">
            <span class="preview-text">{{ record.inputPreview }}</span>
          </a-tooltip>
        </template>

        <template #agentCount="{ record }">
          <a-tag color="blue">{{ record.agentLogs.length }}</a-tag>
        </template>
      </a-table>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MainLogSummary } from '../types/index'

interface Props {
  visible: boolean
  mainLogs: MainLogSummary[]
  loading: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'select', mainLog: MainLogSummary): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  mainLogs: () => [],
  loading: false
})

const emit = defineEmits<Emits>()

// 内部可见性状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 选中的行
const selectedRow = ref<MainLogSummary | null>(null)
const selectedKeys = ref<string[]>([])

// 表格列定义
const columns = [
  {
    title: '文件名',
    dataIndex: 'name',
    slotName: 'fileName',
    width: 240,
    ellipsis: true
  },
  {
    title: '开始时间',
    dataIndex: 'startTime',
    slotName: 'startTime',
    width: 200
  },
  {
    title: '结束时间',
    dataIndex: 'endTime',
    slotName: 'endTime',
    width: 200
  },
  {
    title: '输入消息',
    dataIndex: 'inputPreview',
    slotName: 'inputPreview',
    ellipsis: true
  },
  {
    title: '子Agent数',
    dataIndex: 'agentCount',
    slotName: 'agentCount',
    width: 120,
    align: 'center' as const
  }
]

// 行选择配置
const rowSelection = {
  type: 'radio' as const
}

// 监听选择变化
watch(selectedKeys, (newKeys) => {
  if (newKeys.length > 0) {
    const record = props.mainLogs.find(log => log.id === newKeys[0])
    if (record) {
      selectedRow.value = record
    }
  }
})

// 格式化时间
const formatTime = (isoString: string): string => {
  if (!isoString) return ''

  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

// 确认选择
const handleConfirm = () => {
  if (selectedRow.value) {
    emit('select', selectedRow.value)
    dialogVisible.value = false
    resetSelection()
  }
}

// 取消
const handleCancel = () => {
  dialogVisible.value = false
  resetSelection()
}

// 重置选择
const resetSelection = () => {
  selectedRow.value = null
  selectedKeys.value = []
}

// 监听对话框可见性变化，重置选择
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    resetSelection()
  }
})
</script>

<style scoped>
.main-log-dialog {
  width: 100%;
}

.file-name-cell {
  display: flex;
  flex-direction: column;
}

.file-id {
  font-size: 12px;
  color: #4e5969;
  font-family: monospace;
}

.preview-text {
  cursor: help;
  color: #1d2129;
}

:deep(.arco-table-th) {
  background-color: #f7f8fa;
  font-weight: 600;
}

:deep(.arco-table-tr) {
  cursor: pointer;
}

:deep(.arco-table-tr:hover) {
  background-color: #f2f3f5;
}

:deep(.arco-table-tr-checked) {
  background-color: #e8f3ff;
}
</style>
