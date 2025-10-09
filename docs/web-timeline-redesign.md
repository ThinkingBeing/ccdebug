# Claude Code Debug Web 时间线重构设计文档

## 需求分析

基于用户提供的需求和界面设计图，需要对现有的 Claude Code Debug 项目进行重大重构：

### 核心需求
1. **时间线展示**: 将现有的多视图展示改为时间线形式，展示 Claude API 调用的时序关系
2. **独立 Web 服务**: 不再依赖静态 HTML 文件，而是提供独立的 Web 服务器
3. **自动化流程**: 跟踪启动时自动启动 Web 服务，跟踪结束时自动打开浏览器

### UI 设计要求
- 使用 <mcreference link="https://arco.design/vue/component/timeline" index="1">Arco Design Vue Timeline 组件</mcreference>
- 左侧时间线展示对话流程
- 右侧详情面板展示具体内容
- 支持文件选择和切换

## 新架构设计

### 整体架构变更

```
原架构: CLI工具 → 静态HTML文件 → 本地文件查看
新架构: CLI工具 → Web服务器 → 实时数据展示 → 浏览器访问
```

### 技术栈选择

#### 后端 Web 服务
- **框架**: Express.js (Node.js)
- **数据存储**: 文件系统 (JSONL 文件)
- **实时通信**: WebSocket (用于实时数据更新)
- **静态资源**: 服务前端构建产物

#### 前端重构
- **框架**: Vue 3 + TypeScript
- **UI 组件库**: <mcreference link="https://github.com/arco-design/arco-design-vue" index="2">Arco Design Vue</mcreference>
- **状态管理**: Pinia
- **构建工具**: Vite
- **样式**: Arco Design 主题系统

### 项目结构调整

```
ccdebug/
├── src/                           # CLI 工具源码
│   ├── cli.ts                     # 命令行入口 (需修改)
│   ├── web-server.ts              # 新增: Web 服务器
│   ├── interceptor.ts             # HTTP 拦截器 (保持)
│   ├── shared-conversation-processor.ts  # 数据处理 (保持)
│   └── types.ts                   # 类型定义 (扩展)
├── web/                           # 新的 Web 前端目录
│   ├── src/
│   │   ├── main.ts                # Vue 应用入口
│   │   ├── App.vue                # 主应用组件
│   │   ├── components/
│   │   │   ├── TimelineView.vue   # 时间线主视图
│   │   │   ├── DetailPanel.vue    # 详情面板
│   │   │   ├── FileSelector.vue   # 文件选择器
│   │   │   └── MessageItem.vue    # 消息项组件
│   │   ├── stores/
│   │   │   └── conversation.ts    # 对话数据状态管理
│   │   ├── services/
│   │   │   └── api.ts             # API 服务
│   │   └── types/
│   │       └── index.ts           # 前端类型定义
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/                          # 文档目录
└── dist/                          # 编译输出
```

## 详细设计

### 1. Web 服务器设计 (src/web-server.ts)

#### 核心功能
- **静态文件服务**: 服务前端构建产物
- **API 接口**: 提供数据查询接口
- **WebSocket**: 实时数据推送
- **文件监控**: 监控 JSONL 文件变化

#### API 设计
```typescript
// REST API 接口
GET  /api/files                    // 获取当前项目的可用日志文件列表
GET  /api/conversations/:fileId    // 获取指定文件的对话数据
GET  /api/conversations/:fileId/raw // 获取原始数据
GET  /api/project/info             // 获取当前项目信息

// WebSocket 事件
'file:updated'     // 文件更新通知
'conversation:new' // 新对话数据
'project:changed'  // 项目切换通知
```

