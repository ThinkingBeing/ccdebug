#!/usr/bin/env node

/**
 * CCDebug 项目打包脚本 (Node.js 版本)
 * 用于生成可分发的 npm 包
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出函数
const colors = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`
};

function log(message, color = null) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    if (color && colors[color]) {
        console.log(colors[color](`${prefix} ${message}`));
    } else {
        console.log(`${prefix} ${message}`);
    }
}

function execCommand(command, cwd = process.cwd()) {
    try {
        log(`执行命令: ${command}`, 'cyan');
        const result = execSync(command, { 
            cwd, 
            stdio: 'pipe',
            encoding: 'utf8'
        });
        return result;
    } catch (error) {
        log(`命令执行失败: ${command}`, 'red');
        log(`错误信息: ${error.message}`, 'red');
        throw error;
    }
}

function checkCommand(command) {
    try {
        execSync(`which ${command}`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        log(`源路径不存在: ${src}`, 'yellow');
        return;
    }

    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        for (const file of files) {
            copyRecursive(
                path.join(src, file),
                path.join(dest, file)
            );
        }
    } else {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
}

function getDirectorySize(dirPath) {
    let size = 0;
    
    function calculateSize(filePath) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(filePath);
            for (const file of files) {
                calculateSize(path.join(filePath, file));
            }
        } else {
            size += stat.size;
        }
    }
    
    if (fs.existsSync(dirPath)) {
        calculateSize(dirPath);
    }
    
    return size;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
    try {
        log('🚀 开始打包 CCDebug 项目...', 'green');

        // 检查必要工具
        if (!checkCommand('npm')) {
            log('❌ 错误: npm 未安装', 'red');
            process.exit(1);
        }

        if (!checkCommand('node')) {
            log('❌ 错误: Node.js 未安装', 'red');
            process.exit(1);
        }

        // 获取项目根目录
        const projectRoot = path.resolve(__dirname, '..');
        process.chdir(projectRoot);
        log(`📁 项目根目录: ${projectRoot}`, 'blue');

        // 创建 release 目录
        const releaseDir = path.join(projectRoot, 'release');
        log(`📦 创建 release 目录: ${releaseDir}`, 'blue');
        
        if (fs.existsSync(releaseDir)) {
            fs.rmSync(releaseDir, { recursive: true, force: true });
        }
        fs.mkdirSync(releaseDir, { recursive: true });

        // 清理之前的构建
        log('🧹 清理之前的构建...', 'yellow');
        try {
            execCommand('npm run clean');
        } catch (error) {
            log('清理命令执行失败，继续执行...', 'yellow');
        }

        // 安装依赖
        log('📥 安装主项目依赖...', 'blue');
        execCommand('npm install');

        // 安装前端依赖
        const frontendDir = path.join(projectRoot, 'frontend');
        if (fs.existsSync(frontendDir)) {
            log('📥 安装前端依赖...', 'blue');
            execCommand('npm install', frontendDir);
        }

        // 构建项目
        log('🔨 构建项目...', 'blue');
        execCommand('npm run build');

        // 构建 web 前端
        const webDirPath = path.join(projectRoot, 'web');
        if (fs.existsSync(webDirPath)) {
            log('🔨 构建 web 前端...', 'blue');
            execCommand('npm install', webDirPath);
            execCommand('npm run build', webDirPath);
        }

        // 检查构建结果
        const distDir = path.join(projectRoot, 'dist');
        const frontendDistDir = path.join(projectRoot, 'frontend', 'dist');

        if (!fs.existsSync(distDir)) {
            log('❌ 错误: 构建失败，dist 目录不存在', 'red');
            process.exit(1);
        }

        if (fs.existsSync(frontendDir) && !fs.existsSync(frontendDistDir)) {
            log('❌ 错误: 前端构建失败，frontend/dist 目录不存在', 'red');
            process.exit(1);
        }

        // 创建临时打包目录
        const tempPackageDir = path.join(releaseDir, 'temp_package');
        log(`📁 创建临时打包目录: ${tempPackageDir}`, 'blue');
        fs.mkdirSync(tempPackageDir, { recursive: true });

        // 复制必要文件
        log('📋 复制项目文件...', 'blue');

        // 复制 package.json
        fs.copyFileSync(
            path.join(projectRoot, 'package.json'),
            path.join(tempPackageDir, 'package.json')
        );

        // 复制 README.md
        fs.copyFileSync(
            path.join(projectRoot, 'README.md'),
            path.join(tempPackageDir, 'README.md')
        );

        // 复制构建输出
        copyRecursive(distDir, path.join(tempPackageDir, 'dist'));

        if (fs.existsSync(frontendDistDir)) {
            copyRecursive(frontendDistDir, path.join(tempPackageDir, 'frontend', 'dist'));
            
            // 复制 template.html
            const templatePath = path.join(projectRoot, 'frontend', 'template.html');
            if (fs.existsSync(templatePath)) {
                fs.mkdirSync(path.join(tempPackageDir, 'frontend'), { recursive: true });
                fs.copyFileSync(templatePath, path.join(tempPackageDir, 'frontend', 'template.html'));
            }
        }

        // 复制 web 服务器相关文件
        const webDir = path.join(projectRoot, 'web');
        if (fs.existsSync(webDir)) {
            log('📋 复制 web 服务器文件...', 'blue');
            const webDestDir = path.join(tempPackageDir, 'web');
            
            // 复制 web/server
            const webServerDir = path.join(webDir, 'server');
            if (fs.existsSync(webServerDir)) {
                copyRecursive(webServerDir, path.join(webDestDir, 'server'));
            }
            
            // 复制 web/src
            const webSrcDir = path.join(webDir, 'src');
            if (fs.existsSync(webSrcDir)) {
                copyRecursive(webSrcDir, path.join(webDestDir, 'src'));
            }
            
            // 复制 web/dist (前端构建文件)
            const webDistDir = path.join(webDir, 'dist');
            if (fs.existsSync(webDistDir)) {
                log('📋 复制 web/dist 目录...', 'blue');
                copyRecursive(webDistDir, path.join(webDestDir, 'dist'));
            } else {
                log('⚠️  警告: web/dist 目录不存在，需要先构建前端', 'yellow');
            }
            
            // 复制配置文件
            const webFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html'];
            for (const file of webFiles) {
                const srcFile = path.join(webDir, file);
                if (fs.existsSync(srcFile)) {
                    fs.copyFileSync(srcFile, path.join(webDestDir, file));
                }
            }
        }

        // 读取包信息
        const packageJson = JSON.parse(fs.readFileSync(path.join(tempPackageDir, 'package.json'), 'utf8'));
        const packageName = packageJson.name;
        const packageVersion = packageJson.version;
        const packageFilename = `${packageName.replace(/\//g, '-')}-${packageVersion}.tgz`;

        log(`📦 打包 npm 包: ${packageFilename}`, 'green');

        // 创建 npm 包
        const packResult = execCommand('npm pack', tempPackageDir);
        const generatedTgz = packResult.trim().split('\n').pop();

        // 移动包到 release 目录
        const srcTgz = path.join(tempPackageDir, generatedTgz);
        const destTgz = path.join(releaseDir, packageFilename);
        fs.renameSync(srcTgz, destTgz);

        // 清理临时目录
        fs.rmSync(tempPackageDir, { recursive: true, force: true });

        // 获取包大小
        const packageSize = fs.statSync(destTgz).size;

        log('✅ 打包完成!', 'green');
        log(`📦 生成的包: ${destTgz}`, 'green');
        log('', null);
        log('🎯 使用方法:', 'cyan');
        log('   1. 将包文件发送给其他用户', null);
        log('   2. 用户可以通过以下命令安装:', null);
        log(`      npm install -g ${destTgz}`, 'yellow');
        log('   或者:', null);
        log(`      npm install ${destTgz}`, 'yellow');
        log('', null);
        log('🔍 包信息:', 'cyan');
        log(`   包名: ${packageName}`, null);
        log(`   版本: ${packageVersion}`, null);
        log(`   大小: ${formatBytes(packageSize)}`, null);

    } catch (error) {
        log(`❌ 打包失败: ${error.message}`, 'red');
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { main };