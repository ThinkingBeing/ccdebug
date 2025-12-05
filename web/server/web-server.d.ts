export interface WebServerConfig {
    projectDir: string;
    port: number;
    staticDir: string;
}
export declare class WebServer {
    private app;
    private server;
    private io;
    private logFileManager;
    private conversationParser;
    private config;
    private isStarted;
    private anthropic;
    private logDir;
    private fileWatcher;
    /**
     * 按优先级获取ANTHROPIC_AUTH_TOKEN
     * 1. 从项目目录的.claude/settings.local.json获取
     * 2. 从全局Claude目录的settings.local.json获取
     * 3. 从全局环境变量获取
     */
    private getAuthToken;
    constructor(config: WebServerConfig);
    /**
     * 确定日志目录路径
     * @param projectDir 项目目录路径
     * @returns 日志目录路径
     */
    private determineLogDirectory;
    private setupBasicMiddleware;
    private setupStaticFiles;
    private setupRoutes;
    private setupWebSocket;
    private setupFileWatcher;
    start(): Promise<void>;
    stop(): Promise<void>;
    getUrl(): string;
    /**
     * 解析SSE格式的数据
     * @param sseData SSE格式的原始数据
     * @returns 解析后的事件数组
     */
    private parseSSEData;
    private transformSSEEvents;
}
//# sourceMappingURL=web-server.d.ts.map