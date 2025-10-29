#!/usr/bin/env node

/**
 * Claude Code Session ID 获取工具
 * 用于在Agent执行过程中获取当前会话的SessionID
 * 作者: Agent开发工具
 * 用法: node get_session_id.js [选项]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 显示帮助信息
function showHelp() {
    console.log("Claude Code Session ID 获取工具");
    console.log("");
    console.log("用法: node get_session_id.js [选项]");
    console.log("");
    console.log("选项:");
    console.log("  -h, --help     显示此帮助信息");
    console.log("  -v, --verbose  显示详细信息");
    console.log("  -p, --path     指定项目路径 (默认为当前目录)");
    console.log("");
    console.log("示例:");
    console.log("  node get_session_id.js                    # 获取当前项目的SessionID");
    console.log("  node get_session_id.js -v                 # 显示详细获取过程");
    console.log("  node get_session_id.js -p /path/to/proj   # 获取指定项目的SessionID");
    console.log("");
}

// 解析命令行参数
function parseArgs() {
    const args = {
        verbose: false,
        projectPath: process.cwd(),
        help: false
    };

    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        switch (arg) {
            case '-h':
            case '--help':
                args.help = true;
                break;
            case '-v':
            case '--verbose':
                args.verbose = true;
                break;
            case '-p':
            case '--path':
                if (i + 1 < process.argv.length) {
                    args.projectPath = process.argv[i + 1];
                    i++;
                } else {
                    console.error("错误: --path 选项需要提供路径参数");
                    process.exit(1);
                }
                break;
            default:
                console.error(`未知选项: ${arg}`);
                console.error("使用 node get_session_id.js --help 查看帮助");
                process.exit(1);
        }
    }

    return args;
}

// 将项目路径转换为Claude项目目录格式
function convertPathToClaudeFormat(projectPath) {
    return projectPath.replace(/[\/_]/g, '-');
}

// 查找匹配的Claude项目目录
function findClaudeProjectDir(targetPath, claudeProjectsPath) {
    try {
        // 首先尝试精确匹配
        const exactPath = path.join(claudeProjectsPath, targetPath);
        if (fs.existsSync(exactPath)) {
            return targetPath;
        }

        // 模糊匹配，查找包含关键部分的目录
        // 修改：使用转换后的路径的最后部分作为项目名
        const convertedName = path.basename(targetPath);
        const dirs = fs.readdirSync(claudeProjectsPath);
        
        // 改进匹配逻辑：尝试多种匹配方式
        // 1. 直接包含项目名
        let matchingDir = dirs.find(dir => dir.includes(convertedName));
        
        // 2. 如果没找到，尝试反向匹配 - 项目目录是否包含Claude目录名的部分
        if (!matchingDir) {
            matchingDir = dirs.find(dir => convertedName.includes(dir.split('-').pop()));
        }
        
        // 3. 如果还是没找到，尝试匹配目录的最后一部分
        if (!matchingDir && dirs.length > 0) {
            // 按时间排序，返回最新的目录作为备选
            const sortedDirs = dirs.map(dir => ({
                name: dir,
                time: fs.statSync(path.join(claudeProjectsPath, dir)).mtime
            })).sort((a, b) => b.time - a.time);
            matchingDir = sortedDirs[0]?.name || null;
        }
        
        return matchingDir || null;
    } catch (error) {
        console.error(`查找项目目录时出错: ${error.message}`);
        return null;
    }
}

// 验证SessionID格式
function validateSessionId(sessionId) {
    // UUID格式验证 (8-4-4-4-12)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    return uuidRegex.test(sessionId);
}

// 获取SessionID的主要逻辑
function getSessionId(projectPath, verbose = false) {
    if (verbose) {
        console.error("正在获取SessionID...");
        console.error(`项目路径: ${projectPath}`);
    }

    // 检查Claude目录是否存在
    const claudeProjectsPath = path.join(os.homedir(), '.claude', 'projects');
    if (!fs.existsSync(claudeProjectsPath)) {
        console.error("错误: 未找到Claude项目目录 (~/.claude/projects)");
        console.error("请确保Claude Code已正确安装并初始化");
        process.exit(1);
    }

    // 转换路径格式
    const convertedPath = convertPathToClaudeFormat(projectPath);
    if (verbose) {
        console.error(`转换后的路径: ${convertedPath}`);
    }

    // 查找Claude项目目录
    const claudeProjectDir = findClaudeProjectDir(convertedPath, claudeProjectsPath);

    if (!claudeProjectDir) {
        console.error("错误: 未找到匹配的Claude项目目录");
        if (verbose) {
            console.error("可用的项目目录:");
            try {
                const dirs = fs.readdirSync(claudeProjectsPath);
                dirs.forEach(dir => console.error(`  ${dir}`));
            } catch (error) {
                console.error("  无法读取项目目录");
            }
        }
        process.exit(1);
    }

    if (verbose) {
        console.error(`找到Claude项目目录: ${claudeProjectDir}`);
    }

    // 获取最新的会话文件
    const projectDir = path.join(claudeProjectsPath, claudeProjectDir);
    let sessionFiles;
    try {
        sessionFiles = fs.readdirSync(projectDir)
            .filter(file => file.endsWith('.jsonl'))
            .map(file => ({
                name: file,
                time: fs.statSync(path.join(projectDir, file)).mtime
            }))
            .sort((a, b) => b.time - a.time);
    } catch (error) {
        console.error("错误: 无法读取会话文件");
        process.exit(1);
    }

    if (sessionFiles.length === 0) {
        console.error("错误: 未找到会话文件");
        process.exit(1);
    }

    const latestSessionFile = sessionFiles[0].name;
    // 提取SessionID (去掉.jsonl扩展名)
    const sessionId = latestSessionFile.replace(/\.jsonl$/, '');

    if (verbose) {
        console.error(`会话文件: ${latestSessionFile}`);
        console.error(`SessionID: ${sessionId}`);
    }

    return sessionId;
}

// 主执行逻辑
function main() {
    const args = parseArgs();

    if (args.help) {
        showHelp();
        process.exit(0);
    }

    // 检查项目路径是否存在
    if (!fs.existsSync(args.projectPath)) {
        console.error(`错误: 项目路径不存在: ${args.projectPath}`);
        process.exit(1);
    }

    try {
        // 获取SessionID
        const sessionId = getSessionId(args.projectPath, args.verbose);

        // 验证SessionID格式
        if (validateSessionId(sessionId)) {
            if (!args.verbose) {
                console.log(sessionId);
            }
            process.exit(0);
        } else {
            console.error(`错误: 获取到的SessionID格式无效: ${sessionId}`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`错误: ${error.message}`);
        process.exit(1);
    }
}

// 执行主函数
if (require.main === module) {
    main();
}

module.exports = { getSessionId, validateSessionId };