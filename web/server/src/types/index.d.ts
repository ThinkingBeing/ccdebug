export interface LogFileInfo {
    id: string;
    name: string;
    path: string;
    modifiedAt: Date;
    size: number;
}
export interface ProjectInfo {
    path: string;
    logDir: string;
}
export interface ConversationData {
    id: string;
    timestamp: string;
    steps: ConversationStep[];
    conversationCount?: number;
}
export interface ConversationStep {
    id: string;
    type: 'user_message' | 'assistant_thinking' | 'assistant_message' | 'tool_call' | 'tool_result' | 'agent_child' | 'agent_end';
    timestamp: string;
    content: string;
    metadata?: Record<string, any>;
    tool_name?: string;
    result?: string;
    parameters?: any;
    tool_use_id?: string;
    rawLogEntry?: any;
}
export interface TimelineItem {
    id: string;
    type: 'conversation' | 'step';
    timestamp: string;
    title: string;
    description?: string;
    data: ConversationData | ConversationStep;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
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
//# sourceMappingURL=index.d.ts.map