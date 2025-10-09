const fs = require('fs');
const path = require('path');
const os = require('os');
// import { LogFileInfo } from '../src/types/index.js';

export class LogFileManager {
  private logDir: string;
  private fileWatcher: any = null;

  constructor(logDir?: string) {
    this.logDir = logDir || '';
  }

  private getUserHome(): string {
    return os.homedir();
  }

  private getClaudeProjectsDir(): string {
    return path.join(this.getUserHome(), '.claude', 'projects');
  }

  /**
   * 根据项目路径解析对应的日志目录
   * @param projectPath 项目路径
   * @returns 日志目录路径
   */
  resolveLogDirectory(projectPath: string): string {
    // 1. 获取项目目录的绝对路径
    const absoluteProjectPath = path.resolve(projectPath);
    // 2. 根据实际规律生成项目目录标识
    const projectId = this.generateProjectId(absoluteProjectPath);
    // 3. 构建对应的日志目录路径
    const logDir = path.join(this.getClaudeProjectsDir(), projectId);
    return logDir;
  }

  private generateProjectId(projectPath: string): string {
    // 根据实际规律：将路径中的所有 '/' 替换为 '-'，同时将非 ASCII 字符（如中文）也替换为 '-'
    // 例如："/Users/ligf/Code/claude-code/ccdebug/ccdemo" -> "-Users-ligf-Code-claude-code-ccdebug-ccdemo"
    // 例如："/Users/ligf/Code/项目/测试" -> "-Users-ligf-Code---"
    return projectPath.replace(/\//g, '-').replace(/[^\x00-\x7F]/g, '-');
  }

  /**
   * 获取指定目录下的所有 JSONL 文件
   * @param logDir 日志目录路径
   * @returns 日志文件信息数组
   */
  async getAvailableLogFiles(logDir: string): Promise<any[]> {
    if (!fs.existsSync(logDir)) {
      console.warn(`日志目录不存在: ${logDir}`);
      return [];
    }
    
    const files = await fs.promises.readdir(logDir);
    const logFiles: any[] = [];
    
    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const filepath = path.join(logDir, file);
        const stats = await fs.promises.stat(filepath);
        
        logFiles.push({
          id: file.replace('.jsonl', ''),
          name: file,
          path: filepath,
          modifiedAt: stats.mtime,
          size: stats.size
        });
      }
    }
    
    // 按修改时间降序排序，最新的在前面
    return logFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }

  /**
   * 获取日志目录中的所有日志文件
   */
  getLogFiles(): any[] {
    try {
      if (!fs.existsSync(this.logDir)) {
        console.log(`日志目录不存在: ${this.logDir}`);
        return [];
      }

      const files = fs.readdirSync(this.logDir);
      const logFiles: any[] = [];

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filepath = path.join(this.logDir, file);
          const stats = fs.statSync(filepath);
          
          logFiles.push({
          id: file.replace('.jsonl', ''),
          name: file,
          path: filepath,
          modifiedAt: stats.mtime,
          size: stats.size
        });
        }
      }

      // 按修改时间排序，最新的在前
      return logFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    } catch (error) {
      console.error('获取日志文件失败:', error);
      return [];
    }
  }

  /**
   * 读取日志文件内容
   */
  readLogFile(filePath: string): string {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('读取日志文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目信息
   */
  getProjectInfo(): { name: string; path: string } {
    const projectName = path.basename(this.logDir);
    return {
      name: projectName,
      path: this.logDir
    };
  }

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      hostname: os.hostname(),
      userInfo: os.userInfo()
    };
  }

  /**
   * 检查文件是否存在
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * 获取文件统计信息
   */
  getFileStats(filePath: string) {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      console.error('获取文件统计信息失败:', error);
      return null;
    }
  }

  /**
   * 创建目录（如果不存在）
   */
  ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 监听日志目录变化
   */
  watchLogDirectory(logDir: string, callback: (event: string, filename: string, filepath?: string) => void): any | null {
    if (!fs.existsSync(logDir)) {
      console.warn(`无法监听不存在的目录: ${logDir}`);
      return null;
    }
    
    const watcher = fs.watch(logDir, { persistent: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.jsonl')) {
        const filepath = path.join(logDir, filename);
        callback(eventType, filename, filepath);
      }
    });
    
    console.log(`开始监听日志目录: ${logDir}`);
    return watcher;
  }
}