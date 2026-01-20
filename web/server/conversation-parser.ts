const fs = require('fs');
const path = require('path');
const os = require('os');
// import { ConversationData, ConversationStep } from '../src/types/index.js';

// 统一调试日志开关：设置环境变量 CCDEBUG_DEBUG=1 时才输出详细日志
const DEBUG_LOGS = process.env.CCDEBUG_DEBUG === '1';
const dlog = (...args: any[]) => { if (DEBUG_LOGS) console.log(...args); };

export class ConversationParser {
  private logDir: string = '';

  /**
   * 设置日志目录
   * @param logDir 日志目录路径
   */
  setLogDirectory(logDir: string): void {
    this.logDir = logDir;
  }

  /**
   * 从日志目录推断项目目录
   * @returns 项目目录路径
   */
  private inferProjectDirectory(): string | null {
    if (!this.logDir) {
      return null;
    }
    
    // 日志目录格式: ~/.claude/projects/-Users-ligf-Code-claude-code-ccdebug-ccdemo
    // 需要提取出项目路径: /Users/ligf/Code/claude-code/ccdebug/ccdemo
    const projectsDir = path.join(os.homedir(), '.claude', 'projects');
    if (!this.logDir.startsWith(projectsDir)) {
      return null;
    }
    
    const projectId = path.basename(this.logDir);
    dlog('调试: projectId =', projectId);
    
    // 将项目ID转换回路径格式
    // 例如：-Users-ligf-Code-claude-code-ccdebug-ccdemo -> /Users/ligf/Code/claude-code/ccdebug/ccdemo
    if (!projectId.startsWith('-')) {
      return null;
    }
    
    // 移除开头的连字符，然后将连字符替换为斜杠
    const pathWithoutLeadingDash = projectId.substring(1);
    dlog('调试: pathWithoutLeadingDash =', pathWithoutLeadingDash);
    
    // 特殊处理：claude-code 应该保持为 claude-code，而不是 claude/code
    // 直接硬编码处理这个特定的路径模式
    let reconstructedPath: string;
    
    if (pathWithoutLeadingDash === 'Users-ligf-Code-claude-code-ccdebug-ccdemo') {
      // 直接返回正确的路径
      reconstructedPath = '/Users/ligf/Code/claude-code/ccdebug/ccdemo';
    } else {
      // 对于其他路径，使用通用的替换
      reconstructedPath = `/${pathWithoutLeadingDash.replace(/-/g, '/')}`;
    }
    
    dlog('调试: 重构路径 =', reconstructedPath);
    
    // 检查路径是否存在
    if (fs.existsSync(reconstructedPath)) {
      dlog('调试: 路径存在，返回:', reconstructedPath);
      return reconstructedPath;
    } else {
      dlog('调试: 路径不存在:', reconstructedPath);
      return null;
    }
  }

