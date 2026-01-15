const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// const Anthropic = require('@anthropic-ai/sdk');
const { LogFileManager } = require('./log-file-manager.js');
const { ConversationParser } = require('./conversation-parser.js');
// import { ApiResponse, FilesApiResponse, ProjectInfo, ConversationData } from '../src/types/index.js';

// 统一调试日志开关：设置环境变量 CCDEBUG_DEBUG=1 时才输出详细日志
const DEBUG_LOGS = process.env.CCDEBUG_DEBUG === '1';
const dlog = (...args: any[]) => { if (DEBUG_LOGS) console.log(...args); };

export interface WebServerConfig {
  projectDir: string;
  port: number;
  staticDir: string;
}

export class WebServer {
  private app: any;
  private server: any;
  private io: any;
  private logFileManager: any;
  private conversationParser: any;
  private config: WebServerConfig;
  private isStarted: boolean = false;
  private anthropic: any;
  private logDir: string;
  private fileWatcher: any;

  /**
   * 按优先级获取ANTHROPIC_AUTH_TOKEN
   * 1. 从项目目录的.claude/settings.local.json获取
   * 2. 从全局Claude目录的settings.local.json获取
   * 3. 从全局环境变量获取
   */
  private getAuthToken(): string | null {
    // 1. 从项目目录的.claude/settings.local.json获取
    const projectSettingsPath = path.join(this.config.projectDir, '.claude/settings.local.json');
    try {
      if (fs.existsSync(projectSettingsPath)) {
        const projectSettings = JSON.parse(fs.readFileSync(projectSettingsPath, 'utf-8'));
        if (projectSettings.env && projectSettings.env.ANTHROPIC_AUTH_TOKEN) {
          dlog('从项目设置文件获取ANTHROPIC_AUTH_TOKEN');
          return projectSettings.env.ANTHROPIC_AUTH_TOKEN;
        }
      }
    } catch (error) {
      console.error('读取项目设置文件失败:', error);
    }

    // 2. 从全局Claude目录的settings.local.json获取
    const globalSettingsPath = path.join(process.env.HOME || '', '.claude/settings.local.json');
    try {
      if (fs.existsSync(globalSettingsPath)) {
        const globalSettings = JSON.parse(fs.readFileSync(globalSettingsPath, 'utf-8'));
        if (globalSettings.env && globalSettings.env.ANTHROPIC_AUTH_TOKEN) {
          dlog('从全局设置文件获取ANTHROPIC_AUTH_TOKEN');
          return globalSettings.env.ANTHROPIC_AUTH_TOKEN;
        }
      }
    } catch (error) {
      console.error('读取全局设置文件失败:', error);
    }

    // 3. 从全局环境变量获取
    if (process.env.ANTHROPIC_AUTH_TOKEN) {
      dlog('从环境变量获取ANTHROPIC_AUTH_TOKEN');
      return process.env.ANTHROPIC_AUTH_TOKEN;
    }

    console.warn('未能获取ANTHROPIC_AUTH_TOKEN');
    return null;
  }

  constructor(config: WebServerConfig) {
    this.config = config;
    this.app = express();
    this.server = createServer(this.app);

    // 初始化 Anthropic 客户端
    // this.anthropic = new Anthropic({
    //   apiKey: process.env.ANTHROPIC_API_KEY,
    // });

    this.logFileManager = new LogFileManager();
    this.conversationParser = new ConversationParser();

    // 初始化日志目录
    this.logDir = this.determineLogDirectory(config.projectDir);

    // 设置ConversationParser的日志目录
    this.conversationParser.setLogDirectory(this.logDir);

    this.setupBasicMiddleware();
    this.setupRoutes();
    this.setupStaticFiles();
    // this.setupWebSocket();
    // this.setupFileWatcher();
  }

