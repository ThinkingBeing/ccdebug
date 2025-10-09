import { WebServer } from './web-server.js';
import type { WebServerConfig } from './web-server.js';
export { WebServer };
export type { WebServerConfig };
export { LogFileManager } from './log-file-manager.js';
export { ConversationParser } from './conversation-parser.js';
/**
 * 启动Web服务器的便捷函数
 * @param config 服务器配置对象
 * @returns WebServer实例
 */
export declare function startWebServer(config: WebServerConfig): Promise<WebServer>;
/**
 * 命令行启动函数
 */
export declare function startFromCLI(): Promise<void>;
//# sourceMappingURL=index.d.ts.map