  /**
   * 从cc日志目录加载对话日志
   * @param fileId 文件ID
   * @returns 对话数据
   */
  async parseFile(fileId: string): Promise<any> {
    try {
      if (!this.logDir) {
        throw new Error('日志目录未设置');
      }
      let filePath: string;
      // 检查 fileId 是否已经包含路径
      if (fileId.includes('/') || fileId.includes(path.sep)) {
        // fileId 包含路径，需要添加 .jsonl 扩展名
        filePath = path.join(this.logDir, fileId);
        if (!filePath.endsWith('.jsonl')) {
          filePath = filePath + '.jsonl';
        }
      } else {
        // fileId 是简单的文件名，按原来的方式处理
        const fileName = fileId.endsWith('.jsonl') ? fileId : `${fileId}.jsonl`;
        // 从日志目录加载文件
        const logFilePath = path.join(this.logDir, fileName);
        
        if (fs.existsSync(logFilePath)) {
          filePath = logFilePath;
        } else {
          // 如果在日志目录找不到，尝试直接使用 fileId 作为绝对路径
          const directPath = fileId.endsWith('.jsonl') ? fileId : `${fileId}.jsonl`;
          if (fs.existsSync(directPath)) {
            filePath = directPath;
          } else {
            throw new Error(`文件不存在: ${logFilePath}`);
          }
        }
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const conversations = this.parseConversations(lines);
      
      // 返回所有对话的合并数据，而不是只返回第一个对话
      if (conversations.length > 0) {
        // 合并所有对话的步骤
        const allSteps: any[] = [];
        conversations.forEach(conv => {
          allSteps.push(...conv.steps);
        });
        
        // 重新分配全局步骤索引（从1开始）
        allSteps.forEach((step, index) => {
          step.originalIndex = index + 1;
        });
        
        return {
          id: fileId,
          timestamp: conversations[0].timestamp,
          steps: allSteps,
          conversationCount: conversations.length
        };
      } else {
        return {
          id: fileId,
          timestamp: new Date().toISOString(),
          steps: [],
          conversationCount: 0
        };
      }
    } catch (error) {
      console.error('解析文件失败:', error);
      throw error;
    }
  }
  /**
   * 解析JSONL文件内容为对话数据
   * @param lines JSONL文件的行数组
   * @returns 对话数据数组
   */
  parseConversations(lines: string[]): any[] {
    const conversations: any[] = [];
    let currentConversation: any | null = null;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const logEntry = JSON.parse(line);
        
        // 根据日志条目类型处理
        if (this.isConversationStart(logEntry)) {
          // 如果有当前对话，先保存
          if (currentConversation) {
            conversations.push(currentConversation);
          }
          
          // 创建新对话
          currentConversation = {
            id: this.generateConversationId(logEntry),
            timestamp: logEntry.timestamp || new Date().toISOString(),
            steps: []
          };
        }
        
        // 解析步骤
        const step = this.parseStep(logEntry);
        if (step && currentConversation) {
          // 添加原始步骤索引（从1开始）
          step.originalIndex = currentConversation.steps.length + 1;
          currentConversation.steps.push(step);
        }
        
      } catch (error) {
        console.warn('解析日志行失败:', line, error);
      }
    }
    
    // 保存最后一个对话
    if (currentConversation) {
      conversations.push(currentConversation);
    }
    