  /**
   * 确定日志目录路径
   * @param projectDir 项目目录路径
   * @returns 日志目录路径
   */
  private determineLogDirectory(projectDir: string): string {
    const os = require('os');
    const claudeProjectsDir = path.join(os.homedir(), '.claude', 'projects');
    const resolvedProjectDir = path.resolve(projectDir);

    // 检查项目路径是否在 ~/.claude/projects/ 下
    const isInClaudeProjects = resolvedProjectDir.startsWith(claudeProjectsDir);

    if (isInClaudeProjects) {
      // 如果项目在 ~/.claude/projects/ 下，日志文件直接在项目目录中
      dlog(`项目在 .claude/projects 下，使用项目目录作为日志目录: ${resolvedProjectDir}`);
      return resolvedProjectDir;
    } else {
      // 如果项目不在 ~/.claude/projects/ 下，先尝试 .claude-trace/cclog
      const defaultLogDir = path.join(resolvedProjectDir, '.claude-trace/cclog');

      let useDefaultLogDir = true;
      if (fs.existsSync(defaultLogDir)) {
        try {
          const files = fs.readdirSync(defaultLogDir);
          const hasJsonlFiles = files.some(file => file.endsWith('.jsonl'));
          if (hasJsonlFiles) {
            useDefaultLogDir = false;
            dlog(`使用默认日志目录: ${defaultLogDir}，找到 ${files.filter(f => f.endsWith('.jsonl')).length} 个jsonl文件`);
          }
        } catch (error) {
          console.error('读取日志目录失败:', error);
        }
      }

      if (useDefaultLogDir) {
        const resolvedLogDir = this.logFileManager.resolveLogDirectory(resolvedProjectDir);
        dlog(`使用备用日志目录: ${resolvedLogDir}`);
        return resolvedLogDir;
      }

      return defaultLogDir;
    }
  }

  private setupBasicMiddleware(): void {
    // CORS配置
    this.app.use(cors());
    
    // JSON解析
    this.app.use(express.json());
  }

