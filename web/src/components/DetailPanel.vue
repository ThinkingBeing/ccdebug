<template>
  <div class="detail-panel">
    <div class="detail-content">
      <a-tabs default-active-key="search" class="detail-tabs">
        <a-tab-pane key="search" title="全局搜索">
          <SearchPanel />
        </a-tab-pane>
        <a-tab-pane key="detail" title="步骤详情">
          <StepDetail />
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import StepDetail from './StepDetail.vue'
import SearchPanel from './SearchPanel.vue'
</script>

<style>
.detail-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-content {
  flex: 1;
  overflow: hidden;
}

.detail-tabs {
  height: 100%;
}

.detail-tabs :deep(.arco-tabs-content) {
  height: calc(100% - 48px);
  padding: 0;
}

.detail-tabs :deep(.arco-tabs-pane) {
  height: 100%;
}
</style>