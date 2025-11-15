const fs = require('fs');
const path = require('path');
const os = require('os');

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
    // 根据实际规律：将路径中的所有 '/'、'\'、'_'、':' 和空格替换为 '-'，同时将非 ASCII 字符（如中文）也替换为 '-'
    // 例如："/Users/ligf/Code/claude-code/ccdebug/ccdemo" -> "-Users-ligf-Code-claude-code-ccdebug-ccdemo"
    // 例如："/Users/ligf/Code/项目/测试" -> "-Users-ligf-Code------"
    // 例如："D:\mysoft\CC客服" -> "-D--mysoft-CC--"
    // 例如："C:\Program Files\MyApp" -> "-C--Program-Files-MyApp"
    return projectPath.replace(/[\/\\_:\s]/g, '-').replace(/[^\x00-\x7F]/g, '-');
  }
}