<template>
  <a-modal
    v-model:visible="dialogVisible"
    title="选择项目"
    width="1200px"
    :mask-closable="false"
    @ok="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="project-select-dialog">
      <!-- 搜索框 -->
      <div class="search-container">
        <a-input-search
          v-model="searchKeyword"
          placeholder="请输入项目名称进行搜索"
          allow-clear
          @clear="handleSearchClear"
          @search="handleSearch"
          style="margin-bottom: 16px"
        />
      </div>

      <a-alert v-if="!props.loading && filteredProjects.length === 0" type="warning" style="margin-bottom: 16px">
        {{ searchKeyword ? '未找到匹配的项目' : '未找到可用项目' }}。请确认用户主目录下存在 <code>~/.claude/projects</code> 目录。
      </a-alert>

      <a-table
        :columns="columns"
        :data="filteredProjects"
        :loading="props.loading"
        :pagination="false"
        :scroll="{ y: 500 }"
        row-key="path"
        :row-selection="rowSelection"
        v-model:selected-keys="selectedKeys"
        @row-click="handleRowClick"
      >
        <template #projectName="{ record }">
          <div class="project-name-cell">
            <span class="project-name">{{ record.name }}</span>
            <a-tag v-if="record.isDefault" color="blue" size="small" style="margin-left: 8px">
              当前项目
            </a-tag>
          </div>
        </template>

        <template #projectPath="{ record }">
          <span class="path-text">{{ record.path }}</span>
        </template>
      </a-table>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { AvailableProjectInfo } from '../types/index'

interface Props {
  visible: boolean
  projects: AvailableProjectInfo[]
  currentProject?: string
  loading: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'select', projectPath: string): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  projects: () => [],
  loading: false
})

const emit = defineEmits<Emits>()

// 搜索关键词
const searchKeyword = ref('')

// 过滤后的项目列表
const filteredProjects = computed(() => {
  if (!searchKeyword.value.trim()) {
    return props.projects
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return props.projects.filter(project => 
    project.name.toLowerCase().includes(keyword) ||
    project.path.toLowerCase().includes(keyword)
  )
})

// 内部可见性状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 选中的行
const selectedRow = ref<AvailableProjectInfo | null>(null)
const selectedKeys = ref<string[]>([])

// 表格列定义
const columns = [
  {
    title: '项目名称',
    dataIndex: 'name',
    slotName: 'projectName',
    width: 300
  },
  {
    title: '项目路径',
    dataIndex: 'path',
    slotName: 'projectPath'
  }
]

// 行选择配置
const rowSelection = {
  type: 'radio' as const
}

// 监听选择变化
watch(selectedKeys, (newKeys) => {
  if (newKeys.length > 0) {
    const record = filteredProjects.value.find(project => project.path === newKeys[0])
    if (record) {
      selectedRow.value = record
    }
  }
})

// 处理搜索
const handleSearch = (value: string) => {
  searchKeyword.value = value
}

// 清空搜索
const handleSearchClear = () => {
  searchKeyword.value = ''
}

// 处理行点击事件
const handleRowClick = (record: AvailableProjectInfo) => {
  selectedKeys.value = [record.path]
  selectedRow.value = record
}

// 确认选择
const handleConfirm = () => {
  if (selectedRow.value) {
    emit('select', selectedRow.value.path)
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

// 监听对话框可见性变化，设置默认选中当前项目
watch(dialogVisible, (newVal) => {
  if (newVal && props.currentProject) {
    // 自动选中当前项目
    const currentProject = filteredProjects.value.find(p => p.path === props.currentProject)
    if (currentProject) {
      selectedKeys.value = [currentProject.path]
      selectedRow.value = currentProject
    }
  } else if (!newVal) {
    resetSelection()
    // 关闭对话框时清空搜索
    searchKeyword.value = ''
  }
})
</script>

<style scoped>
.project-select-dialog {
  width: 100%;
}

.search-container {
  margin-bottom: 16px;
}

.project-name-cell {
  display: flex;
  align-items: center;
}

.project-name {
  font-weight: 500;
  color: #1d2129;
}

.path-text {
  color: #4e5969;
  font-size: 12px;
  font-family: monospace;
  word-break: break-all;
  white-space: normal;
  line-height: 1.6;
  display: block;
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

:deep(.arco-table-td) {
  padding: 12px 16px !important;
}

:deep(code) {
  background-color: #f2f3f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
