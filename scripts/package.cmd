@echo off
setlocal enabledelayedexpansion

:: CCDebug 项目打包脚本
:: 用于生成可分发的 npm 包

echo 🚀 开始打包 CCDebug 项目...

:: 检查必要的工具
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: npm 未安装
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js 未安装
    exit /b 1
)

:: 获取项目根目录
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
cd /d "%PROJECT_ROOT%"

echo 📁 项目根目录: %PROJECT_ROOT%

:: 创建 release 目录
set "RELEASE_DIR=%PROJECT_ROOT%\release"
echo 📦 创建 release 目录: %RELEASE_DIR%
if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

:: 清理之前的构建
echo 🧹 清理之前的构建...
call npm run clean 2>nul || echo 清理命令执行失败，继续...
del /q "%RELEASE_DIR%\*" 2>nul || echo release目录清理失败，继续...

:: 安装依赖
echo 📥 安装主项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 错误: 主项目依赖安装失败
    exit /b 1
)

:: 安装前端依赖
echo 📥 安装前端依赖...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ 错误: 前端依赖安装失败
    exit /b 1
)
cd ..

:: 构建项目
echo 🔨 构建项目...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 错误: 项目构建失败
    exit /b 1
)

:: 检查构建结果
if not exist "dist" (
    echo ❌ 错误: 构建失败，dist 目录不存在
    exit /b 1
)

if not exist "frontend\dist" (
    echo ❌ 错误: 前端构建失败，frontend\dist 目录不存在
    exit /b 1
)

:: 创建临时打包目录
set "TEMP_PACKAGE_DIR=%RELEASE_DIR%\temp_package"
echo 📁 创建临时打包目录: %TEMP_PACKAGE_DIR%
if not exist "%TEMP_PACKAGE_DIR%" mkdir "%TEMP_PACKAGE_DIR%"

:: 复制必要文件到临时目录
echo 📋 复制项目文件...

:: 复制 package.json
copy "package.json" "%TEMP_PACKAGE_DIR%\" >nul

:: 复制 README.md
copy "README.md" "%TEMP_PACKAGE_DIR%\" >nul

:: 复制构建输出
xcopy /e /i /y "dist" "%TEMP_PACKAGE_DIR%\dist\" >nul
xcopy /e /i /y "frontend\dist" "%TEMP_PACKAGE_DIR%\frontend\dist\" >nul
if not exist "%TEMP_PACKAGE_DIR%\frontend" mkdir "%TEMP_PACKAGE_DIR%\frontend"
copy "frontend\template.html" "%TEMP_PACKAGE_DIR%\frontend\" >nul

:: 复制 web 服务器相关文件（如果需要）
if exist "web" (
    echo 📋 复制 web 服务器文件...
    if not exist "%TEMP_PACKAGE_DIR%\web" mkdir "%TEMP_PACKAGE_DIR%\web"
    xcopy /e /i /y "web\server" "%TEMP_PACKAGE_DIR%\web\server\" >nul 2>nul || echo web\server 复制失败，继续...
    xcopy /e /i /y "web\src" "%TEMP_PACKAGE_DIR%\web\src\" >nul 2>nul || echo web\src 复制失败，继续...
    copy "web\package.json" "%TEMP_PACKAGE_DIR%\web\" >nul 2>nul || echo web\package.json 复制失败，继续...
    copy "web\tsconfig.json" "%TEMP_PACKAGE_DIR%\web\" >nul 2>nul || echo web\tsconfig.json 复制失败，继续...
    copy "web\vite.config.ts" "%TEMP_PACKAGE_DIR%\web\" >nul 2>nul || echo web\vite.config.ts 复制失败，继续...
    copy "web\index.html" "%TEMP_PACKAGE_DIR%\web\" >nul 2>nul || echo web\index.html 复制失败，继续...
)

:: 进入临时目录并打包
cd /d "%TEMP_PACKAGE_DIR%"

:: 获取包名和版本
for /f "delims=" %%i in ('node -p "require('./package.json').name"') do set "PACKAGE_NAME=%%i"
for /f "delims=" %%i in ('node -p "require('./package.json').version"') do set "PACKAGE_VERSION=%%i"

:: 替换包名中的斜杠为横线
set "PACKAGE_FILENAME=!PACKAGE_NAME:/=-!-!PACKAGE_VERSION!.tgz"

echo 📦 打包 npm 包: !PACKAGE_FILENAME!

:: 创建 npm 包
call npm pack
if %errorlevel% neq 0 (
    echo ❌ 错误: npm 包创建失败
    exit /b 1
)

:: 移动包到 release 目录
move "*.tgz" "..\!PACKAGE_FILENAME!" >nul

:: 清理临时目录
cd /d "%RELEASE_DIR%"
rmdir /s /q "temp_package"

echo ✅ 打包完成!
echo 📦 生成的包: %RELEASE_DIR%\!PACKAGE_FILENAME!
echo.
echo 🎯 使用方法:
echo    1. 将包文件发送给其他用户
echo    2. 用户可以通过以下命令安装:
echo       npm install -g %RELEASE_DIR%\!PACKAGE_FILENAME!
echo    或者:
echo       npm install %RELEASE_DIR%\!PACKAGE_FILENAME!
echo.
echo 🔍 包信息:
echo    包名: !PACKAGE_NAME!
echo    版本: !PACKAGE_VERSION!

:: 获取文件大小
for %%i in ("%RELEASE_DIR%\!PACKAGE_FILENAME!") do set "FILE_SIZE=%%~zi"
echo    大小: !FILE_SIZE! 字节

endlocal