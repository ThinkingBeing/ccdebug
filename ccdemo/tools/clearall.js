#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// 获取当前脚本文件所在目录
const scriptDir = __dirname;
process.chdir(scriptDir);

// 将当前项目目录路径转换成cc日志目录路径
// 转换规则：将目录路径中所有非ASCII字符替换成横杠"-"
const projectPath = path.resolve(scriptDir, '..');
console.log(`项目根目录: ${projectPath}`);

// 路径转换：将目录路径中的 / 和 _ 替换成横杠"-"，非ASCII字符也替换成横杠
const escapedPath = projectPath
    .replace(/[\/_]/g, '-').replace(/[^\x00-\x7F]/g, '-');

const ccLogDir = path.join(os.homedir(), '.claude', 'projects', escapedPath);

console.log(`Claude日志目录: ${ccLogDir}`);

// 注释掉 exit，继续执行清理操作
// process.exit(0);

// 删除文件或目录的辅助函数
function removeIfExists(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
            console.log(`已删除: ${filePath}`);
        }
    } catch (error) {
        console.error(`删除失败 ${filePath}:`, error.message);
    }
}

// 删除目录下所有文件但保留目录
function clearDirectory(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                removeIfExists(filePath);
            });
            console.log(`已清空目录: ${dirPath}`);
        }
    } catch (error) {
        console.error(`清空目录失败 ${dirPath}:`, error.message);
    }
}

// 删除指定模式的文件
function removeFilesByPattern(dirPath, pattern) {
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                if (file.endsWith(pattern)) {
                    const filePath = path.join(dirPath, file);
                    removeIfExists(filePath);
                }
            });
        }
    } catch (error) {
        console.error(`删除文件失败 ${dirPath}/${pattern}:`, error.message);
    }
}

// 清理code目录
console.log("清理code目录");
const codeDir = path.resolve(scriptDir, '../code');
removeFilesByPattern(path.join(codeDir, 'AppForm'), '.json');
removeFilesByPattern(path.join(codeDir, 'AppGrid'), '.json');
removeFilesByPattern(path.join(codeDir, 'Entity'), '.json');
removeFilesByPattern(path.join(codeDir, 'FunctionPage'), '.json');
removeFilesByPattern(path.join(codeDir, 'MyFunction'), '.json');
removeFilesByPattern(path.join(codeDir, 'ParamType'), '.json');
removeFilesByPattern(path.join(codeDir, 'Param'), '.json');

// 清理specs目录
console.log("清理specs目录");
const specsDir = path.resolve(scriptDir, '../specs/');
clearDirectory(specsDir);

// 清理conversation目录
console.log("清理conversation目录");
const conversationDir = path.resolve(scriptDir, '../conversation');
removeFilesByPattern(conversationDir, '.json');

// 清理Claude日志目录
console.log("清理当前项目的cc日志文件");
clearDirectory(ccLogDir);

// 清理trace日志文件
console.log("清理claude-trace日志文件");
const traceDir = path.resolve(scriptDir, '../.claude-trace');
clearDirectory(traceDir);

console.log("所有清理操作完成！");