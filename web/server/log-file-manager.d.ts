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
}
//# sourceMappingURL=log-file-manager.d.ts.map