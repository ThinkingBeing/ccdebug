# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用开发命令

### 构建和运行
```bash
# 完整构建项目
npm run build

# 开发模式 - 启动所有开发服务
npm run dev

# 类型检查
npm run typecheck

# 清理构建文件
npm run clean

# 构建前端
npm run build:frontend

# 构建并生成包
npm run package
```

### 测试和调试
```bash
# 基本测试
npm test

# 生成测试HTML报告
npm run test:generate

# 启动CCDebug记录CC交互
npx tsx src/cli.ts

# 启动Web服务查看时间线
npx tsx src/cli.ts --serve --port 3001 --project ./ccdemo

# 完整启动（记录所有请求）
npx tsx src/cli.ts --serve --port 3001 --project ./ccdemo --include-all-requests
```

### 前端开发
```bash
# 在frontend目录中：
cd frontend

# 构建CSS和JS
npm run build

# 开发模式（自动重建和服务器）
npm run dev

# 仅构建并生成HTML
npm run rebuild
```

## 目录结构

```
ccdebug/
├── src/                          # 核心源代码目录
│   ├── cli.ts                    # CLI入口和命令行参数处理
│   ├── interceptor.ts            # HTTP拦截器核心逻辑
│   ├── interceptor-loader.js     # 拦截器加载脚本
│   ├── shared-conversation-processor.ts  # 对话数据处理引擎
│   ├── html-generator.ts         # 静态HTML报告生成器
│   ├── index-generator.ts        # 索引页面生成器
│   ├── types.ts                  # TypeScript类型定义
│   ├── token-extractor.js        # 令牌提取工具
│   └── index.ts                  # 主入口文件
│
├── frontend/                     # 前端界面（基于Lit.js）
│   ├── src/
│   │   ├── components/           # Web组件
│   │   │   ├── simple-conversation-view.ts  # 对话时间线视图
│   │   │   ├── json-view.ts      # JSON数据查看器
│   │   │   └── raw-pairs-view.ts # 原始HTTP数据视图
│   │   ├── utils/
│   │   │   └── markdown.ts       # Markdown处理工具
│   │   ├── app.ts                # 应用主组件
│   │   └── index.ts              # 前端入口
│   ├── dist/                     # 前端构建输出
│   ├── package.json              # 前端依赖配置
│   ├── tsconfig.json             # 前端TypeScript配置
│   ├── tsup.config.ts            # 构建工具配置
│   ├── tailwind.config.js        # Tailwind CSS配置
│   ├── postcss.config.js         # PostCSS配置
│   └── template.html             # HTML模板
│
├── web/                          # Web服务器和Vue.js前端
│   ├── server/                   # 后端API服务
│   │   ├── conversation-parser.ts # 对话解析服务
│   │   ├── log-file-manager.ts   # 日志文件管理
│   │   ├── web-server.ts         # Web服务器主逻辑
│   │   ├── index.ts              # 服务器入口
│   │   └── src/types/            # 服务器类型定义
│   ├── src/                      # Vue.js前端源码
│   │   ├── router/               # 路由配置
│   │   ├── stores/               # 状态管理
│   │   ├── types/                # 前端类型定义
│   │   ├── utils/                # 工具函数
│   │   └── main.ts               # Vue应用入口
│   ├── dist/                     # Web应用构建输出
│   ├── public/                   # 静态资源
│   ├── package.json              # Web应用依赖
│   ├── vite.config.ts            # Vite构建配置
│   └── tsconfig.json             # Web应用TypeScript配置
│
├── docs/                         # 项目文档
│   ├── img/                      # 文档图片资源
│   ├── claude消息转换.md         # Claude消息转换说明
│   ├── code-structure-and-design.md  # 代码结构设计文档
│   ├── web-timeline-redesign.md  # Web时间线重设计文档
│   ├── 对话时间线设计.md         # 对话时间线设计说明
│   ├── 待办清单.md               # 开发待办事项
│   └── 基于日志调试cc.md         # 基于日志调试指南
│
├── scripts/                      # 构建和部署脚本
│   └── package.js                # 打包脚本
│
├── ccdemo/                       # 演示项目目录
│   ├── .claude-trace/                 # 演示数据存储
│   ├── .claude/                  # Claude配置
│   ├── docs/                     # 演示文档
│   ├── results/                  # 演示结果
│   ├── CLAUDE.md                 # 演示项目配置
│   └── testcmds.md               # 测试命令
│
├── dist/                         # 主项目构建输出
├── release/                      # 发布包目录
├── .vscode/                      # VS Code配置
├── .trae/                        # Trae规则配置
├── package.json                  # 主项目依赖配置
├── tsconfig.json                 # 主项目TypeScript配置
├── README.md                     # 项目说明文档
├── CLAUDE.md                     # Claude Code工作指南
└── LICENSE                       # 开源协议
```

### 关键目录说明

- **`src/`** - 核心业务逻辑，包含CLI、拦截器、数据处理等核心功能
- **`frontend/`** - 基于Lit.js的轻量级前端，用于生成静态HTML报告
- **`web/`** - 完整的Web应用，包含Vue.js前端和Node.js后端API服务
- **`docs/`** - 项目文档和设计说明
- **`ccdemo/`** - 演示项目，包含示例数据和配置
- **`.claude-trace/`** - 运行时生成的目录，存储拦截的对话数据（JSONL格式）

