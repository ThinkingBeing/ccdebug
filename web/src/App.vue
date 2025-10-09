<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
// App.vue 现在只作为路由容器
</script>

<style>
/* 全局样式 */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100vh;
  overflow: hidden;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-fill-1);
}

::-webkit-scrollbar-thumb {
  background: var(--color-fill-3);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-fill-4);
}
</style>