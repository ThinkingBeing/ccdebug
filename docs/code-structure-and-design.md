# Claude Code Debug 项目架构文档

## 项目概述

Claude Code Debug (ccdebug) 是一个用于调试和分析 Claude API 交互的工具，包含 CLI 工具和 Web 前端界面。该项目通过拦截 HTTP 请求来记录 Claude API 的调用过程，并提供多种方式来查看和分析这些数据。

## 整体架构设计

### 核心设计思路

1. **HTTP 拦截机制**: 通过 Node.js 的 HTTP 拦截器来捕获 Claude API 的请求和响应
2. **数据处理管道**: 将原始的 HTTP 数据转换为结构化的对话数据
3. **多视图展示**: 提供原始数据视图、对话视图和 JSON 视图等多种展示方式
4. **流式数据处理**: 支持 Claude API 的流式响应（SSE）和 Bedrock 格式
5. **前后端分离**: CLI 工具负责数据收集和处理，Web 前端负责数据展示

### 项目结构

```
ccdebug/
├── src/                    # CLI 工具源码
├── frontend/src/           # Web 前端源码
├── docs/                   # 文档目录
└── dist/                   # 编译输出目录
```

## CLI 工具架构 (src/)

### 核心文件结构

#### 1. cli.ts - 命令行入口
- **功能**: 定义 `claude-trace` 命令的主要功能和选项
- **主要模式**:
  - 交互式日志记录 (`--run-with`)
  - Token 提取 (`--extract-token`)
  - HTML 报告生成 (`--generate-html`)
  - 索引生成 (`--index`)
- **关键设计**: 通过子进程启动 Claude 并注入拦截器

#### 2. interceptor.ts - HTTP 拦截器
- **核心类**: `ClaudeTrafficLogger`
- **功能**:
  - 拦截所有 HTTP 请求和响应
  - 识别 Claude API 调用
  - 记录请求/响应数据到 JSONL 文件
  - 处理敏感信息脱敏
- **关键设计**: 使用 Node.js 的 `http` 和 `https` 模块的拦截机制

#### 3. shared-conversation-processor.ts - 数据处理核心
- **核心类**: `SharedConversationProcessor`
- **主要功能**:
  - 将原始 HTTP 数据转换为 `ProcessedPair`
  - 解析流式响应（SSE 和 Bedrock 格式）
  - 合并对话片段为完整对话
  - 处理工具调用和结果配对
- **关键设计思路**:
  - 支持多种流式格式的统一处理
  - 智能对话合并算法
  - 工具调用结果的自动配对

#### 4. html-generator.ts - HTML 报告生成
- **核心类**: `HTMLGenerator`
- **功能**:
  - 加载前端模板和资源
  - 将处理后的数据注入到 HTML 模板
  - 生成独立的 HTML 报告文件
- **关键设计**: 将前端代码打包到单个 HTML 文件中

#### 5. types.ts - 类型定义
- **核心接口**:
  - `RawPair`: 原始 HTTP 请求/响应对
  - `ProcessedPair`: 处理后的结构化数据
  - `SimpleConversation`: 完整对话结构
  - `ClaudeData`: 前端数据格式

## Web 前端架构 (frontend/src/)

### 技术栈
- **框架**: Lit Element (轻量级 Web Components)
- **样式**: Tailwind CSS + VS Code 主题
- **构建**: 自定义构建脚本

### 核心组件结构

#### 1. index.ts - 应用入口
- 初始化 `ClaudeApp` 组件
- 注入 CSS 样式

#### 2. app.ts - 主应用组件
- **核心类**: `ClaudeApp` (LitElement)
- **状态管理**:
  - `rawPairs`: 原始数据
  - `conversations`: 处理后的对话
  - `currentView`: 当前视图模式
  - `selectedModels`: 选中的模型过滤器
- **关键功能**:
  - 数据处理和状态管理
  - 视图切换逻辑
  - 模型过滤功能

#### 3. 组件系统

##### simple-conversation-view.ts - 对话视图
- **功能**: 展示结构化的对话内容
- **特性**:
  - 支持多种内容类型（文本、思考块、工具调用）
  - 可折叠的内容区域
  - Markdown 渲染支持

##### raw-pairs-view.ts - 原始数据视图
- **功能**: 展示原始的 HTTP 请求/响应对
- **特性**:
  - 请求/响应头和体的详细展示
  - JSON 格式化显示
  - 可折叠的内容区域

##### json-view.ts - JSON 视图
- **功能**: 以 JSON 格式展示处理后的数据
- **特性**:
  - 结构化的 JSON 展示
  - 请求/响应分离显示
  - 流式数据标识

#### 4. 工具模块

##### utils/markdown.ts - Markdown 处理
- **功能**: 安全的 Markdown 到 HTML 转换
- **安全特性**: XSS 防护和 HTML 转义

## 关键设计思路

### 1. 数据流设计

```
HTTP 请求/响应 → 拦截器 → 原始数据(JSONL) → 数据处理器 → 结构化数据 → 前端展示
```

### 2. 流式数据处理

- **标准 SSE 格式**: 处理 Claude API 的标准流式响应
- **Bedrock 格式**: 支持 AWS Bedrock 的二进制流式格式
- **统一接口**: 不同格式的流式数据最终转换为统一的 `Message` 格式

### 3. 对话重构算法

- **智能合并**: 基于时间戳和内容相似性合并对话片段
- **工具配对**: 自动匹配工具调用和工具结果
- **紧凑模式检测**: 识别和合并紧凑格式的对话

### 4. 前端组件化设计

- **Web Components**: 使用 Lit Element 构建可复用组件
- **状态管理**: 集中式状态管理，单向数据流
- **视图分离**: 不同的数据视图对应不同的组件

### 5. 安全性考虑

- **敏感信息脱敏**: 自动移除 API 密钥等敏感头信息
- **XSS 防护**: 前端 Markdown 渲染包含 HTML 转义
- **数据隔离**: 本地文件存储，不涉及网络传输

## 扩展性设计

### 1. 插件化拦截器
- 拦截器设计支持扩展到其他 API 服务
- 可配置的过滤规则

### 2. 多格式支持
- 数据处理器支持多种流式格式
- 易于添加新的 API 格式支持

### 3. 组件化前端
- Web Components 架构便于添加新的视图组件
- 统一的数据接口便于扩展功能

## 总结

Claude Code Debug 项目采用了模块化、可扩展的架构设计，通过 HTTP 拦截、数据处理和多视图展示的完整链路，为 Claude API 的调试和分析提供了强大的工具支持。项目的核心优势在于：

1. **非侵入式**: 通过 HTTP 拦截实现，无需修改原有代码
2. **多格式支持**: 统一处理不同的流式响应格式
3. **智能处理**: 自动重构对话结构和工具调用配对
4. **灵活展示**: 提供多种数据视图满足不同需求
5. **安全可靠**: 本地处理，包含敏感信息保护机制

该架构为后续的功能扩展和维护提供了良好的基础。