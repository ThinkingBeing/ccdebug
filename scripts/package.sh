#!/bin/bash

# CCDebug 项目打包脚本
# 用于生成可分发的 npm 包

set -e  # 遇到错误时退出

echo "🚀 开始打包 CCDebug 项目..."

# 检查必要的工具
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    exit 1
fi

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "📁 项目根目录: $PROJECT_ROOT"

# 创建 release 目录
RELEASE_DIR="$PROJECT_ROOT/release"
echo "📦 创建 release 目录: $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# 清理之前的构建
echo "🧹 清理之前的构建..."
npm run clean || true
rm -rf "$RELEASE_DIR"/*

# 安装依赖
echo "📥 安装主项目依赖..."
npm install

# 安装前端依赖
echo "📥 安装前端依赖..."
cd frontend
npm install
cd ..

# 构建项目
echo "🔨 构建项目..."
npm run build

# 检查构建结果
if [ ! -d "dist" ]; then
    echo "❌ 错误: 构建失败，dist 目录不存在"
    exit 1
fi

if [ ! -d "frontend/dist" ]; then
    echo "❌ 错误: 前端构建失败，frontend/dist 目录不存在"
    exit 1
fi

# 创建临时打包目录
TEMP_PACKAGE_DIR="$RELEASE_DIR/temp_package"
echo "📁 创建临时打包目录: $TEMP_PACKAGE_DIR"
mkdir -p "$TEMP_PACKAGE_DIR"

# 复制必要文件到临时目录
echo "📋 复制项目文件..."

# 复制 package.json
cp package.json "$TEMP_PACKAGE_DIR/"

# 复制 README.md
cp README.md "$TEMP_PACKAGE_DIR/"

# 复制构建输出
cp -r dist "$TEMP_PACKAGE_DIR/"
cp -r frontend/dist "$TEMP_PACKAGE_DIR/frontend/"
mkdir -p "$TEMP_PACKAGE_DIR/frontend"
cp frontend/template.html "$TEMP_PACKAGE_DIR/frontend/"

# 复制 web 服务器相关文件（如果需要）
if [ -d "web" ]; then
    echo "📋 复制 web 服务器文件..."
    mkdir -p "$TEMP_PACKAGE_DIR/web"
    cp -r web/server "$TEMP_PACKAGE_DIR/web/"
    cp -r web/src "$TEMP_PACKAGE_DIR/web/"
    cp web/package.json "$TEMP_PACKAGE_DIR/web/" 2>/dev/null || true
    cp web/tsconfig.json "$TEMP_PACKAGE_DIR/web/" 2>/dev/null || true
    cp web/vite.config.ts "$TEMP_PACKAGE_DIR/web/" 2>/dev/null || true
    cp web/index.html "$TEMP_PACKAGE_DIR/web/" 2>/dev/null || true
fi

# 进入临时目录并打包
cd "$TEMP_PACKAGE_DIR"

# 获取包名和版本
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")
PACKAGE_FILENAME="${PACKAGE_NAME//\//-}-${PACKAGE_VERSION}.tgz"

echo "📦 打包 npm 包: $PACKAGE_FILENAME"

# 创建 npm 包
npm pack

# 移动包到 release 目录
mv *.tgz "../$PACKAGE_FILENAME"

# 清理临时目录
cd ..
rm -rf temp_package

echo "✅ 打包完成!"
echo "📦 生成的包: $RELEASE_DIR/$PACKAGE_FILENAME"
echo ""
echo "🎯 使用方法:"
echo "   1. 将包文件发送给其他用户"
echo "   2. 用户可以通过以下命令安装:"
echo "      npm install -g $RELEASE_DIR/$PACKAGE_FILENAME"
echo "   或者:"
echo "      npm install $RELEASE_DIR/$PACKAGE_FILENAME"
echo ""
echo "🔍 包信息:"
echo "   包名: $PACKAGE_NAME"
echo "   版本: $PACKAGE_VERSION"
echo "   大小: $(du -h "$RELEASE_DIR/$PACKAGE_FILENAME" | cut -f1)"