# CCDebug - Claude Code 调试工具


CCDebug 是一个针对 Claude Code的简单调试工具，能够记录、分析和可视化您与 Claude API 的所有交互过程。通过拦截 HTTP 请求，CCDebug 提供了详细的对话时间线、工具调用追踪和多种数据展示视图。本项目基于https://github.com/badlogic/lemmy/tree/main/apps/claude-trace二次开发。

## ✨ 主要功能

### 🔍 实时交互记录
- **HTTP 拦截**: 自动拦截并记录所有 Claude API 请求和响应
- **流式数据支持**: 完整支持 Claude API 的流式响应（SSE）和 AWS Bedrock 格式
- **敏感信息保护**: 自动脱敏处理 API 密钥等敏感信息

### 📊 多维度数据展示
- **对话时间线**: 直观展示完整的对话流程和工具调用链
- **原始数据视图**: 查看完整的 HTTP 请求/响应详情
- **JSON 结构化视图**: 以结构化格式展示处理后的数据
- **Web 界面**: 现代化的 Vue.js Web 界面，支持实时更新

### 🛠️ 工具调用分析
- **工具使用追踪**: 详细记录每个工具的调用过程和结果
- **参数分析**: 展示工具调用的输入参数和输出结果
- **执行时间统计**: 分析工具执行的性能表现

### 📈 项目管理
- **多项目支持**: 同时管理多个项目的调试日志
- **文件监控**: 实时监控日志文件变化，自动更新界面
- **历史记录**: 保存和查看历史对话记录

## 🚀 快速开始

### 安装

```bash
# 全局安装
npm install -g @myskyline_ai/ccdebug

# 或者在项目中安装
npm install @myskyline_ai/ccdebug
```

### 基本使用

#### 1. 启动 Claude 并记录交互

```bash
# 基本用法 - 启动 Claude 并自动记录
ccdebug

# 使用自定义日志文件名
ccdebug --log my-session

# 传递参数给 Claude
ccdebug --run-with chat --model sonnet-3.5
```

#### 2. 启动 Web 时间线界面

```bash
# 启动 Web 服务器查看时间线
ccdebug --serve --port 3001 --project /path/to/your/project

# 包含所有请求（不仅仅是对话）
ccdebug --serve --port 3001 --project /path/to/your/project --include-all-requests
```

#### 3. 生成 HTML 报告

```bash
# 从 JSONL 文件生成 HTML 报告
ccdebug --generate-html conversation.jsonl report.html

# 生成后自动在浏览器中打开
ccdebug --generate-html conversation.jsonl --no-open
```

#### 4. 提取 OAuth Token

```bash
# 提取 Claude 的 OAuth token 用于 SDK
ccdebug --extract-token
```

## 📋 命令行选项

| 选项 | 描述 |
|------|------|
| `--extract-token` | 提取 OAuth token 并退出 |
| `--generate-html` | 从 JSONL 文件生成 HTML 报告 |
| `--index` | 为 .ccdebug/ 目录生成对话摘要和索引 |
| `--serve` | 启动 Web 时间线服务器 |
| `--port <number>` | 指定 Web 服务器端口（默认 3001） |
| `--project <path>` | 指定项目目录路径 |
| `--run-with <args>` | 将后续参数传递给 Claude 进程 |
| `--include-all-requests` | 包含所有 fetch 请求，而不仅仅是对话 |
| `--no-open` | 不在浏览器中自动打开生成的 HTML |
| `--log <name>` | 指定自定义日志文件基础名称 |
| `--claude-path <path>` | 指定 Claude 二进制文件的自定义路径 |
| `--help, -h` | 显示帮助信息 |

## 🏗️ 技术架构

### 核心组件

- **HTTP 拦截器**: 基于 Node.js 的 HTTP/HTTPS 模块拦截机制
- **数据处理管道**: 将原始 HTTP 数据转换为结构化的对话数据
- **Web 服务器**: Express.js + Socket.IO 实现实时数据推送
- **前端界面**: Vue.js + Arco Design 构建的现代化 Web 界面

### 数据流程

```
HTTP 请求/响应 → 拦截器 → 原始数据(JSONL) → 数据处理器 → 结构化数据 → Web 界面展示
```

## 📁 项目结构

```
ccdebug/
├── src/                    # CLI 工具源码
│   ├── cli.ts             # 命令行入口
│   ├── interceptor.ts     # HTTP 拦截器
│   ├── html-generator.ts  # HTML 报告生成器
│   └── types.ts           # 类型定义
├── web/                   # Web 界面
│   ├── src/               # Vue.js 前端源码
│   └── server/            # Express.js 后端服务
├── frontend/              # 独立 HTML 报告前端
└── docs/                  # 项目文档
```

## 🔧 开发

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn

### 本地开发

```bash
# 克隆项目
git clone https://github.com/ThinkingBeing/ccdebug.git
cd ccdebug

# 安装依赖
npm install

# 构建项目
npm run build

# 开发模式
npm run dev
```

### 构建 Web 界面

```bash
# 构建前端
npm run build:frontend

# 开发前端
npm run dev:frontend
```

## 📝 使用示例

### 针对cc目录启动跟踪
ccdebug --project /path/to/project

### 针对cc工作目录启动web界面查看时间线
ccdebug --serve --project /path/to/project --port 3002
```


## 🔗 相关链接

- [GitHub 仓库](https://github.com/ThinkingBeing/ccdebug)
- [NPM 包](https://www.npmjs.com/package/@myskyline_ai/ccdebug)
