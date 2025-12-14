# CCDebug - Claude Code Debugging Tool

CCDebug is a debugging tool for Claude Code. It records and visualizes Claude Code execution traces, and also supports “edit & replay” for a single LLM request so you can quickly pinpoint deviations caused by prompts/context/tool calls.

This project is a derivative work based on [lemmy/claude-trace](https://github.com/badlogic/lemmy/tree/main/apps/claude-trace).

## ✨ Key Features

### 📊 Timeline view for Claude Code execution

![Timeline](./docs/img/时间线.png)

- **Conversation timeline**: visualize the full conversation flow and tool call chain.
- **Filter by step type**: filter timeline nodes by type (user message, assistant reply, tool call, etc.).
- **Combined tool call + result**: tool input and its output are shown together for easier inspection.
- **Session selector & sub-agent labels**: choose a main session log; sub-agent logs are shown using agent name/description.
- **Project switching**: switch projects under `~/.claude/projects` in the Web UI to avoid running multiple servers.

### 🛠️ Step-level LLM request debugging

![LLM Request Debug](./docs/img/LLM请求调试.png)

![Send Modified Request](./docs/img/发送修改后的LLM请求.png)

- **Track LLM requests**: record all LLM request/response logs made by Claude Code.
- **Replay requests**: edit the request payload and resend it to validate the response repeatedly.

## 🚀 Quick Start

### Install

```bash
# Recommended: install from npm
npm install -g @myskyline_ai/ccdebug

# Or install from a local tgz artifact
# npm install -g /path/to/@myskyline_ai-ccdebug-x.y.z.tgz
```

### Basic usage

#### 1) Launch Claude and record traffic

```bash
# Basic usage - start Claude and record logs
ccdebug

# Include all requests (not only /v1/messages)
ccdebug --include-all-requests

# Pass all subsequent arguments to Claude (example)
ccdebug --run-with -p "Do the work as requested" --verbose
```

#### 2) Start the Web timeline server

```bash
# Start the Web server (default port: 3001, default project dir: current working directory)
ccdebug --serve

# Custom port
ccdebug --serve --port 3001

# Specify project directory
ccdebug --serve --project /path/to/your/cc_workdir
```

### Log output directories

- **Claude Code standard logs (for timeline)**: `.claude-trace/cclog/*.jsonl` (includes main logs and `agent-*.jsonl` sub-agent logs)
- **Claude API tracing logs (for LLM debugging)**: `.claude-trace/tracelog/*.jsonl`
- **Saved LLM request overrides (for replay)**: `.claude-trace/tracelog/llm_requests/*.json`

Notes:

- After a `ccdebug`-launched Claude session ends, CCDebug automatically copies the corresponding Claude Code standard logs into `.claude-trace/cclog/`, and renames the API tracing log to `{sessionId}.jsonl`.
- If you are using the **native Claude Code binary** (not the npm script version), CCDebug cannot intercept API requests, so LLM request debugging won’t work. You can still use the Web UI to view existing standard logs.

## 📋 CLI Options

| Option | Description |
|------|------|
| `--serve` | Start the Web timeline server |
| `--log, -l` | Start the Web timeline server (`--log` without a value behaves like `--serve`; prefer `-l` to avoid confusion with `--log <name>`) |
| `--port <number>` | Web server port (default: 3001) |
| `--project <path>` | Project directory |
| `--run-with <args>` | Pass subsequent args to the Claude process |
| `--include-all-requests` | Capture all Claude-related requests, not only chat requests |
| `--no-open` | Do not auto-open the generated HTML in a browser (currently only effective for `--generate-html`) |
| `--claude-path <path>` | Custom path to the Claude binary or `cli.js` |
| `--log <name>` | Base name for API tracing logs (affects files under `.claude-trace/tracelog/`) |
| `--generate-html <input.jsonl> [output.html]` | Generate an HTML report from a JSONL file |
| `--index` | Generate conversation summaries & an index under `.claude-trace/` (will call Claude and incur token usage) |
| `--extract-token` | Extract OAuth token and exit |
| `--version, -v` | Print version |
| `--help, -h` | Show help |

## 🏗️ Architecture

### Core components

- **HTTP/API interceptor**: intercepts Node.js HTTP/HTTPS + fetch to capture Anthropic/Bedrock requests and responses.
- **Standard log collection**: on exit, copies main and sub-agent Claude Code logs into `.claude-trace/cclog/`.
- **Web server**: Express provides APIs for file listing, session management, project switching, and LLM request read/save/replay.
- **Frontend**: Vue 3 + Vite + Pinia + Arco Design.

### Data flow

```
HTTP request/response → interceptor → raw JSONL → processors → structured data → Web UI
```

## 📁 Project Structure

```
ccdebug/
├── src/                     # CLI & interceptors
│   ├── cli.ts              # CLI entry
│   ├── interceptor.ts      # API interception and tracelog recording
│   ├── html-generator.ts   # HTML report generator (based on frontend)
│   └── index-generator.ts  # conversation summaries and index
├── web/                     # Web timeline site (Vite + Vue 3)
│   ├── src/                # frontend source
│   ├── dist/               # build output
│   └── server/             # Express backend (required by CLI to start)
├── frontend/                # standalone HTML report frontend (bundle injected into HTML)
├── scripts/                 # packaging scripts
└── docs/                    # docs and design notes
```

## 🔧 Development

### Requirements

- Node.js >= 16.0.0
- npm or yarn

### Local development

```bash
# Clone
git clone https://github.com/ThinkingBeing/ccdebug.git
cd ccdebug

# Install dependencies
npm install

# Build
npm run build

# Dev mode (watch core code + web frontend)
npm run dev

# Run CLI via tsx (for development/debugging)
npx tsx src/cli.ts --help
npx tsx src/cli.ts --serve --port 3001 --project /path/to/your/cc_workdir

# Package (artifacts will be placed under release/)
npm run package
```

## 🔗 Links

- [GitHub repository](https://github.com/ThinkingBeing/ccdebug)
