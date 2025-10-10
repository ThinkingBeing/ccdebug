"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationParser = exports.LogFileManager = exports.WebServer = void 0;
exports.startWebServer = startWebServer;
exports.startFromCLI = startFromCLI;
const { WebServer } = require('./web-server.js');
exports.WebServer = WebServer;
const path = require('path');
var log_file_manager_js_1 = require("./log-file-manager.js");
Object.defineProperty(exports, "LogFileManager", { enumerable: true, get: function () { return log_file_manager_js_1.LogFileManager; } });
var conversation_parser_js_1 = require("./conversation-parser.js");
Object.defineProperty(exports, "ConversationParser", { enumerable: true, get: function () { return conversation_parser_js_1.ConversationParser; } });
/**
 * 启动Web服务器的便捷函数
 * @param config 服务器配置对象
 * @returns WebServer实例
 */
async function startWebServer(config) {
    const server = new WebServer(config);
    await server.start();
    return server;
}
/**
 * 命令行启动函数
 */
async function startFromCLI() {
    const args = process.argv.slice(2);
    const projectDir = args[0] || '/Users/ligf/Code/claude-code/ccdebug/ccdemo';
    const port = parseInt(args[1]) || 3001;
    const staticDir = args[2] || './dist';
    console.log('启动参数:', { projectDir, port, staticDir });
    try {
        const server = await startWebServer({
            projectDir,
            port,
            staticDir: staticDir ? path.resolve(staticDir) : undefined
        });
        console.log(`Web服务器已启动: ${server.getUrl()}`);
        // 优雅关闭处理
        process.on('SIGINT', async () => {
            console.log('\n正在关闭服务器...');
            await server.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\n正在关闭服务器...');
            await server.stop();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
}
// 如果直接运行此文件，则启动服务器
if (process.argv[1] === __filename) {
    startFromCLI();
}
//# sourceMappingURL=index.js.map