## 项目架构

### 核心组件结构
- **CLI工具** (`src/cli.ts`) - 命令行入口，处理参数解析和进程管理
- **HTTP拦截器** (`src/interceptor.ts`) - 拦截Claude Code的HTTP请求/响应
- **数据处理器** (`src/shared-conversation-processor.ts`) - 将原始HTTP数据转换为结构化对话数据
- **HTML生成器** (`src/html-generator.ts`) - 生成静态HTML报告
- **类型定义** (`src/types.ts`) - 共享的TypeScript类型定义

### 前端架构
- **前端界面** (`frontend/`) - 基于Lit.js的现代化Web组件，包含：
  - 时间线视图 (`src/components/simple-conversation-view.ts`)
  - JSON数据视图 (`src/components/json-view.ts`)
  - 原始数据视图 (`src/components/raw-pairs-view.ts`)
- **样式** - 使用Tailwind CSS进行样式管理
- **构建** - 使用tsup进行打包，支持开发模式热重载

### 数据流程
```
Claude Code HTTP请求 → 拦截器 → JSONL原始数据 → 数据处理器 → 结构化JSON → 前端组件展示
```

### 构建输出目录
- `.claude-trace/` - 运行时生成，存储拦截的对话数据（JSONL格式）
- `dist/` - 主项目CLI工具构建输出
- `frontend/dist/` - Lit.js前端构建输出
- `web/dist/` - Vue.js Web应用构建输出
- `release/` - 最终发布包目录

## 核心代码逻辑

### HTTP拦截机制 (`src/interceptor.ts`)
- **双重拦截**：同时拦截`global.fetch`和Node.js原生的`http/https`模块
- **Claude API识别**：通过URL模式匹配Anthropic API和AWS Bedrock API调用
- **敏感信息保护**：自动屏蔽Authorization、API Key等敏感头信息
- **请求配对**：使用唯一ID跟踪请求和响应的配对关系
- **流式响应处理**：支持SSE和binary事件流的解析

**关键方法**：
- `instrumentFetch()` - 拦截fetch调用
- `instrumentNodeHTTP()` - 拦截http/https模块
- `isClaudeAPI()` - 判断是否为Claude相关API请求
- `redactSensitiveHeaders()` - 敏感信息脱敏处理

### 数据处理管道 (`src/shared-conversation-processor.ts`)
- **流式响应解析**：将SSE数据重构为完整的Message对象
- **对话分组**：基于system prompt和首条消息对对话进行智能分组
- **工具调用配对**：将tool_use和tool_result进行关联显示
- **多模型支持**：处理不同模型的响应格式差异
- **Bedrock兼容**：特殊处理AWS Bedrock的二进制事件流格式

**关键类**：
- `SharedConversationProcessor` - 核心处理器类
- `processRawPairs()` - 处理原始HTTP数据
- `mergeConversations()` - 对话分组和合并
- `parseStreamingResponse()` - 流式响应解析

### 前端组件系统 (`frontend/src/`)
- **组件化架构**：基于Lit.js的Web Components
- **状态管理**：响应式属性和事件系统
- **内容渲染**：支持Markdown、代码高亮、差异对比
- **交互功能**：展开/折叠、过滤、搜索等

**核心组件**：
- `SimpleConversationView` - 主要的对话时间线视图
- `JsonView` - JSON数据查看器
- `RawPairsView` - 原始HTTP数据查看器

### 数据类型系统 (`src/types.ts`)
- **RawPair** - 原始HTTP请求/响应对
- **ProcessedPair** - 处理后的API调用对
- **SimpleConversation** - 合并后的对话结构
- **BedrockInvocationMetrics** - AWS Bedrock性能指标

## 开发注意事项

### TypeScript配置
- 主项目使用CommonJS模块系统
- 前端使用ES模块
- 严格模式开启，包含完整类型检查

### 数据格式
- 原始数据以JSONL格式存储在`.claude-trace/`目录
- 结构化数据包含消息、工具调用、时间戳等信息
- 支持多种视图模式：时间线、JSON、原始数据

### 前端开发
- 使用Lit.js Web组件框架
- 支持Markdown渲染和语法高亮
- 响应式设计，适配不同屏幕尺寸
- 实时数据更新和过滤功能

## 关键技术实现

### 流式响应重构算法
处理器能够将分块的SSE事件重构为完整的Message对象：
1. 解析`message_start`事件获取基础信息
2. 通过`content_block_start`和`content_block_delta`累积内容
3. 处理`tool_use`块的JSON输入参数拼接
4. 在`content_block_stop`时完成JSON解析
5. 使用`message_delta`更新token使用量

### 对话智能分组
- 基于首条用户消息内容计算哈希值
- 移除时间戳等动态内容进行标准化
- 合并具有相同起始消息的多次API调用
- 检测并合并压缩对话（一次调用包含完整历史）

### 敏感信息脱敏
- 保留Authorization头的前10和后4个字符
- 完全移除API密钥、Session Token等
- 支持自定义敏感字段模式匹配

### Bedrock二进制流解析
- 识别AWS EventStream二进制格式标识符
- 提取JSON载荷并Base64解码
- 解析嵌套的事件结构
- 提取Bedrock特有的性能指标