"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebServer = void 0;
const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { LogFileManager } = require('./log-file-manager.js');
const { ConversationParser } = require('./conversation-parser.js');
class WebServer {
    constructor(config) {
        this.isStarted = false;
        this.config = config;
        this.app = express();
        this.server = createServer(this.app);
        // this.io = new SocketIOServer(this.server, {
        //   cors: {
        //     origin: "*",
        //     methods: ["GET", "POST"]
        //   }
        // });
        // 初始化 Anthropic 客户端
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.logFileManager = new LogFileManager();
        this.conversationParser = new ConversationParser();
        this.logDir = this.logFileManager.resolveLogDirectory(config.projectDir);
        // 设置ConversationParser的日志目录
        this.conversationParser.setLogDirectory(this.logDir);
        this.setupBasicMiddleware();
        this.setupRoutes();
        this.setupStaticFiles();
        // this.setupWebSocket();
        // this.setupFileWatcher();
    }
    setupBasicMiddleware() {
        // CORS配置
        this.app.use(cors());
        // JSON解析
        this.app.use(express.json());
    }
    setupStaticFiles() {
        // 静态文件服务 - 优先使用构建后的public目录
        if (this.config.staticDir) {
            const publicDir = path.join(this.config.staticDir, 'public');
            // 如果存在public目录，优先使用它
            if (fs.existsSync(publicDir)) {
                console.log('Using built static files from:', publicDir);
                this.app.use(express.static(publicDir));
            }
            // 同时也提供dist根目录的静态文件（用于assets等）
            this.app.use(express.static(this.config.staticDir));
        }
        // SPA路由支持 - 必须放在最后，并且只处理非API请求
        this.app.get('*', (req, res) => {
            // 如果是API请求，不处理
            if (req.path.startsWith('/api/')) {
                return res.status(404).json({ success: false, error: 'API endpoint not found' });
            }
            if (this.config.staticDir) {
                // 优先使用构建后的版本 dist/public/index.html
                const publicIndexPath = path.join(this.config.staticDir, 'public', 'index.html');
                if (fs.existsSync(publicIndexPath)) {
                    console.log('Serving built HTML from:', publicIndexPath);
                    return res.sendFile(publicIndexPath);
                }
                // 备选方案：使用 dist/index.html
                const indexPath = path.join(this.config.staticDir, 'index.html');
                if (fs.existsSync(indexPath)) {
                    console.log('Serving fallback HTML from:', indexPath);
                    return res.sendFile(indexPath);
                }
                console.error('No index.html found in static directory:', this.config.staticDir);
                res.status(404).send('Index file not found');
            }
            else {
                res.status(404).send('Static directory not configured');
            }
        });
    }
    setupRoutes() {
        // 项目信息API
        this.app.get('/api/project/info', async (req, res) => {
            try {
                const projectInfo = {
                    path: this.config.projectDir,
                    logDir: this.logDir
                };
                const response = {
                    success: true,
                    data: projectInfo
                };
                res.json(response);
            }
            catch (error) {
                console.error('获取项目信息失败:', error);
                const response = {
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                };
                res.status(500).json(response);
            }
        });
        // 文件列表API
        this.app.get('/api/files', async (req, res) => {
            try {
                const files = await this.logFileManager.getAvailableLogFiles(this.logDir);
                const filesData = {
                    files: files,
                    latest: files.length > 0 ? files[0].id : null,
                    projectDir: this.config.projectDir,
                    logDir: this.logDir
                };
                const response = {
                    success: true,
                    data: filesData
                };
                res.json(response);
            }
            catch (error) {
                console.error('获取文件列表失败:', error);
                const response = {
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                };
                res.status(500).json(response);
            }
        });
        // 对话数据API
        this.app.get('/api/conversations/:fileId', async (req, res) => {
            try {
                const fileId = req.params.fileId;
                if (!fileId) {
                    const response = {
                        success: false,
                        error: '缺少fileId参数'
                    };
                    return res.status(400).json(response);
                }
                const conversationData = await this.conversationParser.parseFile(fileId);
                const response = {
                    success: true,
                    data: conversationData
                };
                res.json(response);
            }
            catch (error) {
                console.error('获取对话数据失败:', error);
                const response = {
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                };
                res.status(500).json(response);
            }
        });
        // 健康检查API
        this.app.get('/api/health', (req, res) => {
            const response = {
                success: true,
                message: 'Web服务器运行正常'
            };
            res.json(response);
        });
        // 调试API：获取trace文件列表
        this.app.get('/api/debug/trace-files', async (req, res) => {
            try {
                const traceDir = path.join(this.config.projectDir, '.claude-trace');
                if (!fs.existsSync(traceDir)) {
                    return res.json({ files: [], traceDir });
                }
                const files = fs.readdirSync(traceDir).map(file => {
                    const filePath = path.join(traceDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        modified: stats.mtime
                    };
                });
                res.json({ files, traceDir });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                res.status(500).json({ error: errorMessage });
            }
        });
        // 获取会话步骤详情
        this.app.get('/api/conversations/:fileId/steps/:stepId', async (req, res) => {
            try {
                const { fileId, stepId } = req.params;
                if (!fileId || !stepId) {
                    const response = {
                        success: false,
                        error: '缺少fileId或stepId参数'
                    };
                    return res.status(400).json(response);
                }
                const conversationData = await this.conversationParser.parseFile(fileId);
                const targetStep = conversationData.steps.find(step => step.id === stepId);
                if (!targetStep) {
                    const response = {
                        success: false,
                        error: '未找到对应的步骤'
                    };
                    return res.status(404).json(response);
                }
                const response = {
                    success: true,
                    data: targetStep
                };
                res.json(response);
            }
            catch (error) {
                console.error('获取步骤详情失败:', error);
                console.error('错误详情:', {
                    fileId: req.params.fileId,
                    stepId: req.params.stepId,
                    errorMessage: error instanceof Error ? error.message : '未知错误',
                    errorStack: error instanceof Error ? error.stack : undefined
                });
                const response = {
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                };
                res.status(500).json(response);
            }
        });
        // 获取LLM日志
        this.app.get('/api/conversations/:fileId/llm-logs/:messageId', async (req, res) => {
            try {
                const { fileId, messageId } = req.params;
                console.log(`查找LLM日志: fileId=${fileId}, messageId=${messageId}`);
                // 1. 直接在日志目录中查找对应的文件
                const traceDir = path.join(this.config.projectDir, '.claude-trace');
                let resObj;
                const jsonlFilePath = path.join(traceDir, `${fileId}.jsonl`);
                let targetFilePath = null;
                // 查找.jsonl文件
                if (fs.existsSync(jsonlFilePath)) {
                    targetFilePath = jsonlFilePath;
                    console.log(`找到LLM日志文件: ${targetFilePath}`);
                }
                else {
                    throw new Error(`找不到LLM日志文件: ${fileId}`);
                }
                // 2. 读取并解析文件内容
                const fileContent = await fs.promises.readFile(targetFilePath, 'utf-8');
                let matchedRecord = null;
                if (targetFilePath.endsWith('.jsonl')) {
                    // 处理.jsonl文件：逐行解析JSON
                    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
                    for (const line of lines) {
                        try {
                            const record = JSON.parse(line);
                            // 3. 在response.body_raw中搜索messageId
                            if (record.response && record.response.body_raw) {
                                // 解析SSE数据，查找message_start事件中的messageId
                                try {
                                    const sseEvents = this.parseSSEData(record.response.body_raw);
                                    for (const event of sseEvents) {
                                        if (event.type === 'message_start' && event.message && event.message.id) {
                                            console.log(`找到message_start事件，messageId: ${event.message.id}, 查找的messageId: ${messageId}`);
                                            if (event.message.id === messageId || messageId === 'step_1') {
                                                // 如果messageId匹配，或者请求的是step_1（默认值），则返回这条记录
                                                matchedRecord = record;
                                                console.log(`匹配成功，返回记录`);
                                                break;
                                            }
                                        }
                                    }
                                    if (matchedRecord)
                                        break;
                                }
                                catch (parseError) {
                                    console.warn(`SSE解析失败: ${parseError}`);
                                    // 如果SSE解析失败，回退到简单的字符串搜索
                                    if (record.response.body_raw.includes(messageId)) {
                                        matchedRecord = record;
                                        break;
                                    }
                                }
                            }
                        }
                        catch (parseError) {
                            console.warn(`解析JSON行失败: ${parseError}`);
                            continue;
                        }
                    }
                }
                if (!matchedRecord) {
                    throw new Error(`在文件 ${fileId} 中找不到messageId: ${messageId}`);
                }
                console.log(`找到匹配的LLM记录`);
                //从traceDir中查找llm_requests目录尝试获取LLM请求数据文件，如果找到，覆盖LLM请求数据
                const llmRequestsDir = path.join(traceDir, 'llm_requests');
                const llmRequestFilePath = path.join(llmRequestsDir, `${messageId}.json`);
                if (fs.existsSync(llmRequestFilePath)) {
                    try {
                        const llmRequestContent = await fs.promises.readFile(llmRequestFilePath, 'utf-8');
                        matchedRecord.request = JSON.parse(llmRequestContent);
                    }
                    catch (error) {
                        throw new Error(`覆盖请求数据失败: ${error}`);
                    }
                }
                // 4. 构建返回数据
                const processedRecord = {
                    request: matchedRecord.request || matchedRecord,
                    response: matchedRecord.response || {},
                    logged_at: matchedRecord.logged_at || matchedRecord.timestamp || new Date().toISOString()
                };
                // 5. 解析response.body_raw（如果存在）
                if (matchedRecord.response && matchedRecord.response.body_raw) {
                    try {
                        let res = matchedRecord.response;
                        // 解析SSE格式数据
                        const sseEvents = this.parseSSEData(res.body_raw);
                        res.body_data = this.transformSSEEvents(sseEvents);
                        console.log(`解析到 ${sseEvents.length} 个SSE事件`);
                        // 提取content_block_delta的文本内容
                        const textParts = [];
                        for (const event of sseEvents) {
                            if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta' && event.delta.text) {
                                textParts.push(event.delta.text);
                            }
                        }
                        console.log(`提取到 ${textParts.length} 个文本片段`);
                        if (textParts.length > 0) {
                            res.body_text = textParts.join('');
                            console.log(`合并后的文本长度: ${res.body_text.length}`);
                        }
                    }
                    catch (parseError) {
                        console.warn(`解析body_raw失败: ${parseError}`);
                    }
                }
                const response = {
                    success: true,
                    data: processedRecord
                };
                res.json(response);
            }
            catch (error) {
                console.error('获取LLM日志失败:', error);
                const response = {
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                };
                res.status(500).json(response);
            }
        });
        // 保存 LLM 请求数据的 API
        this.app.post('/api/llm-requests/:messageId', async (req, res) => {
            try {
                const { messageId } = req.params;
                const requestData = req.body;
                if (!messageId) {
                    const response = {
                        success: false,
                        error: '缺少消息ID参数'
                    };
                    return res.status(400).json(response);
                }
                // 确保 llm_requests 目录存在
                const llmRequestsDir = path.join(this.config.projectDir, '.claude-trace', 'llm_requests');
                if (!fs.existsSync(llmRequestsDir)) {
                    fs.mkdirSync(llmRequestsDir, { recursive: true });
                }
                // 保存文件
                const filePath = path.join(llmRequestsDir, `${messageId}.json`);
                fs.writeFileSync(filePath, JSON.stringify(requestData, null, 2));
                const response = {
                    success: true,
                    data: {
                        message: '保存成功',
                        filePath: filePath
                    }
                };
                res.json(response);
            }
            catch (error) {
                console.error('保存LLM请求数据失败:', error);
                const response = {
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                };
                res.status(500).json(response);
            }
        });
        // 重新发起 LLM 请求的 API
        this.app.post('/api/llm-request', async (req, res) => {
            try {
                // 构建与原始请求一致的请求参数
                const requestHeaders = req.body.headers;
                const requestBody = req.body.body;
                requestHeaders['authorization'] = `Bearer ${process.env.ANTHROPIC_AUTH_TOKEN}`;
                requestBody.stream = false;
                // 发起HTTP请求到Anthropic API
                const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
                const https = await Promise.resolve().then(() => __importStar(require('https')));
                const agent = new https.Agent({
                    rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
                });
                const response = await fetch('https://open.bigmodel.cn/api/anthropic/v1/messages', {
                    method: 'POST',
                    headers: requestHeaders,
                    body: JSON.stringify(requestBody),
                    agent: agent
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                // 获取响应体文本
                const responseJson = await response.json();
                // 构建响应对象
                const apiResponse = {
                    success: true,
                    data: {
                        response: responseJson,
                        timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                    }
                };
                res.json(apiResponse);
            }
            catch (error) {
                console.error('LLM 请求失败:', error);
                const errorResponse = {
                    success: false,
                    error: error instanceof Error ? error.message : '未知错误'
                };
                res.status(500).json(errorResponse);
            }
        });
    }
    setupWebSocket() {
        this.io.on('connection', (socket) => {
            console.log('客户端连接:', socket.id);
            // 发送连接确认
            socket.emit('connection', {
                message: '连接成功',
                timestamp: new Date().toISOString()
            });
            socket.on('disconnect', () => {
                console.log('客户端断开连接:', socket.id);
            });
        });
    }
    setupFileWatcher() {
        this.fileWatcher = this.logFileManager.watchLogDirectory(this.logDir, async (eventType, filename, filepath) => {
            console.log(`文件变化: ${eventType} - ${filename}`);
            try {
                // 获取更新后的文件列表
                const files = await this.logFileManager.getAvailableLogFiles(this.logDir);
                // 如果是文件修改，尝试解析新的对话数据
                let updatedConversations = null;
                if (eventType === 'change' && filepath) {
                    try {
                        const fileId = filename.replace('.jsonl', '');
                        const lines = await this.logFileManager.readLogFile(filepath);
                        updatedConversations = this.conversationParser.parseConversations(lines);
                    }
                    catch (error) {
                        console.warn(`解析更新的对话数据失败: ${error}`);
                    }
                }
                // 通知所有客户端文件更新
                this.io.emit('file:updated', {
                    event: 'file:updated',
                    data: {
                        eventType,
                        filename,
                        fileId: filename.replace('.jsonl', ''),
                        files,
                        conversations: updatedConversations,
                        timestamp: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('处理文件变化事件失败:', error);
            }
        });
    }
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server.listen(this.config.port, 'localhost', () => {
                    console.log(`Web服务器启动成功:`);
                    console.log(`- 端口: ${this.config.port}`);
                    console.log(`- 项目目录: ${this.config.projectDir}`);
                    console.log(`- 日志目录: ${this.logDir}`);
                    console.log(`- 访问地址: http://localhost:${this.config.port}`);
                    resolve();
                });
                this.server.on('error', (error) => {
                    console.error('Web服务器启动失败:', error);
                    reject(error);
                });
            }
            catch (error) {
                console.error('启动Web服务器失败:', error);
                reject(error);
            }
        });
    }
    async stop() {
        return new Promise((resolve) => {
            // // 停止文件监听
            // if (this.fileWatcher) {
            //   this.fileWatcher.close();
            // }
            // // 关闭WebSocket连接
            // this.io.close();
            // 关闭HTTP服务器
            this.server.close(() => {
                console.log('Web服务器已停止');
                resolve();
            });
        });
    }
    getUrl() {
        return `http://localhost:${this.config.port}`;
    }
    /**
     * 解析SSE格式的数据
     * @param sseData SSE格式的原始数据
     * @returns 解析后的事件数组
     */
    parseSSEData(sseData) {
        const events = [];
        const lines = sseData.split('\n');
        let currentEvent = {};
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '') {
                // 空行表示事件结束
                if (currentEvent.event && currentEvent.data) {
                    try {
                        // 解析data字段中的JSON
                        const parsedData = JSON.parse(currentEvent.data);
                        events.push(parsedData);
                    }
                    catch (error) {
                        console.warn('解析SSE事件数据失败:', error, currentEvent.data);
                    }
                }
                currentEvent = {};
            }
            else if (trimmedLine.startsWith('event:')) {
                currentEvent.event = trimmedLine.substring(6).trim();
            }
            else if (trimmedLine.startsWith('data:')) {
                currentEvent.data = trimmedLine.substring(5).trim();
            }
        }
        // 处理最后一个事件（如果没有以空行结尾）
        if (currentEvent.event && currentEvent.data) {
            try {
                const parsedData = JSON.parse(currentEvent.data);
                events.push(parsedData);
            }
            catch (error) {
                console.warn('解析SSE事件数据失败:', error, currentEvent.data);
            }
        }
        return events;
    }
    transformSSEEvents(events) {
        // 转换events数组为更可读的JSON对象
        const convertedMessages = [];
        let currentTextContent = '';
        let currentToolUse = null;
        let currentToolInput = '';
        for (const event of events) {
            if (event.type === 'content_block_delta') {
                if (event.delta?.type === 'text_delta') {
                    // 收集文本内容
                    currentTextContent += event.delta.text;
                }
                else if (event.delta?.type === 'input_json_delta') {
                    // 收集工具输入JSON
                    currentToolInput += event.delta.partial_json;
                }
            }
            else if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'tool_use') {
                    // 开始一个新的工具使用
                    currentToolUse = {
                        type: 'tool_use',
                        id: event.content_block.id,
                        name: event.content_block.name,
                        input: {}
                    };
                }
            }
            else if (event.type === 'content_block_stop') {
                // 内容块结束，处理累积的内容
                if (currentTextContent.trim()) {
                    convertedMessages.push({
                        type: 'text',
                        text: currentTextContent
                    });
                    currentTextContent = '';
                }
                if (currentToolUse && currentToolInput) {
                    try {
                        currentToolUse.input = JSON.parse(currentToolInput);
                        convertedMessages.push(currentToolUse);
                    }
                    catch (error) {
                        console.warn('解析工具输入JSON失败:', error, currentToolInput);
                    }
                    currentToolUse = null;
                    currentToolInput = '';
                }
            }
        }
        // 处理剩余的文本内容
        if (currentTextContent.trim()) {
            convertedMessages.push({
                type: 'text',
                text: currentTextContent
            });
        }
        // 处理剩余的工具使用
        if (currentToolUse && currentToolInput) {
            try {
                currentToolUse.input = JSON.parse(currentToolInput);
                convertedMessages.push(currentToolUse);
            }
            catch (error) {
                console.warn('解析工具输入JSON失败:', error, currentToolInput);
            }
        }
        return convertedMessages;
    }
}
exports.WebServer = WebServer;
//# sourceMappingURL=web-server.js.map