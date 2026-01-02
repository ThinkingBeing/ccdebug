// 日志文件信息接口
export interface LogFileInfo {
  id: string;           // 文件唯一标识
  name: string;         // 文件名
  path: string;         // 完整文件路径
  modifiedAt: Date;     // 修改时间
  size: number;         // 文件大小
}

// 子Agent日志信息接口
export interface AgentLogInfo {
  id: string;              // 文件ID（agent-{agentId}）
  name: string;            // 文件名
  path: string;            // 文件路径
  agentId: string;         // Agent ID
  agentName: string;       // Agent名称（subagent_type）
  agentDescription: string; // Agent描述（subagent description）
}

// 主日志摘要信息接口
export interface MainLogSummary {
  id: string;              // 文件ID（不含.jsonl后缀的sessionId）
  name: string;            // 文件名
  path: string;            // 文件完整路径
  startTime: string;       // 会话开始时间（第一条日志的timestamp）
  endTime: string;         // 会话结束时间（最后一条日志的timestamp）
  inputPreview: string;    // 会话输入消息预览（截取前50字符）
  inputFull: string;       // 会话输入消息完整内容
  agentLogs: AgentLogInfo[]; // 关联的子agent日志列表
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
  tool_use_id?: string; // 工具使用ID，用于关联tool_call和tool_result
  parameters?: any;    // 工具参数，用于tool_call类型
  subagent_type?: string; // 子代理类型
  result?: string;     // 工具结果，用于tool_result类型
  rawLogEntry?: any;   // 原始日志条目，用于详情面板显示完整JSON
  originalIndex?: number; // 原始步骤索引（从1开始）
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

// 可用项目信息接口
export interface AvailableProjectInfo {
  path: string;         // 项目完整路径
  name: string;         // 项目名称（目录名）
  isDefault: boolean;   // 是否为启动时的默认项目
}

// 项目列表API响应
export interface ProjectsApiResponse {
  projects: AvailableProjectInfo[];
  defaultProject: string;
  projectsDir: string;
}

// 搜索结果项
export interface SearchResultItem {
  stepId: string;           // 步骤ID
  stepType: string;         // 步骤类型
  stepIndex: number;        // 步骤序号
  timestamp: string;        // 时间戳
  matchedContent: string;   // 匹配的内容片段
  matchedField: string;     // 匹配的字段路径（如 content、metadata.xxx）
  fileId: string;           // 所属文件ID
  fileName: string;         // 文件名称
  tool_use_id?: string;     // 工具调用ID（用于关联 tool_call/tool_result 和 agent_child）
}

// 文件级搜索结果
export interface FileSearchResult {
  fileId: string;           // 文件ID
  fileName: string;         // 文件名称
  isSubAgent: boolean;      // 是否为子代理日志
  resultCount: number;      // 结果数量
  results: SearchResultItem[]; // 搜索结果列表
}