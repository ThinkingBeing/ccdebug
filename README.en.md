
# CCDebug - Claude Code Debugging Tool

CCDebug is a debugging tool for Claude Code. It records and visualizes Claude Code execution traces, and also supports “edit & replay” for a single LLM request to help you quickly pinpoint deviations caused by prompts/context/tool calls. (This project is a derivative work based on [lemmy/claude-trace](https://github.com/badlogic/lemmy/tree/main/apps/claude-trace).)

[>>中文 README](./README.md)

## ✨ Key Features

### **1. Timeline trace view**
- **Show by Claude Code execution steps**: distinguish different log types such as user input, LLM replies, and tool calls
- **Step details supported**: quickly inspect the raw Claude Code log content for any step
  
![Timeline trace for Claude Code](./docs/img/1、日志以时间线形式展示.png)

### **2. Quick log switching**
- **One-click jump to SubAgent logs**: jump to sub-agent logs to inspect the sub-agent execution trace
- **Quickly switch projects and sessions**: switch between different projects and sessions under `~/.claude/projects` without running the tool multiple times

![Quickly switch projects and sessions](./docs/img/2、快速切换项目和会话.gif)

### **3. Fast search & pinpointing**
- **Global keyword search**: quickly locate logs containing a given keyword (searches all log files under the current session)
- **Step overview filtering**: the overview shows the whole execution; filter timeline nodes by type
- **Generate share links**: generate a share link for the current session for collaborative analysis

![Fast search & pinpointing](./docs/img/3、快速搜索定位.gif)

### **4. Quick latency analysis**
- **Show step start time**: each log node displays the start time of the step
- **Show tool-call duration**: for tool calls and SubAgent steps, nodes display the duration
- **Measure time between steps**: mark two step nodes to automatically calculate and display the elapsed time between them

![Quick latency analysis](./docs/img/4、快速分析耗时.gif)

### **5. Step-level debugging for Claude Code**
> Note: the debugging feature only supports Claude Code installed via the NPM script form, and does not support the native binary version.

![Step-level debugging for Claude Code](./docs/img/LLM请求调试.png)
- **Track LLM requests**: record all Claude Code request logs to the LLM in detail
- **Resend LLM requests**: edit the LLM request payload and resend it, making it easy to repeatedly validate whether the response meets expectations

## 🚀 Quick Start

### Install

```bash
# Recommended: install globally from npm
npm install -g @myskyline_ai/ccdebug

# Or: install a local/released tgz artifact
# npm install -g /path/to/@myskyline_ai-ccdebug-x.y.z.tgz
```

### Basic usage

#### 1. Launch Claude and record interactions

```bash
# Basic usage - start Claude and record automatically
ccdebug

# Include all requests (not only conversations)
ccdebug --include-all-requests

# Pass subsequent args to the Claude process (example)
ccdebug --run-with -p "Please work as requested" --verbose
```

#### 2. Start the Web site to view the timeline trace

```bash
# Start the Web server for the timeline (default port: 3001; default project dir: current directory)
ccdebug -l

# Start on a custom port
ccdebug -l --port 3001

# Start with a specified project directory
ccdebug -l --project /path/to/your/cc_workdir
```

### Log output directories

- **Claude Code standard logs (for timeline)**: `.claude-trace/cclog/*.jsonl` (includes main logs and `agent-*.jsonl` sub-agent logs)
- **Claude Code API tracing logs (for LLM request debugging)**: `.claude-trace/tracelog/*.jsonl`
- **Saved LLM requests (for override/replay)**: `.claude-trace/tracelog/llm_requests/*.json`

Notes:

- After you run `ccdebug` to start a Claude session, CCDebug automatically copies the corresponding Claude Code standard logs into `.claude-trace/cclog/`, and renames the API tracing log to `{sessionId}.jsonl`.
- If you are using the **native Claude Code binary version** (not the NPM script form), CCDebug cannot intercept API requests, and LLM request debugging will be unavailable (you can still view existing Claude Code standard logs via the Web site).

## 📋 CLI Options

| Option | Description |
|------|------|
| `--log, -l` | Start the Web timeline server (when `--log` is used without a value, it is equivalent to `--serve`; prefer `-l` to avoid confusion with `--log <name>`) |
| `--port <number>` | Web server port (default: 3001) |
| `--project <path>` | Project directory path |
| `--run-with <args>` | Pass subsequent args to the Claude process |
| `--include-all-requests` | Include all fetch requests, not only conversations |
| `--claude-path <path>` | Custom path to the Claude binary |
| `--index` | Generate conversation summaries and an index for the `.claude-trace/` directory (will call Claude and incur extra token usage) |
| `--version, -v` | Show version information |
| `--help, -h` | Show help |

## 🏗️ Architecture

### Core components

- **HTTP/API interceptor**: based on Node.js HTTP/HTTPS + fetch interception, recording requests and responses to Anthropic/Bedrock
- **Claude Code standard log consolidation**: on session exit, automatically copies Claude Code standard logs (main and sub-agent logs) into `.claude-trace/cclog/`
- **Web server**: Express.js provides APIs for file listing, session management, project switching, and LLM request read/save/replay
- **Frontend UI**: Vue 3 + Vite + Pinia + Arco Design

### Data flow

```
HTTP request/response → interceptor → raw data (JSONL) → data processor → structured data → Web UI
```

## 📁 Project Structure

```
ccdebug/
├── src/                     # CLI and interceptors
│   ├── cli.ts              # CLI entry
│   ├── interceptor.ts      # API interception and tracelog recording
│   ├── html-generator.ts   # HTML report generator (based on frontend)
│   └── index-generator.ts  # conversation summaries and index generation
├── web/                     # Web timeline site (Vite + Vue 3)
│   ├── src/                # frontend source
│   ├── dist/               # build output
│   └── server/             # Express backend (started by the CLI via require)
├── frontend/                # standalone HTML report frontend (bundle injected into HTML)
├── scripts/                 # packaging scripts
└── docs/                    # documentation and design notes
```

## 🔧 Development

### Requirements

- Node.js >= 16.0.0
- npm or yarn

### Local development

```bash
# Clone the repo
git clone https://github.com/ThinkingBeing/ccdebug.git
cd ccdebug

# Install dependencies
npm install

# Build
npm run build

# Development mode (watch core code + frontend)
npm run dev

# Run the CLI via tsx (for development debugging)
npx tsx src/cli.ts --help
npx tsx src/cli.ts -l --port 3001 --project /path/to/your/cc_workdir

# Package after validation (artifacts will be under release/)
npm run package
```

## 🔗 Links

- [GitHub repository](https://github.com/ThinkingBeing/ccdebug)