#### Web 服务启动流程
```typescript
class WebServer {
  constructor(private config: WebServerConfig) {}
  
  async start(): Promise<void> {
    // 1. 解析当前项目的日志目录
    const logFileManager = new LogFileManager();
    const logDir = logFileManager.resolveLogDirectory(this.config.projectDir);
    
    // 2. 获取可用的日志文件
    const availableFiles = await logFileManager.getAvailableLogFiles(logDir);
    const latestFile = await logFileManager.getLatestLogFile(logDir);
    
    // 3. 启动 Express 服务器
    this.setupRoutes(logFileManager, logDir);
    this.server = this.app.listen(this.config.port, this.config.host);
    
    // 4. 启动文件监控
    this.startFileWatcher(logDir);
    
    console.log(`Web server started at http://${this.config.host}:${this.config.port}`);
    console.log(`Monitoring logs in: ${logDir}`);
    
    if (latestFile) {
      console.log(`Latest log file: ${latestFile.filename}`);
    }
  }
  
  private setupRoutes(logFileManager: LogFileManager, logDir: string): void {
    // GET /api/files - 获取可用的日志文件列表
    this.app.get('/api/files', async (req, res) => {
      try {
        const files = await logFileManager.getAvailableLogFiles(logDir);
        const latest = await logFileManager.getLatestLogFile(logDir);
        
        res.json({
          files,
          latest: latest?.id || null,
          projectDir: this.config.projectDir,
          logDir
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // 其他路由...
  }
}

#### 服务器配置
```typescript
interface WebServerConfig {
  port: number;           // 默认 3000
  host: string;          // 默认 localhost
  projectDir: string;    // 当前项目目录路径
  autoOpen: boolean;     // 是否自动打开浏览器
}
```

#### 日志文件路径解析
根据用户需求，日志文件存储在用户主目录的 `.claude/projects` 目录下，需要实现智能的路径解析逻辑：

```typescript
interface LogFileManager {
  // 根据当前项目目录解析对应的日志目录
  resolveLogDirectory(projectPath: string): string;
  
  // 获取指定目录下的所有 JSONL 文件
  getAvailableLogFiles(logDir: string): LogFileInfo[];
  
  // 获取最新的日志文件
  getLatestLogFile(logDir: string): LogFileInfo | null;
}

interface LogFileInfo {
  id: string;           // 文件唯一标识
  filename: string;     // 文件名
  filepath: string;     // 完整文件路径
  createdAt: Date;      // 创建时间
  modifiedAt: Date;     // 修改时间
  size: number;         // 文件大小
}
```

#### 路径解析逻辑
根据实际的 `.claude/projects` 目录结构，项目目录名的生成规律如下：

**规律总结：**
- cc运行目录：`/Users/ligf/Code/claude-code/ccdebug/ccdemo`
- 对应的日志项目目录名：`-Users-ligf-Code-claude-code-ccdebug-ccdemo`
- **转换规则**：将绝对路径中的所有 `/` 替换为 `-`

```typescript
class LogFileManager {
  private getUserHome(): string {
    return os.homedir();
  }
  
  private getClaudeProjectsDir(): string {
    return path.join(this.getUserHome(), '.claude', 'projects');
  }
  
  resolveLogDirectory(projectPath: string): string {
    // 1. 获取项目目录的绝对路径
    const absoluteProjectPath = path.resolve(projectPath);
    
    // 2. 根据实际规律生成项目目录标识
    const projectId = this.generateProjectId(absoluteProjectPath);
    
    // 3. 构建对应的日志目录路径
    const logDir = path.join(this.getClaudeProjectsDir(), projectId);
    
    return logDir;
  }
  
  private generateProjectId(projectPath: string): string {
    // 根据实际规律：将路径中的所有 '/' 替换为 '-'
    // 例如："/Users/ligf/Code/claude-code/ccdebug/ccdemo" -> "-Users-ligf-Code-claude-code-ccdebug-ccdemo"
    return projectPath.replace(/\//g, '-');
  }
  
  async getAvailableLogFiles(logDir: string): Promise<LogFileInfo[]> {
    if (!fs.existsSync(logDir)) {
      console.warn(`日志目录不存在: ${logDir}`);
      return [];
    }
    
    const files = await fs.promises.readdir(logDir);
    const jsonlFiles = files.filter(file => file.endsWith('.jsonl'));
    
    if (jsonlFiles.length === 0) {
      console.warn(`在目录 ${logDir} 中未找到 .jsonl 文件`);
      return [];
    }
    
    const logFiles: LogFileInfo[] = [];
    
    for (const filename of jsonlFiles) {
      const filepath = path.join(logDir, filename);
      const stats = await fs.promises.stat(filepath);
      
      logFiles.push({
        id: filename.replace('.jsonl', ''),
        filename,
        filepath,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        size: stats.size
      });
    }
    
    // 按修改时间降序排序，最新的在前面
    return logFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }
  
  async getLatestLogFile(logDir: string): Promise<LogFileInfo | null> {
    const files = await this.getAvailableLogFiles(logDir);
    return files.length > 0 ? files[0] : null;
  }
}

#### 使用示例
```typescript
// 使用示例
const logManager = new LogFileManager();

// 当前 cc 运行目录
const currentProjectPath = '/Users/ligf/Code/claude-code/ccdebug/ccdemo';

// 解析对应的日志目录
const logDir = logManager.resolveLogDirectory(currentProjectPath);
// 结果: /Users/ligf/.claude/projects/-Users-ligf-Code-claude-code-ccdebug-ccdemo

// 获取可用的日志文件
const availableFiles = await logManager.getAvailableLogFiles(logDir);
const latestFile = await logManager.getLatestLogFile(logDir);

console.log('日志目录:', logDir);
console.log('可用文件:', availableFiles.map(f => f.filename));
console.log('最新文件:', latestFile?.filename);
```

### 2. CLI 工具增强 (src/cli.ts)

#### 新增命令
```bash
# 启动独立 Web 服务
claude-trace serve [options]

# 现有命令增强
claude-trace --run-with <command> [--auto-serve] [--port 3000]
```

#### 自动化流程
1. **跟踪启动时**:
   - 检查 Web 服务是否运行
   - 如未运行，自动启动 Web 服务
   - 开始 HTTP 拦截和数据记录

2. **跟踪结束时**:
   - 停止 HTTP 拦截
   - 通过 WebSocket 通知前端数据更新
   - 自动打开浏览器到日志页面
   - 保持 Web 服务运行

### 3. 前端时间线设计

#### 主界面布局
```vue
<template>
  <div class="app-layout">
    <!-- 顶部工具栏 -->
    <header class="toolbar">
      <file-selector v-model="selectedFile" :files="availableFiles" />
      <div class="actions">
        <a-button @click="refreshData">刷新</a-button>
        <a-button @click="exportData">导出</a-button>
      </div>
    </header>
    
    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧时间线 -->
      <div class="timeline-panel">
        <timeline-view 
          :conversations="conversations"
          :selected-item="selectedItem"
          @select="onSelectItem"
        />
      </div>
      
      <!-- 右侧详情面板 -->
      <div class="detail-panel">
        <detail-panel 
          :item="selectedItem"
          :raw-data="selectedRawData"
        />
      </div>
    </div>
  </div>
</template>
```

#### 时间线组件设计
```vue
<!-- TimelineView.vue -->
<template>
  <a-timeline mode="left" :pending="isLoading">
    <a-timeline-item
      v-for="item in timelineItems"
      :key="item.id"
      :color="getItemColor(item)"
      @click="$emit('select', item)"
    >
      <template #dot>
        <div class="timeline-dot" :class="item.type">
          <component :is="getItemIcon(item)" />
        </div>
      </template>
      
      <template #default>
        <message-item 
          :item="item"
          :is-selected="selectedItem?.id === item.id"
        />
      </template>
    </a-timeline-item>
  </a-timeline>
</template>
```

#### 数据结构设计
```typescript
// 时间线项目类型
interface TimelineItem {
  id: string;
  timestamp: string;
  type: 'user' | 'assistant' | 'thinking' | 'tool_use' | 'tool_result';
  content: string;
  metadata: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
    };
    duration?: number;
  };
  rawData?: any; // 原始数据引用
}

// 对话会话
interface ConversationSession {
  id: string;
  startTime: string;
  endTime: string;
  items: TimelineItem[];
  metadata: {
    totalTokens: number;
    totalDuration: number;
    models: string[];
  };
}
```

### 4. 实时数据更新

#### WebSocket 集成
```typescript
// 前端 WebSocket 服务
class ConversationWebSocket {
  private ws: WebSocket;
  
  connect() {
    this.ws = new WebSocket('ws://localhost:3000');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'file:updated':
          this.handleFileUpdate(data.payload);
          break;
        case 'conversation:new':
          this.handleNewConversation(data.payload);
          break;
      }
    };
  }
  
  private handleFileUpdate(payload: any) {
    // 更新文件列表
    store.updateAvailableFiles(payload.files);
  }
  
  private handleNewConversation(payload: any) {
    // 实时添加新的对话项
    store.addTimelineItem(payload.item);
  }
}
```

### 5. 状态管理设计

#### 前端页面初始化逻辑
```typescript
// store/timeline.ts - Pinia 状态管理
interface TimelineState {
  currentProject: {
    path: string;
    logDir: string;
  } | null;
  availableFiles: LogFileInfo[];
  currentFileId: string | null;
  conversations: ConversationData[];
  loading: boolean;
  error: string | null;
}

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    currentProject: null,
    availableFiles: [],
    currentFileId: null,
    conversations: [],
    loading: false,
    error: null
  }),
  
  actions: {
    // 页面初始化时调用
    async initialize() {
      this.loading = true;
      try {
        // 1. 获取项目信息和可用文件列表
        const response = await fetch('/api/files');
        const data = await response.json();
        
        this.currentProject = {
          path: data.projectDir,
          logDir: data.logDir
        };
        this.availableFiles = data.files;
        
        // 2. 自动选择最新的日志文件
        if (data.latest) {
          await this.loadFile(data.latest);
        } else if (data.files.length > 0) {
          await this.loadFile(data.files[0].id);
        }
        
      } catch (error) {
        this.error = `初始化失败: ${error.message}`;
        console.error('Timeline initialization failed:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async loadFile(fileId: string) {
      this.loading = true;
      try {
        const response = await fetch(`/api/conversations/${fileId}`);
        const data = await response.json();
        
        this.currentFileId = fileId;
        this.conversations = data.conversations;
        this.error = null;
        
      } catch (error) {
        this.error = `加载文件失败: ${error.message}`;
        console.error('Failed to load file:', error);
      } finally {
        this.loading = false;
      }
    }
  }
});
```

#### 文件选择器组件
```vue
<!-- components/FileSelector.vue -->
<template>
  <div class="file-selector">
    <a-select 
      v-model="currentFileId" 
      @change="handleFileChange"
      placeholder="选择日志文件"
      style="width: 300px"
    >
      <a-option 
        v-for="file in availableFiles" 
        :key="file.id" 
        :value="file.id"
      >
        <div class="file-option">
          <span class="filename">{{ file.filename }}</span>
          <span class="file-time">{{ formatTime(file.modifiedAt) }}</span>
        </div>
      </a-option>
    </a-select>
    
    <div v-if="currentProject" class="project-info">
      <a-typography-text type="secondary">
        项目路径: {{ currentProject.path }}
      </a-typography-text>
      <br>
      <a-typography-text type="secondary">
        日志目录: {{ currentProject.logDir }}
      </a-typography-text>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTimelineStore } from '@/store/timeline';

