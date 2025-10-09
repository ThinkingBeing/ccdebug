#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 获取命令行参数
const logFilePath = process.argv[2];

if (!logFilePath) {
    console.log('用法: node rename-log.js <日志文件路径>');
    console.log('示例: node rename-log.js /path/to/logfile.jsonl');
    process.exit(1);
}

// 检查文件是否存在
if (!fs.existsSync(logFilePath)) {
    console.log(`错误: 文件不存在 - ${logFilePath}`);
    process.exit(1);
}

try {
    // 读取文件第一行
    const fileContent = fs.readFileSync(logFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
        console.log('错误: 日志文件为空');
        process.exit(1);
    }

    // 解析第一条记录
    const firstRecord = JSON.parse(lines[0]);
    
    // 提取 user_id
    const userId = firstRecord?.request?.body?.metadata?.user_id;
    if (!userId) {
        console.log('错误: 在第一条记录中未找到 request.body.metadata.user_id');
        process.exit(1);
    }

    // 从 user_id 中提取 sessionid (格式: xxxx_session_{sessionid})
    const sessionMatch = userId.match(/_session_([^_]+)$/);
    if (!sessionMatch || !sessionMatch[1]) {
        console.log(`错误: 无法从 user_id 中提取 sessionid: ${userId}`);
        process.exit(1);
    }

    const sessionId = sessionMatch[1];
    const logDir = path.dirname(logFilePath);
    const newLogFile = path.join(logDir, `${sessionId}.jsonl`);

    // 重命名文件
    fs.renameSync(logFilePath, newLogFile);
    console.log(`成功: 文件已重命名为 ${sessionId}.jsonl`);
    console.log(`原文件: ${logFilePath}`);
    console.log(`新文件: ${newLogFile}`);

} catch (error) {
    console.log(`错误: ${error.message}`);
    process.exit(1);
}