  private setupStaticFiles(): void {
    // 静态文件服务 - 优先使用构建后的public目录
    if (this.config.staticDir) {
      const publicDir = path.join(this.config.staticDir, 'public');
      
      // 如果存在public目录，优先使用它
      if (fs.existsSync(publicDir)) {
        dlog('Using built static files from:', publicDir);
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
          dlog('Serving built HTML from:', publicIndexPath);
          return res.sendFile(publicIndexPath);
        }
        
        // 备选方案：使用 dist/index.html
        const indexPath = path.join(this.config.staticDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          dlog('Serving fallback HTML from:', indexPath);
          return res.sendFile(indexPath);
        }
        
        console.error('No index.html found in static directory:', this.config.staticDir);
        res.status(404).send('Index file not found');
      } else {
        res.status(404).send('Static directory not configured');
      }
    });
  }

  private setupRoutes(): void {
    // 项目信息API
    this.app.get('/api/project/info', async (req, res) => {
      try {
        const projectInfo: any = {
          path: this.config.projectDir,
          logDir: this.logDir
        };
        
        const response: any = {
          success: true,
          data: projectInfo
        };
        
        res.json(response);
      } catch (error) {
        console.error('获取项目信息失败:', error);
        const response: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(response);
      }
    });

    // 主日志列表API
    this.app.get('/api/main-logs', async (req, res) => {
      try {
        const mainLogs = await this.logFileManager.getMainLogSummaries(this.logDir);

        const response: any = {
          success: true,
          data: {
            mainLogs: mainLogs,
            logDir: this.logDir
          }
        };

        res.json(response);
      } catch (error) {
        console.error('获取主日志列表失败:', error);
        const response: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(response);
      }
    });

    // 文件列表API
    this.app.get('/api/files', async (req, res) => {
      try {
        const sessionId = req.query.sessionId as string;
        const mainLogId = req.query.mainLogId as string;
        let files = await this.logFileManager.getAvailableLogFiles(this.logDir);

        // 如果提供了mainLogId参数，返回主日志及其子agent日志
        if (mainLogId) {
          // 获取主日志
          const mainLog = files.find(f => f.id === mainLogId);
          if (mainLog) {
            // 获取子agent日志
            const agentLogs = await this.logFileManager.getAgentLogsForSession(this.logDir, mainLogId);
            
            // 将agentLogs作为主日志的属性
            (mainLog as any).agentLogs = agentLogs;

            // 返回主日志和所有子agent日志
            files = [mainLog, ...agentLogs];
            dlog(`按mainLogId ${mainLogId} 过滤后找到 1 个主日志和 ${agentLogs.length} 个子agent日志`);
          } else {
            files = [];
            dlog(`未找到mainLogId为 ${mainLogId} 的主日志`);
          }
        }
        // 如果提供了sessionId参数，过滤匹配的文件
        else if (sessionId) {
          files = files.filter(file =>
            file.id.includes(sessionId) || file.name.includes(sessionId)
          );
          dlog(`按sessionId ${sessionId} 过滤后找到 ${files.length} 个文件`);
        }

        const filesData: any = {
          files: files,
          latest: files.length > 0 ? files[0].id : null,
          projectDir: this.config.projectDir,
          logDir: this.logDir,
          sessionId: sessionId || null,
          mainLogId: mainLogId || null
        };

        const response: any = {
          success: true,
          data: filesData
        };

        res.json(response);
      } catch (error) {
        console.error('获取文件列表失败:', error);
        const response: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(response);
      }
    });

    // 对话数据API
    this.app.get('/api/conversations/:fileId(*)', async (req, res) => {
      try {
        const fileId = req.params.fileId as string;
        
        if (!fileId) {
          const response: any = {
            success: false,
            error: '缺少fileId参数'
          };
          return res.status(400).json(response);
        }

        const conversationData = await this.conversationParser.parseFile(fileId);
        const response: any = {
          success: true,
          data: conversationData
        };
        
        res.json(response);
      } catch (error) {
        console.error('获取对话数据失败:', error);
        const response: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(response);
      }
    });

    // 健康检查API
    this.app.get('/api/health', (req, res) => {
      const response: any = {
        success: true,
        message: 'Web服务器运行正常'
      };
      res.json(response);
    });

    // 获取可用项目列表API
    this.app.get('/api/projects', async (req, res) => {
      try {
        const os = require('os');
        const projectsDir = path.join(os.homedir(), '.claude', 'projects');

        // 检查目录是否存在
        if (!fs.existsSync(projectsDir)) {
          return res.json({
            success: true,
            data: {
              projects: [],
              defaultProject: this.config.projectDir,
              projectsDir: projectsDir
            }
          });
        }

        // 读取所有子目录
        const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
        const projects = entries
          .filter(entry => entry.isDirectory())
          .map(entry => {
            const projectPath = path.join(projectsDir, entry.name);
            return {
              path: projectPath,
              name: entry.name,
              isDefault: path.resolve(projectPath) === path.resolve(this.config.projectDir)
            };
          })
          .sort((a, b) => {
            // 默认项目排在最前面
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });

        const response: any = {
          success: true,
          data: {
            projects: projects,
            defaultProject: this.config.projectDir,
            projectsDir: projectsDir
          }
        };

        res.json(response);
      } catch (error) {
        console.error('获取项目列表失败:', error);
        const response: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(response);
      }
    });

    // 切换项目API
    this.app.post('/api/project/switch', async (req, res) => {
      try {
        const { projectPath } = req.body;

        if (!projectPath) {
          return res.status(400).json({
            success: false,
            error: '缺少projectPath参数'
          });
        }

        // 验证项目路径是否存在
        if (!fs.existsSync(projectPath)) {
          return res.status(400).json({
            success: false,
            error: `项目路径不存在: ${projectPath}`
          });
        }

        // 更新配置
        this.config.projectDir = path.resolve(projectPath);

        // 重新确定日志目录
        this.logDir = this.determineLogDirectory(this.config.projectDir);

        // 更新ConversationParser的日志目录
        this.conversationParser.setLogDirectory(this.logDir);

        console.log(`项目已切换到: ${this.config.projectDir}`);
        console.log(`日志目录已更新为: ${this.logDir}`);

        const response: any = {
          success: true,
          data: {
            projectDir: this.config.projectDir,
            logDir: this.logDir
          }
        };

        res.json(response);
      } catch (error) {
        console.error('切换项目失败:', error);
        const response: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(response);
      }
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
      }
    });

    // 获取会话步骤详情
    this.app.get('/api/conversations/:fileId(*)/steps/:stepId', async (req, res) => {
      try {
        const { fileId, stepId } = req.params;
        
        if (!fileId || !stepId) {
          const response: any = {
            success: false,
            error: '缺少fileId或stepId参数'
          };
          return res.status(400).json(response);
        }

        const conversationData = await this.conversationParser.parseFile(fileId);
        const targetStep = conversationData.steps.find(step => step.id === stepId);
        
        if (!targetStep) {
          const response: any = {
            success: false,
            error: '未找到对应的步骤'
          };
          return res.status(404).json(response);
        }

        const response: any = {
          success: true,
          data: targetStep
        };
        res.json(response);

      } catch (error) {
        console.error('获取步骤详情失败:', error);
        console.error('错误详情:', {
          fileId: req.params.fileId,
          stepId: req.params.stepId,
          errorMessage: error instanceof Error ? error.message : '未知错误',
          errorStack: error instanceof Error ? error.stack : undefined
        });
        const response: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(response);
      }
    });

    // 获取LLM日志
    this.app.get('/api/conversations/:fileId(*)/llm-logs/:messageId', async (req, res) => {
      try {
        const { fileId, messageId } = req.params;
        dlog(`查找LLM日志: fileId=${fileId}, messageId=${messageId}`);
        
        // 1. 直接在日志目录中查找对应的文件
        const traceDir = path.join(this.config.projectDir, '.claude-trace', 'tracelog');
        let targetFilePath: string | null = null;
        let targetFileId = fileId;

        //如果是agent-*文件，则从this.logDir目录读取此文件，找到第一个条记录的sessionId属性
        if(fileId.startsWith('agent-')) {
          const logFilePath = path.join(this.logDir, `${fileId}.jsonl`);
          if (fs.existsSync(logFilePath)) {
            const fileContent = await fs.readFileSync(logFilePath, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim() !== '');
            if (lines.length > 0) {
              const firstRecord = JSON.parse(lines[0]);
              if (firstRecord.sessionId) {
                targetFileId = firstRecord.sessionId;
                dlog(`根据agent-*文件找到sessionId: ${targetFileId}`);
              }
            }
          }
        }

        // 查找sessionId.jsonl文件
        const jsonlFilePath = path.join(traceDir, `${targetFileId}.jsonl`);
        if (fs.existsSync(jsonlFilePath)) {
          targetFilePath = jsonlFilePath;
          dlog(`找到LLM日志文件: ${targetFilePath}`);
        }
        else {
          throw new Error(`找不到LLM日志文件: ${targetFileId}`);
        }

        // 2. 读取并解析文件内容
        const fileContent = await fs.promises.readFile(targetFilePath, 'utf-8');
        
        let matchedRecord: any = null;
        
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
                      dlog(`找到message_start事件，messageId: ${event.message.id}, 查找的messageId: ${messageId}`);
                      if (event.message.id === messageId || messageId === 'step_1') {
                        // 如果messageId匹配，或者请求的是step_1（默认值），则返回这条记录
                        matchedRecord = record;
                        dlog(`匹配成功，返回记录`);
                        break;
                      }
                    }
                  }
                  if (matchedRecord) break;
                } catch (parseError) {
                  console.warn(`SSE解析失败: ${parseError}`);
                  // 如果SSE解析失败，回退到简单的字符串搜索
                  if (record.response.body_raw.includes(messageId)) {
                    matchedRecord = record;
                    break;
                  }
                }
              }
            } catch (parseError) {
              console.warn(`解析JSON行失败: ${parseError}`);
              continue;
            }
          }
        }
        
        if (!matchedRecord) {
          throw new Error(`在文件 ${fileId} 中找不到messageId: ${messageId}`);
        }
        
        dlog(`找到匹配的LLM记录`);

        //从traceDir中查找llm_requests目录尝试获取LLM请求数据文件，如果找到，覆盖LLM请求数据
        const llmRequestsDir = path.join(traceDir, 'llm_requests');
        const llmRequestFilePath = path.join(llmRequestsDir, `${messageId}.json`);
        if(fs.existsSync(llmRequestFilePath)) {
          try {
            const llmRequestContent = await fs.promises.readFile(llmRequestFilePath, 'utf-8');
            matchedRecord.request = JSON.parse(llmRequestContent);
          } catch (error) {
            throw new Error(`覆盖请求数据失败: ${error}`);
          }
        }
        
        // 4. 构建返回数据
        const processedRecord: any = {
          request: matchedRecord.request || matchedRecord,
          response: matchedRecord.response || {},
          logged_at: matchedRecord.logged_at || matchedRecord.timestamp || new Date().toISOString()
        };
        
        // 5. 解析response.body_raw（如果存在）
        if (matchedRecord.response && matchedRecord.response.body_raw) {
          try {
            let res =  matchedRecord.response;
            // 解析SSE格式数据
            const sseEvents = this.parseSSEData(res.body_raw);
            res.body_data = this.transformSSEEvents(sseEvents);
            dlog(`解析到 ${sseEvents.length} 个SSE事件`);
            
            // 提取content_block_delta的文本内容
            const textParts: string[] = [];
            for (const event of sseEvents) {
              if (event.type === 'content_block_delta' && event.delta && event.delta.type === 'text_delta' && event.delta.text) {
                textParts.push(event.delta.text);
              }
            }
            
            dlog(`提取到 ${textParts.length} 个文本片段`);
            
            if (textParts.length > 0) {
              res.body_text = textParts.join('');
              dlog(`合并后的文本长度: ${res.body_text.length}`);
            }
          } catch (parseError) {
            console.warn(`解析body_raw失败: ${parseError}`);
          }
        }
        
        const response: any = {
          success: true,
          data: processedRecord
        };
        
        res.json(response);
      } catch (error) {
        console.error('获取LLM日志失败:', error);
        const response: any = {
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
          const response: any = {
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

        const response: any = {
          success: true,
          data: {
            message: '保存成功',
            filePath: filePath
          }
        };
        
        res.json(response);

      } catch (error) {
        console.error('保存LLM请求数据失败:', error);
        const response: any = {
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

        const authToken = this.getAuthToken();
        if (!authToken) {
          throw new Error('无法获取ANTHROPIC_AUTH_TOKEN，请检查设置文件或环境变量');
        }
        requestHeaders['authorization'] = `Bearer ${authToken}`;
        requestBody.stream = false;

        // 发起HTTP请求到Anthropic API
        const fetch = (await import('node-fetch')).default;
        const https = await import('https');
        const agent = new https.Agent({
          rejectUnauthorized: process.env.NODE_ENV === 'production' ? true : false
        });

        const response = await fetch(req.body.url, {
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
        const apiResponse: any = {
          success: true,
          data: {
            response: responseJson,
            timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
          }
        };

        res.json(apiResponse);

      } catch (error) {
        console.error('LLM 请求失败:', error);
        const errorResponse: any = {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        };
        res.status(500).json(errorResponse);
      }
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      dlog('客户端连接:', socket.id);
      
      // 发送连接确认
      socket.emit('connection', {
        message: '连接成功',
        timestamp: new Date().toISOString()
      });
      
      socket.on('disconnect', () => {
        dlog('客户端断开连接:', socket.id);
      });
    });
  }

  private setupFileWatcher(): void {
    this.fileWatcher = this.logFileManager.watchLogDirectory(this.logDir, async (eventType, filename, filepath) => {
      dlog(`文件变化: ${eventType} - ${filename}`);
      
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
          } catch (error) {
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
      } catch (error) {
        console.error('处理文件变化事件失败:', error);
      }
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.config.port, '0.0.0.0', () => {
          console.log(`Web服务器启动成功:`);
          console.log(`- 端口: ${this.config.port}`);
          console.log(`- 项目目录: ${this.config.projectDir}`);
          console.log(`- 日志目录: ${this.logDir}`);
          console.log(`- 本地访问地址: http://localhost:${this.config.port}`);
          console.log(`- 远程访问地址: http://<服务器IP>:${this.config.port}`);
          resolve();
        });
        
        this.server.on('error', (error: any) => {
          console.error('Web服务器启动失败:', error);
          reject(error);
        });
      } catch (error) {
        console.error('启动Web服务器失败:', error);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
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

  public getUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * 解析SSE格式的数据
   * @param sseData SSE格式的原始数据
   * @returns 解析后的事件数组
   */
  private parseSSEData(sseData: string): any[] {
    const events: any[] = [];
    const lines = sseData.split('\n');
    let currentEvent: any = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        // 空行表示事件结束
        if (currentEvent.event && currentEvent.data) {
          try {
            // 解析data字段中的JSON
            const parsedData = JSON.parse(currentEvent.data);
            events.push(parsedData);
          } catch (error) {
            console.warn('解析SSE事件数据失败:', error, currentEvent.data);
          }
        }
        currentEvent = {};
      } else if (trimmedLine.startsWith('event:')) {
        currentEvent.event = trimmedLine.substring(6).trim();
      } else if (trimmedLine.startsWith('data:')) {
        currentEvent.data = trimmedLine.substring(5).trim();
      }
    }
    
    // 处理最后一个事件（如果没有以空行结尾）
    if (currentEvent.event && currentEvent.data) {
      try {
        const parsedData = JSON.parse(currentEvent.data);
        events.push(parsedData);
      } catch (error) {
        console.warn('解析SSE事件数据失败:', error, currentEvent.data);
      }
    }
    
    return events;
  }
  private transformSSEEvents(events: any[]): any[] {
    // 转换events数组为更可读的JSON对象
    const convertedMessages: any[] = [];
    let currentTextContent = '';
    let currentToolUse: any = null;
    let currentToolInput = '';
    
    for (const event of events) {
      if (event.type === 'content_block_delta') {
        if (event.delta?.type === 'text_delta') {
          // 收集文本内容
          currentTextContent += event.delta.text;
        } else if (event.delta?.type === 'input_json_delta') {
          // 收集工具输入JSON
          currentToolInput += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_start') {
        if (event.content_block?.type === 'tool_use') {
          // 开始一个新的工具使用
          currentToolUse = {
            type: 'tool_use',
            id: event.content_block.id,
            name: event.content_block.name,
            input: {}
          };
        }
      } else if (event.type === 'content_block_stop') {
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
          } catch (error) {
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
      } catch (error) {
        console.warn('解析工具输入JSON失败:', error, currentToolInput);
      }
    }
    
    return convertedMessages;
  }
}