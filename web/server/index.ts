const { WebServer } = require('./web-server.js');
const path = require('path');

export { WebServer };
export type { WebServerConfig } from './web-server.js';
export { LogFileManager } from './log-file-manager.js';
export { ConversationParser } from './conversation-parser.js';

/**
 * 启动Web服务器的便捷函数
 * @param config 服务器配置对象
 * @returns WebServer实例
 */
export async function startWebServer(config: any): Promise<any> {
  const server = new WebServer(config);
  await server.start();
  return server;
}

/**
 * 命令行启动函数
 */
export async function startFromCLI(): Promise<void> {
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
    
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则启动服务器
if (process.argv[1] === __filename) {
  startFromCLI();
}