const store = useTimelineStore();

const currentFileId = computed({
  get: () => store.currentFileId,
  set: (value) => store.currentFileId = value
});

const availableFiles = computed(() => store.availableFiles);
const currentProject = computed(() => store.currentProject);

const handleFileChange = (fileId: string) => {
  store.loadFile(fileId);
};

const formatTime = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN');
};
</script>
```

#### 完整的 Pinia Store 设计
```typescript
// stores/timeline.ts - 主要的时间线状态管理
interface TimelineState {
  currentProject: {
    path: string;
    logDir: string;
  } | null;
  availableFiles: LogFileInfo[];
  currentFileId: string | null;
  conversations: ConversationData[];
  currentConversation: string | null;
  selectedStep: string | null;
  loading: boolean;
  error: string | null;
}

export const useTimelineStore = defineStore('timeline', {
  state: (): TimelineState => ({
    currentProject: null,
    availableFiles: [],
    currentFileId: null,
    conversations: [],
    currentConversation: null,
    selectedStep: null,
    loading: false,
    error: null
  }),
  
  getters: {
    currentConversationData: (state) => {
      return state.conversations.find(c => c.id === state.currentConversation);
    },
    
    currentStepData: (state) => {
      const conversation = state.conversations.find(c => c.id === state.currentConversation);
      return conversation?.steps.find(s => s.id === state.selectedStep);
    }
  },
  
  actions: {
    // 页面初始化时调用
    async initialize() {
      this.loading = true;
      try {
        // 1. 获取项目信息和可用文件列表
        const response = await fetch('/api/files');
        const data = await response.json();
        
        this.currentProject = {
          path: data.projectDir,
          logDir: data.logDir
        };
        this.availableFiles = data.files;
        
        // 2. 自动选择最新的日志文件
        if (data.latest) {
          await this.loadFile(data.latest);
        } else if (data.files.length > 0) {
          await this.loadFile(data.files[0].id);
        }
        
      } catch (error) {
        this.error = `初始化失败: ${error.message}`;
        console.error('Timeline initialization failed:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async loadFile(fileId: string) {
      this.loading = true;
      try {
        const response = await fetch(`/api/conversations/${fileId}`);
        const data = await response.json();
        
        this.currentFileId = fileId;
        this.conversations = data.conversations;
        this.error = null;
        
      } catch (error) {
        this.error = `加载文件失败: ${error.message}`;
        console.error('Failed to load file:', error);
      } finally {
        this.loading = false;
      }
    },
    
    selectConversation(conversationId: string) {
      this.currentConversation = conversationId;
      this.selectedStep = null; // 重置选中的步骤
    },
    
    selectStep(stepId: string) {
      this.selectedStep = stepId;
    }
  }
});
```

## 实施计划

### 阶段一: 基础架构搭建
1. 创建 Web 服务器基础框架
2. 设置 Vue 3 + Arco Design 前端项目
3. 实现基本的 API 接口

### 阶段二: 时间线界面开发
1. 实现时间线主视图组件
2. 开发详情面板组件
3. 集成文件选择功能

### 阶段三: 实时功能集成
1. 实现 WebSocket 实时通信
2. 集成文件监控功能
3. 完善自动化流程

### 阶段四: CLI 工具集成
1. 修改 CLI 工具支持 Web 服务
2. 实现自动启动和浏览器打开
3. 完善错误处理和日志

## 兼容性考虑

### 向后兼容
- 保留现有的 HTML 生成功能作为备选方案
- 保持现有的数据格式和处理逻辑
- CLI 命令参数保持兼容

### 渐进式迁移
- 新功能作为可选特性提供
- 用户可以选择使用新的 Web 界面或传统 HTML 文件
- 提供迁移指南和最佳实践

## 性能优化

### 前端优化
- 虚拟滚动处理大量时间线数据
- 懒加载详情内容
- 组件级别的缓存策略

### 后端优化
- 文件读取缓存
- 增量数据更新
- 压缩和分页支持

## 安全考虑

### 数据安全
- 本地服务器，不暴露到公网
- 敏感信息脱敏保持现有机制
- 文件访问权限控制

### 网络安全
- CORS 配置限制
- WebSocket 连接验证
- 静态文件安全服务

## 总结

这个重构设计将 Claude Code Debug 从静态 HTML 查看器升级为现代化的 Web 应用，提供更好的用户体验和实时数据展示能力。通过时间线界面，用户可以更直观地理解 Claude API 的调用流程和数据流转过程。

新架构保持了原有的核心功能，同时提供了更强的扩展性和更好的用户体验。实施计划分阶段进行，确保项目的稳定性和可维护性。