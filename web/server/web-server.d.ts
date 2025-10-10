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
    constructor(config: WebServerConfig);
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