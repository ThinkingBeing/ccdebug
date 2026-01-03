const fs = require('fs');
const path = require('path');
const os = require('os');
// import { LogFileInfo } from '../src/types/index.js';

export class LogFileManager {
  private logDir: string;
  private fileWatcher: any = null;

  constructor(logDir?: string) {
    this.logDir = logDir || '';
  }

  private getUserHome(): string {
    return os.homedir();
  }

  private getClaudeProjectsDir(): string {
    return path.join(this.getUserHome(), '.claude', 'projects');
  }

  /**
   * 根据项目路径解析对应的日志目录
   * @param projectPath 项目路径
   * @returns 日志目录路径
   */
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
    // 根据实际规律：将路径中的所有 '/'、'\'、'_' 和 ':' 替换为 '-'，同时将非 ASCII 字符（如中文）也替换为 '-'
    // 例如："/Users/ligf/Code/claude-code/ccdebug/ccdemo" -> "-Users-ligf-Code-claude-code-ccdebug-ccdemo"
    // 例如："/Users/ligf/Code/项目/测试" -> "-Users-ligf-Code---"
    // 例如："D:\mysoft\cctest\tests\办公资产_1\work" -> "D--mysoft-cctest-tests------1-work"
    return projectPath.replace(/[\/\\:_]/g, '-').replace(/[^\x00-\x7F]/g, '-');
  }

  /**
   * 获取指定目录下的所有 JSONL 文件
   * @param logDir 日志目录路径
   * @returns 日志文件信息数组
   */
  async getAvailableLogFiles(logDir: string): Promise<any[]> {
    if (!fs.existsSync(logDir)) {
      console.warn(`日志目录不存在: ${logDir}`);
      return [];
    }
    
    const files = await fs.promises.readdir(logDir);
    const logFiles: any[] = [];
    
    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const filepath = path.join(logDir, file);
        const stats = await fs.promises.stat(filepath);
        
        // 计算步骤数量
        let stepCount = 0;
        let agentName = null;
        
        try {
          const content = await fs.promises.readFile(filepath, 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());
          
          // 计算步骤数量（与前端显示逻辑保持一致）
          let hasConversationStarted = false;
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              
              // 模拟ConversationParser的isConversationStart逻辑
              const isConversationStart = 
                entry.type === 'conversation_start' ||
                (entry.type === 'user' && !entry.parentUuid) ||
                (!entry.parentUuid && entry.message);
              
              if (isConversationStart) {
                hasConversationStarted = true;
              }
              
              // 跳过conversation_start和llm_request类型
              // 注意：不过滤message为null的条目，因为ConversationParser会将其处理为assistant_message
              const isToolResult = entry.message?.content && 
                                  Array.isArray(entry.message.content) && 
                                  entry.message.content[0]?.type === 'tool_result';
              
              // 只有在对话开始后才计算步骤
              if (hasConversationStarted && entry.type && entry.type !== 'conversation_start' && entry.type !== 'llm_request' && !isToolResult) {
                stepCount++;
              }
            } catch (e) {
              // 忽略解析错误的行
            }
          }
        } catch (error) {
          console.warn(`读取文件 ${file} 失败:`, error);
        }
        
        logFiles.push({
          id: file.replace('.jsonl', ''),
          name: file,
          path: filepath,
          modifiedAt: stats.mtime,
          size: stats.size,
          stepCount,  // 添加步骤数量
          agentName  // 添加Agent名称
        });
      }
    }
    
    // 按修改时间降序排序，最新的在前面
    return logFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }

  /**
   * 获取日志目录中的所有日志文件
   */
  getLogFiles(): any[] {
    try {
      if (!fs.existsSync(this.logDir)) {
        console.log(`日志目录不存在: ${this.logDir}`);
        return [];
      }

      const files = fs.readdirSync(this.logDir);
      const logFiles: any[] = [];

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filepath = path.join(this.logDir, file);
          const stats = fs.statSync(filepath);
          
          logFiles.push({
          id: file.replace('.jsonl', ''),
          name: file,
          path: filepath,
          modifiedAt: stats.mtime,
          size: stats.size
        });
        }
      }

      // 按修改时间排序，最新的在前
      return logFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    } catch (error) {
      console.error('获取日志文件失败:', error);
      return [];
    }
  }

  /**
   * 读取日志文件内容
   */
  readLogFile(filePath: string): string {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('读取日志文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目信息
   */
  getProjectInfo(): { name: string; path: string } {
    const projectName = path.basename(this.logDir);
    return {
      name: projectName,
      path: this.logDir
    };
  }

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      hostname: os.hostname(),
      userInfo: os.userInfo()
    };
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * 获取文件统计信息
   */
  getFileStats(filePath: string) {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      console.error('获取文件统计信息失败:', error);
      return null;
    }
  }

  /**
   * 创建目录（如果不存在）
   */
  ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 监听日志目录变化
   */
  watchLogDirectory(logDir: string, callback: (event: string, filename: string, filepath?: string) => void): any | null {
    if (!fs.existsSync(logDir)) {
      console.warn(`无法监听不存在的目录: ${logDir}`);
      return null;
    }

    const watcher = fs.watch(logDir, { persistent: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.jsonl')) {
        const filepath = path.join(logDir, filename);
        callback(eventType, filename, filepath);
      }
    });

    console.log(`开始监听日志目录: ${logDir}`);
    return watcher;
  }

  /**
   * 根据子agent日志文件名在主日志中查找对应的subagent_type
   * @param agentLogPath 子agent日志文件路径
   * @param mainLogPath 主日志文件路径
   * @returns Agent名称和描述
   */
  async resolveAgentName(agentLogPath: string, mainLogPath: string): Promise<{name: string, description: string}> {
    try {
      // 1. 从文件名提取 agentId
      const fileName = path.basename(agentLogPath, '.jsonl');
      const agentId = fileName.replace('agent-', '');

      // 2. 读取主日志所有行
      const mainLogContent = await fs.promises.readFile(mainLogPath, 'utf-8');
      const mainLogLines = mainLogContent.split('\n').filter((line: string) => line.trim());

      // 3. 读取agent日志的第一行，获取用户消息
      const agentContent = await fs.promises.readFile(agentLogPath, 'utf-8');
      const agentLines = agentContent.split('\n').filter((line: string) => line.trim());

      if (agentLines.length === 0) {
        return { name: agentId, description: '' };
      }

      const firstAgentEntry = JSON.parse(agentLines[0]);
      const agentFirstContent = firstAgentEntry.message?.content;

      // 提取agent的第一条消息文本（用于匹配）
      let agentFirstText = '';
      if (typeof agentFirstContent === 'string') {
        agentFirstText = agentFirstContent.substring(0, 100);
      } else if (Array.isArray(agentFirstContent) && agentFirstContent.length > 0) {
        const firstBlock = agentFirstContent[0];
        if (firstBlock.type === 'text' && firstBlock.text) {
          agentFirstText = firstBlock.text.substring(0, 100);
        }
      }

      // 4. 获取主日志中所有Task工具调用
      const taskToolUses: Array<{id: string, name: string, description: string, input: any}> = [];

      for (const line of mainLogLines) {
        try {
          const entry = JSON.parse(line);
          const content = entry.message?.content;
          if (!Array.isArray(content)) continue;

          for (const block of content) {
            if (block.type === 'tool_use' && block.name === 'Task' && block.input?.subagent_type) {
              taskToolUses.push({
                id: block.id,
                name: block.input.subagent_type,
                description: block.input.description || '',
                input: block.input
              });
            }
          }
        } catch (parseError) {
          continue;
        }
      }

      // 5. 尝试通过prompt匹配来识别agent
      // 检查agent第一条消息是否在Task的prompt中出现
      for (const task of taskToolUses) {
        const taskPrompt = task.input?.prompt || '';
        if (agentFirstText && taskPrompt.includes(agentFirstText.substring(0, 50))) {
          return {
            name: task.name,
            description: task.description
          };
        }
      }

      // 6. 如果只有一个Task还未匹配，则使用它
      if (taskToolUses.length > 0) {
        // 按顺序返回第一个（简单策略）
        return {
          name: taskToolUses[0].name,
          description: taskToolUses[0].description
        };
      }

      // 回退：返回 agentId
      return { name: agentId, description: '' };
    } catch (error) {
      console.error(`解析Agent名称失败: ${agentLogPath}`, error);
      // 从文件名提取 agentId 作为回退
      const fileName = path.basename(agentLogPath, '.jsonl');
      const agentId = fileName.replace('agent-', '');
      return { name: agentId, description: '' };
    }
  }

  /**
   * 在主日志行中查找指定 tool_use_id 的 tool_use 块
   * @param mainLogLines 主日志所有行
   * @param toolUseId 工具使用ID
   * @returns tool_use 块或 null
   */
  private findToolUseById(mainLogLines: string[], toolUseId: string): any | null {
    for (const line of mainLogLines) {
      try {
        const entry = JSON.parse(line);
        const content = entry.message?.content;
        if (!Array.isArray(content)) continue;

        for (const block of content) {
          if (block.type === 'tool_use' && block.id === toolUseId) {
            return block;
          }
        }
      } catch (parseError) {
        // 跳过无法解析的行
        continue;
      }
    }
    return null;
  }

  /**
   * 提取日志文件的第一条用户消息作为预览
   * @param logLines 日志文件所有行
   * @returns 预览和完整内容
   */
  private extractInputPreview(logLines: string[]): { preview: string; full: string } {
    for (const line of logLines) {
      try {
        const entry = JSON.parse(line);
        if (entry.message?.role === 'user') {
          const content = entry.message.content;
          let fullText = '';

          if (typeof content === 'string') {
            fullText = content;
          } else if (Array.isArray(content) && content.length > 0) {
            const firstBlock = content[0];
            if (firstBlock.type === 'text' && firstBlock.text) {
              fullText = firstBlock.text;
            } else if (typeof firstBlock === 'string') {
              fullText = firstBlock;
            }
          }

          return {
            preview: fullText.slice(0, 50) + (fullText.length > 50 ? '...' : ''),
            full: fullText
          };
        }
      } catch (parseError) {
        // 跳过无法解析的行
        continue;
      }
    }
    return { preview: '', full: '' };
  }

  /**
   * 获取指定会话的所有子agent日志
   * @param logDir 日志目录
   * @param sessionId 会话ID
   * @returns 子agent日志信息数组
   */
  async getAgentLogsForSession(logDir: string, sessionId: string): Promise<any[]> {
    try {
      if (!fs.existsSync(logDir)) {
        console.warn(`日志目录不存在: ${logDir}`);
        return [];
      }

      const files = await fs.promises.readdir(logDir);
      const mainLogPath = path.join(logDir, `${sessionId}.jsonl`);

      // 检查主日志是否存在
      if (!fs.existsSync(mainLogPath)) {
        console.warn(`主日志不存在: ${mainLogPath}`);
        return [];
      }

      // 1. 获取主日志中所有Task工具调用（按顺序）
      const mainLogContent = await fs.promises.readFile(mainLogPath, 'utf-8');
      const mainLogLines = mainLogContent.split('\n').filter((line: string) => line.trim());

      const taskToolUses: Array<{id: string, agentName: string, agentId: string, description: string}> = [];
      const taskToolResult: Array<{id: string, agentId: string}> = [];

      for (const line of mainLogLines) {
        try {
          const entry = JSON.parse(line);
          const content = entry.message?.content;
          if (!Array.isArray(content)) continue;

          for (const block of content) {
            if (block.type === 'tool_use' && block.name === 'Task' && block.input?.subagent_type) {
              taskToolUses.push({
                id: block.id,
                agentId: "",
                agentName: block.input.subagent_type,
                description: block.input.description || ''
              });
            }
            if (block.type === 'tool_result' && entry.toolUseResult && entry.toolUseResult?.agentId) {
              taskToolResult.push({
                id: block.tool_use_id,
                agentId: entry.toolUseResult.agentId
              });
            }
          }
        } catch (parseError) {
          continue;
        }
      }

      //将taskToolResult的agentId合并到taskToolUses
      for(const toolUse of taskToolUses) {
        const toolUseId = toolUse.id;
        const tResult = taskToolResult.find((toolResult) => {return toolResult.id === toolUseId;});
        //如果没找到工具调用结果，跳过
        if(tResult && tResult?.agentId) {
          toolUse.agentId = tResult.agentId;
        }
      }

      // 2. 获取所有匹配的agent日志文件
      const candidateAgents: any[] = [];

      for (const file of files) {
        // 仅处理子agent日志文件
        if (file.startsWith('agent-') && file.endsWith('.jsonl')) {
          const agentLogPath = path.join(logDir, file);

          try {
            // 读取子agent日志的第一行，检查其 sessionId 是否匹配
            const content = await fs.promises.readFile(agentLogPath, 'utf-8');
            const firstLine = content.split('\n').find((line: string) => line.trim());

            if (firstLine) {
              const firstEntry = JSON.parse(firstLine);

              // 检查 sessionId 是否匹配，且不是 Warmup agent
              if (firstEntry.sessionId === sessionId) {
                const agentFirstContent = firstEntry.message?.content;
                let isWarmup = false;

                // 检查是否为Warmup agent
                if (typeof agentFirstContent === 'string' && agentFirstContent.includes('Warmup')) {
                  isWarmup = true;
                }

                if (!isWarmup) {
                  const stats = await fs.promises.stat(agentLogPath);
                  candidateAgents.push({
                    file,
                    path: agentLogPath,
                    agentId: file.replace('agent-', '').replace('.jsonl', ''),
                    mtime: new Date(firstEntry.timestamp)
                  });
                }
              }
            }
          } catch (error) {
            console.error(`处理子agent日志失败: ${file}`, error);
            continue;
          }
        }
      }

      // 3. 不再按文件修改时间排序，而是按照在主日志中的顺序排序
      // candidateAgents.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // 4. 按agentId关联agent名称及agent日志文件，并按照主日志中的顺序排列
      const agentLogs: any[] = [];

      // 遍历 taskToolUses，按照主日志中的顺序添加子代理日志
      for (const task of taskToolUses) {
        const agent = candidateAgents.find((a) => a.agentId === task.agentId);
        
        if (agent) {
          // 计算步骤数量
          let stepCount = 0;
          
          try {
            const content = await fs.promises.readFile(agent.path, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            // 计算步骤数量（与前端显示逻辑保持一致）
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                // 跳过conversation_start和llm_request类型
                // 注意：不过滤message为null的条目，因为ConversationParser会将其处理为assistant_message
                const isToolResult = entry.message?.content && 
                                    Array.isArray(entry.message.content) && 
                                    entry.message.content[0]?.type === 'tool_result';
                
                if (entry.type && entry.type !== 'conversation_start' && entry.type !== 'llm_request' && !isToolResult) {
                  stepCount++;
                }
              } catch (e) {
                // 忽略解析错误的行
              }
            }
          } catch (error) {
            console.warn(`读取文件 ${agent.file} 失败:`, error);
          }
          
          // 获取文件大小
          let size = 0;
          try {
            const stats = await fs.promises.stat(agent.path);
            size = stats.size;
          } catch (error) {
            console.warn(`获取文件大小失败 ${agent.file}:`, error);
          }
          
          agentLogs.push({
          id: agent.file.replace('.jsonl', ''),
          name: agent.file,
          path: agent.path,
          agentId: agent.agentId,
          agentName: task?.agentName ? task.agentName: agent.agentId,
          agentDescription: task?.description ? task.description : "",
          stepCount,  // 添加步骤数量
          modifiedAt: agent.mtime,  // 添加修改时间
          size  // 文件大小
        });
        }
      }

      return agentLogs;
    } catch (error) {
      console.error('获取子agent日志失败:', error);
      return [];
    }
  }

  /**
   * 获取所有主日志的摘要信息
   * @param logDir 日志目录
   * @returns 主日志摘要数组
   */
  async getMainLogSummaries(logDir: string): Promise<any[]> {
    try {
      if (!fs.existsSync(logDir)) {
        console.warn(`日志目录不存在: ${logDir}`);
        return [];
      }

      const files = await fs.promises.readdir(logDir);
      const mainLogs: any[] = [];

      for (const file of files) {
        // 仅处理主日志文件（非 agent-*.jsonl 格式）
        if (file.endsWith('.jsonl') && !file.startsWith('agent-')) {
          const filepath = path.join(logDir, file);
          const sessionId = file.replace('.jsonl', '');

          try {
            const content = await fs.promises.readFile(filepath, 'utf-8');
            const lines = content.split('\n').filter((line: string) => line.trim());

            if (lines.length === 0) {
              continue;
            }

            // 读取第一行和最后一行获取时间
            const firstEntry = JSON.parse(lines[0]);
            const lastEntry = JSON.parse(lines[lines.length - 1]);

            // 提取时间戳（支持多种格式）
            const startTime = firstEntry.timestamp || firstEntry.snapshot?.timestamp || firstEntry.message?.timestamp;
            const endTime = lastEntry.timestamp || lastEntry.snapshot?.timestamp || lastEntry.message?.timestamp;

            // 提取第一条用户消息
            const { preview, full } = this.extractInputPreview(lines);

            // 获取关联的子agent日志
            const agentLogs = await this.getAgentLogsForSession(logDir, sessionId);

            mainLogs.push({
              id: sessionId,
              name: file,
              path: filepath,
              startTime: startTime,
              endTime: endTime,
              inputPreview: preview,
              inputFull: full,
              agentLogs: agentLogs
            });
          } catch (error) {
            console.error(`处理主日志失败: ${file}`, error);
            continue;
          }
        }
      }

      // 按开始时间降序排序，最新的在前面
      return mainLogs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } catch (error) {
      console.error('获取主日志摘要失败:', error);
      return [];
    }
  }
}