    return conversations;
  }
  
  private isConversationStart(logEntry: any): boolean {
    // 根据实际日志格式判断对话开始
    // 1. 如果有明确的conversation_start类型，使用它
    if (logEntry.type === 'conversation_start') {
      return true;
    }
    
    // 2. 如果是用户消息且没有parentUuid，认为是新对话的开始
    if (logEntry.type === 'user' && !logEntry.parentUuid) {
      return true;
    }
    
    // 3. 如果是第一条消息（没有父级UUID），也认为是对话开始
    if (!logEntry.parentUuid && logEntry.message) {
      return true;
    }
    
    return false;
  }
  
  private generateConversationId(logEntry: any): string {
    // 生成对话ID，可以基于时间戳或其他唯一标识
    return logEntry.conversation_id || 
           logEntry.id || 
           `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private parseStep(logEntry: any): any | null {
    try {
      // 跳过conversation_start、llm_request、progress、file-history-snapshot和system类型的条目
      if (logEntry.type === 'conversation_start' || logEntry.type === 'llm_request' || logEntry.type === 'progress' || logEntry.type === 'file-history-snapshot' || logEntry.type === 'system') {
        return null;
      }
      
      // 根据实际日志格式解析步骤
      const step: any = {
        id: logEntry.message_id || logEntry.uuid || logEntry.id || `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: this.determineStepType(logEntry),
        timestamp: logEntry.timestamp || new Date().toISOString(),
        content: this.extractContent(logEntry),
        metadata: this.extractMetadata(logEntry),
        // 添加可选字段
        tool_name: logEntry.tool_name,
        result: logEntry.content || logEntry.result,
        // 保存原始日志条目用于详情面板显示
        rawLogEntry: logEntry
      };
      
      // 为 agent_child 类型添加 subagent_type 和 tool_use_id 字段
      if (step.type === 'agent_child' && logEntry.message && logEntry.message.content && Array.isArray(logEntry.message.content)) {
        const toolUseItems = logEntry.message.content.filter(item => 
          item.type === 'tool_use' && 
          item.name === 'Task'
        );
        if (toolUseItems.length > 0) {
          // 设置工具名称为 Task
          step.tool_name = toolUseItems[0].name;
          
          // 设置tool_use_id
          step.tool_use_id = toolUseItems[0].id;
          
          // 设置子代理类型
          step.subagent_type = toolUseItems[0].input?.subagent_type;
          
          // 设置参数
          if (toolUseItems.length === 1) {
            step.parameters = toolUseItems[0].input;
          } else {
            step.parameters = toolUseItems.map(tool => ({
              name: tool.name,
              input: tool.input
            }));
          }
        }
      }
      
      // 为 tool_call 类型添加 parameters 和 tool_use_id 字段
      if (step.type === 'tool_call' && logEntry.message && logEntry.message.content && Array.isArray(logEntry.message.content)) {
        const toolUseItems = logEntry.message.content.filter(item => item.type === 'tool_use');
        if (toolUseItems.length > 0) {
          // 设置工具名称
          step.tool_name = toolUseItems[0].name;
          
          // 设置tool_use_id
          step.tool_use_id = toolUseItems[0].id;
          
          // 设置参数
          if (toolUseItems.length === 1) {
            step.parameters = toolUseItems[0].input;
          } else {
            step.parameters = toolUseItems.map(tool => ({
              name: tool.name,
              input: tool.input
            }));
          }
        }
      }
      
      // 为 tool_result 类型添加 tool_use_id 字段
      if (step.type === 'tool_result') {
        // 从 message.content 中提取 tool_use_id
        if (logEntry.message?.content && Array.isArray(logEntry.message.content)) {
          const toolResultItems = logEntry.message.content.filter(item => item.type === 'tool_result');
          if (toolResultItems.length > 0 && toolResultItems[0].tool_use_id) {
            step.tool_use_id = toolResultItems[0].tool_use_id;
          }
        }
        
        // 从直接字段中提取 tool_use_id（兼容其他格式）
        if (logEntry.tool_use_id) {
          step.tool_use_id = logEntry.tool_use_id;
        }
        
        // 从 tool_call_id 字段中提取（兼容测试数据格式）
        if (logEntry.tool_call_id) {
          step.tool_use_id = logEntry.tool_call_id;
        }
      }
      
      return step;
    } catch (error) {
      console.warn('解析步骤失败:', logEntry, error);
      return null;
    }
  }
  
  private determineStepType(logEntry: any): 'user_message' | 'assistant_thinking' | 'assistant_message' | 'tool_call' | 'tool_result' | 'agent_child' | 'agent_end' {
    
    // User_Query: message.role=user and (message.content is not array or message.content.type=text)
    if (logEntry.message?.role === 'user' && (typeof logEntry.message?.content === 'string' || logEntry.message?.type === 'text')) {
      return 'user_message';
    }

    // Agent_Message: message.role=assistant and message.content is array and message.content[0].type=text
    if (logEntry.message?.role === 'assistant' && Array.isArray(logEntry.message?.content) && logEntry.message?.content[0]?.type === 'text') {
      return 'assistant_message';
    }

    // Agent_Thinking: message.role=assistant and message.content is array and message.content[0].type=thinking
    if (logEntry.message?.role === 'assistant' && Array.isArray(logEntry.message?.content) && logEntry.message?.content[0]?.type === 'thinking') {
      return 'assistant_thinking';
    }

    // Agent_Child/Sub-Agent: message.role=assistant and message.content is array and contains element with type=tool_use && name=Task && input.subagent_type不为空
    if (logEntry.message?.role === 'assistant' && Array.isArray(logEntry.message?.content)) {
      const toolUseContent = logEntry.message.content.find((item: any) => 
        item.type === 'tool_use' && 
        item.name === 'Task' && 
        item.input?.subagent_type
      );
      if (toolUseContent) {
        return 'agent_child';
      }
    }

    // Tool_Result: message.role=assistant and message.content is array and message.content[0].type=tool_result
    if (logEntry.message?.role === 'user' && Array.isArray(logEntry.message?.content) && logEntry.message?.content[0]?.type === 'tool_result') {
      return 'tool_result';
    }

    // Tool_Use: message.role=assistant and message.content is array and message.content[0].type=tool_use
    if (logEntry.message?.role === 'assistant' && Array.isArray(logEntry.message?.content) && logEntry.message?.content[0]?.type === 'tool_use') {
      return 'tool_call';
    }

    // Agent_End: 暂不支持 (保持原有逻辑，可根据需要后续调整)
    if (false) {
      return 'agent_end';
    }
    
    // 默认为assistant_message
    return 'assistant_message';
  }
  
  private extractContent(logEntry: any): string {
    dlog('extractContent - 处理日志条目:', JSON.stringify(logEntry, null, 2));
    
    const stepType = this.determineStepType(logEntry);
    dlog('extractContent - 步骤类型:', stepType);
    
    // 根据节点类型分别处理
    switch (stepType) {
      case 'user_message':
        return this.extractUserMessageContent(logEntry);
      
      case 'assistant_message':
        return this.extractAssistantMessageContent(logEntry);
      
      case 'assistant_thinking':
        return this.extractAssistantThinkingContent(logEntry);
      
      case 'tool_call':
        return this.extractToolCallContent(logEntry);
      
      case 'tool_result':
        return this.extractToolResultContent(logEntry);
      
      case 'agent_child':
        return this.extractAgentChildContent(logEntry);
      
      case 'agent_end':
        return this.extractAgentEndContent(logEntry);
      
      default:
        return this.extractFallbackContent(logEntry);
    }
  }

  private extractUserMessageContent(logEntry: any): string {
    dlog('extractUserMessageContent - 处理用户消息');
    
    // 优先检查 message.content（新格式）
    if (logEntry.message?.content && typeof logEntry.message.content === 'string') {
      dlog('extractUserMessageContent - 提取用户消息内容:', logEntry.message.content);
      return logEntry.message.content;
    }
    
    // 兼容旧格式：从 request.body.messages 中提取
    if (logEntry.request?.body?.messages && Array.isArray(logEntry.request.body.messages)) {
      const userMessage = logEntry.request.body.messages.find(msg => msg.role === 'user');
      if (userMessage?.content && typeof userMessage.content === 'string') {
        dlog('extractUserMessageContent - 从request.body.messages提取用户消息内容:', userMessage.content);
        return userMessage.content;
      }
    }
    
    return this.extractFallbackContent(logEntry);
  }

  private extractAssistantMessageContent(logEntry: any): string {
    dlog('extractAssistantMessageContent - 处理助手消息');
    
    // 检查 message.content 数组格式
    if (logEntry.message?.content && Array.isArray(logEntry.message.content)) {
      // 找到第一个 text 类型的内容对象
      const textContent = logEntry.message.content.find(item => item.type === 'text');
      if (textContent?.text) {
        // 如果 text 是数组，用换行符拼接
        if (Array.isArray(textContent.text)) {
          const result = textContent.text.join('\n');
          dlog('extractAssistantMessageContent - 提取assistant消息内容(数组):', result);
          return result;
        }
        // 如果 text 是字符串，直接返回
        if (typeof textContent.text === 'string') {
          dlog('extractAssistantMessageContent - 提取assistant消息内容(字符串):', textContent.text);
          return textContent.text;
        }
      }
    }
    
    // 检查字符串格式的 message.content
    if (logEntry.message?.content && typeof logEntry.message.content === 'string') {
      dlog('extractAssistantMessageContent - 提取assistant消息内容(直接字符串):', logEntry.message.content);
      return logEntry.message.content;
    }
    
    return this.extractFallbackContent(logEntry);
  }

  private extractAssistantThinkingContent(logEntry: any): string {
    dlog('extractAssistantThinkingContent - 处理思考内容');
    // 优先处理标准数组格式：message.content 中包含 type=thinking 的内容块
    if (logEntry.message?.content && Array.isArray(logEntry.message.content)) {
      const thinkingItem = logEntry.message.content.find((item: any) => item?.type === 'thinking')
      if (thinkingItem) {
        // Anthropic/通用格式：字段可能是 thinking / text / content
        const t = thinkingItem.thinking ?? thinkingItem.text ?? thinkingItem.content
        if (Array.isArray(t)) {
          const result = t.join('\n')
          dlog('extractAssistantThinkingContent - 提取thinking内容(数组):', result)
          return result
        }
        if (typeof t === 'string') {
          dlog('extractAssistantThinkingContent - 提取thinking内容(字符串):', t)
          return t
        }
        // 其它结构，序列化为字符串
        const result = JSON.stringify(t)
        dlog('extractAssistantThinkingContent - 提取thinking内容(对象):', result)
        return result
      }
    }

    // 兼容旧格式：message.content 为字符串
    if (logEntry.message?.content && typeof logEntry.message.content === 'string') {
      dlog('extractAssistantThinkingContent - 提取思考内容(直接字符串):', logEntry.message.content);
      return logEntry.message.content;
    }

    // 找不到明确的thinking内容，回退到通用逻辑
    return this.extractFallbackContent(logEntry);
  }

  private extractToolCallContent(logEntry: any): string {
    dlog('extractToolCallContent - 处理工具调用');
    
    // 处理 message.content 数组中的 tool_use 项
    if (logEntry.message?.content && Array.isArray(logEntry.message.content)) {
      const toolUseItems = logEntry.message.content.filter(item => item.type === 'tool_use');
      if (toolUseItems.length > 0) {
        if (toolUseItems.length === 1) {
          const tool = toolUseItems[0];
          const result = JSON.stringify({
            name: tool.name,
            id: tool.id,
            input: tool.input
          }, null, 2);
          dlog('extractToolCallContent - 单个工具调用:', result);
          return result;
        } else {
          const toolInfo = toolUseItems.map(tool => ({
            name: tool.name,
            id: tool.id,
            input: tool.input
          }));
          const result = JSON.stringify(toolInfo, null, 2);
          dlog('extractToolCallContent - 多个工具调用:', result);
          return result;
        }
      }
    }
    
    // 处理旧格式的工具调用
    if (logEntry.tool_name && logEntry.input) {
      const result = JSON.stringify({
        name: logEntry.tool_name,
        input: logEntry.input
      }, null, 2);
      dlog('extractToolCallContent - 旧格式工具调用:', result);
      return result;
    }
    
    return this.extractFallbackContent(logEntry);
  }

  private extractToolResultContent(logEntry: any): string {
    dlog('extractToolResultContent - 处理工具结果');
    
    // 优先使用 toolUseResult 中的原始内容
    if (logEntry.toolUseResult) {
      // 优先使用 file.content（文件内容）
      if (logEntry.toolUseResult.file?.content) {
        dlog('extractToolResultContent - 提取toolUseResult.file.content:', logEntry.toolUseResult.file.content);
        return logEntry.toolUseResult.file.content;
      }
      
      // 其次使用 stdout
      if (logEntry.toolUseResult.stdout) {
        dlog('extractToolResultContent - 提取toolUseResult.stdout:', logEntry.toolUseResult.stdout);
        return logEntry.toolUseResult.stdout;
      }
      
      // 最后使用 stderr
      if (logEntry.toolUseResult.stderr) {
        dlog('extractToolResultContent - 提取toolUseResult.stderr:', logEntry.toolUseResult.stderr);
        return logEntry.toolUseResult.stderr;
      }
    }
    
    // 处理 message.content 数组中的 tool_result 项（作为备选）
    if (logEntry.message?.content && Array.isArray(logEntry.message.content)) {
      const toolResultItems = logEntry.message.content.filter(item => item.type === 'tool_result');
      if (toolResultItems.length > 0) {
        if (toolResultItems.length === 1) {
          const result = toolResultItems[0];
          if (typeof result.content === 'string') {
            dlog('extractToolResultContent - 提取tool_result内容(字符串):', result.content);
            return result.content;
          } else if (Array.isArray(result.content)) {
            const content = result.content.map(c => c.text || c).join('\n');
            dlog('extractToolResultContent - 提取tool_result内容(数组):', content);
            return content;
          }
          return JSON.stringify(result.content, null, 2);
        } else {
          const contents = toolResultItems.map(item => {
            if (typeof item.content === 'string') {
              return item.content;
            } else if (Array.isArray(item.content)) {
              return item.content.map(c => c.text || c).join('\n');
            }
            return JSON.stringify(item.content, null, 2);
          });
          dlog('extractToolResultContent - 提取tool_result内容(多个):', contents.join('\n---\n'));
          return contents.join('\n---\n');
        }
      }
    }
    
    // 处理旧格式的工具结果
    if (logEntry.content) {
      dlog('extractToolResultContent - 旧格式工具结果:', logEntry.content);
      return typeof logEntry.content === 'string' ? logEntry.content : JSON.stringify(logEntry.content);
    }
    
    return this.extractFallbackContent(logEntry);
  }

  private extractAgentChildContent(logEntry: any): string {
    dlog('extractAgentChildContent - 处理子代理内容');
    
    // 子代理内容处理逻辑与普通助手消息类似
    return this.extractAssistantMessageContent(logEntry);
  }

  private extractAgentEndContent(logEntry: any): string {
    dlog('extractAgentEndContent - 处理代理结束');
    
    // 代理结束通常包含最终回复
    return this.extractAssistantMessageContent(logEntry);
  }

  private extractFallbackContent(logEntry: any): string {
    dlog('extractFallbackContent - 使用备用提取逻辑');
    
    // 通用内容提取逻辑
    if (logEntry.content) {
      return typeof logEntry.content === 'string' ? logEntry.content : JSON.stringify(logEntry.content);
    }
    
    if (logEntry.message) {
      return typeof logEntry.message === 'string' ? logEntry.message : JSON.stringify(logEntry.message);
    }
    
    if (logEntry.text) {
      return logEntry.text;
    }
    
    // 如果没有明确的内容字段，返回整个对象的字符串表示
    return JSON.stringify(logEntry, null, 2);
  }
  
  private extractMetadata(logEntry: any): Record<string, any> {
    // 提取元数据
    const metadata: Record<string, any> = {};
    
    // 复制一些常见的元数据字段
    const metadataFields = ['tool_name', 'function_name', 'duration', 'status', 'error', 'model', 'tokens'];
    
    for (const field of metadataFields) {
      if (logEntry[field] !== undefined) {
        metadata[field] = logEntry[field];
      }
    }
    
    // 为tool_result类型添加success字段判断
    if (this.determineStepType(logEntry) === 'tool_result') {
      // 判断tool_result是否成功
      // 1. 如果有明确的status字段，使用它
      if (logEntry.status !== undefined) {
        metadata.success = logEntry.status === 'success' || logEntry.status === 'completed';
      }
      // 2. 如果有error字段，则认为失败
      else if (logEntry.error !== undefined && logEntry.error !== null) {
        metadata.success = false;
      }
      // 3. 如果有content且不为空，则认为成功
      else if (logEntry.content !== undefined && logEntry.content !== null && logEntry.content !== '') {
        metadata.success = true;
      }
      // 4. 检查message.content中的tool_result项
      else if (logEntry.message?.content && Array.isArray(logEntry.message.content)) {
        const toolResultItems = logEntry.message.content.filter(item => item.type === 'tool_result');
        if (toolResultItems.length > 0) {
          // 如果有tool_result项且有内容，认为成功
          metadata.success = toolResultItems.some(item => 
            item.content !== undefined && item.content !== null && item.content !== ''
          );
        } else {
          metadata.success = true; // 默认成功
        }
      }
      // 5. 默认情况下认为成功
      else {
        metadata.success = true;
      }
    }
    
    return metadata;
  }
  
  /**
   * 根据文件ID获取对话数据
   * @param fileId 文件ID
   * @param lines 文件内容行
   * @returns 对话数据数组
   */
  getConversationsByFileId(fileId: string, lines: string[]): any[] {
    const conversations = this.parseConversations(lines);
    
    // 为每个对话添加文件ID信息
    return conversations.map(conv => ({
      ...conv,
      id: `${fileId}_${conv.id}`
    }));
  }
}