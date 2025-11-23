export declare class LogFileManager {
    private logDir;
    private fileWatcher;
    constructor(logDir?: string);
    private getUserHome;
    private getClaudeProjectsDir;
    /**
     * 根据项目路径解析对应的日志目录
     * @param projectPath 项目路径
     * @returns 日志目录路径
     */
    resolveLogDirectory(projectPath: string): string;
    private generateProjectId;
    /**
     * 获取指定目录下的所有 JSONL 文件
     * @param logDir 日志目录路径
     * @returns 日志文件信息数组
     */
    getAvailableLogFiles(logDir: string): Promise<any[]>;
    /**
     * 获取日志目录中的所有日志文件
     */
    getLogFiles(): any[];
    /**
     * 读取日志文件内容
     */
    readLogFile(filePath: string): string;
    /**
     * 获取项目信息
     */
    getProjectInfo(): {
        name: string;
        path: string;
    };
    /**
     * 获取系统信息
     */
    getSystemInfo(): {
        platform: any;
        arch: any;
        nodeVersion: string;
        hostname: any;
        userInfo: any;
    };
    /**
     * 检查文件是否存在
     */
    fileExists(filePath: string): boolean;
    /**
     * 获取文件统计信息
     */
    getFileStats(filePath: string): any;
    /**
     * 创建目录（如果不存在）
     */
    ensureDirectory(dirPath: string): void;
    /**
     * 监听日志目录变化
     */
    watchLogDirectory(logDir: string, callback: (event: string, filename: string, filepath?: string) => void): any | null;
    /**
     * 根据子agent日志文件名在主日志中查找对应的subagent_type
     * @param agentLogPath 子agent日志文件路径
     * @param mainLogPath 主日志文件路径
     * @returns Agent名称和描述
     */
    resolveAgentName(agentLogPath: string, mainLogPath: string): Promise<{
        name: string;
        description: string;
    }>;
    /**
     * 在主日志行中查找指定 tool_use_id 的 tool_use 块
     * @param mainLogLines 主日志所有行
     * @param toolUseId 工具使用ID
     * @returns tool_use 块或 null
     */
    private findToolUseById;
    /**
     * 提取日志文件的第一条用户消息作为预览
     * @param logLines 日志文件所有行
     * @returns 预览和完整内容
     */
    private extractInputPreview;
    /**
     * 获取指定会话的所有子agent日志
     * @param logDir 日志目录
     * @param sessionId 会话ID
     * @returns 子agent日志信息数组
     */
    getAgentLogsForSession(logDir: string, sessionId: string): Promise<any[]>;
    /**
     * 获取所有主日志的摘要信息
     * @param logDir 日志目录
     * @returns 主日志摘要数组
     */
    getMainLogSummaries(logDir: string): Promise<any[]>;
}
//# sourceMappingURL=log-file-manager.d.ts.map