// 日志文件信息接口
export interface LogFileInfo {
  id: string;           // 文件唯一标识
  name: string;         // 文件名
  path: string;         // 完整文件路径
  modifiedAt: Date;     // 修改时间
  size: number;         // 文件大小
}

// 项目信息接口
export interface ProjectInfo {
  path: string;         // 项目路径
  logDir: string;       // 日志目录
}

// 对话数据接口
export interface ConversationData {
  id: string;
  timestamp: string;
  steps: ConversationStep[];
  conversationCount?: number;  // 可选字段，表示包含的对话数量
}

// 对话步骤接口
export interface ConversationStep {
  id: string;
  type: 'user_message' | 'assistant_thinking' | 'assistant_message' | 'tool_call' | 'tool_result' | 'agent_child' | 'agent_end';
  timestamp: string;
  content: string;
  metadata?: Record<string, any>;
  tool_name?: string;  // 工具名称，用于tool_call类型
  result?: string;     // 工具结果，用于tool_result类型
  parameters?: any;    // 工具参数，用于tool_call类型
  tool_use_id?: string; // 工具使用ID，用于关联tool_call和tool_result
  rawLogEntry?: any;   // 原始日志条目，用于详情面板显示完整JSON
}

// 时间线项目接口
export interface TimelineItem {
  id: string;
  type: 'conversation' | 'step';
  timestamp: string;
  title: string;
  description?: string;
  data: ConversationData | ConversationStep;
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 文件列表API响应
export interface FilesApiResponse {
  files: LogFileInfo[];
  latest: string | null;
  projectDir: string;
  logDir: string;
}

export interface WebSocketEvent {
  event: string;
  data: any;
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'connection' | 'file:updated' | 'project:changed' | 'error';
  data: {
    eventType?: string;
    filename?: string;
    fileId?: string;
    files?: LogFileInfo[];
    conversations?: ConversationData[];
    message?: string;
    timestamp: string;
  };
  timestamp: string;
}