# Trae IDE 调试配置使用指南

## 🎯 调试环境已配置完成

我已经为你的项目配置了完整的调试环境，支持前端 Vue 应用和后端 TypeScript 服务的调试。

## 📁 配置文件说明

### VS Code 配置文件
- `.vscode/launch.json` - 调试启动配置
- `.vscode/settings.json` - 工作区设置
- `.vscode/tasks.json` - 构建任务配置
- `.vscode/extensions.json` - 推荐扩展

### 项目配置更新
- `web/vite.config.ts` - 添加了 sourcemap 支持
- `web/tsconfig.json` - 启用了 sourceMap
- `tsconfig.json` - 优化了调试相关配置

## 🚀 如何使用调试功能

### 1. 前端 Vue 应用调试

#### 方法一：使用 VS Code 调试面板
1. 确保前端开发服务器正在运行：`npm run dev`（在 web 目录）
2. 在 VS Code 中按 `F5` 或点击调试面板
3. 选择 "调试前端 Vue 应用" 配置
4. 会自动打开 Chrome 浏览器并连接调试器

#### 方法二：浏览器开发者工具
1. 访问 `http://localhost:5173`
2. 按 `F12` 打开开发者工具
3. 在 Sources 面板中可以看到源码并设置断点

### 2. 后端 TypeScript 服务调试

#### 方法一：使用 VS Code 调试面板
1. 在 VS Code 中按 `F5` 或点击调试面板
2. 选择 "调试后端 TypeScript 服务" 配置
3. 会自动启动带调试的后端服务

#### 方法二：附加到运行中的服务
1. 先启动带调试的后端服务：
   ```bash
   npx tsx --inspect=9229 src/cli.ts --serve --port 3001 --project ./ccdemo
   ```
2. 在 VS Code 中选择 "附加到运行中的后端服务" 配置

### 3. 全栈调试
选择 "调试全栈应用" 配置，会同时启动前端和后端的调试。

## 🔧 调试测试

我已经在代码中添加了一些调试测试点：

### 前端测试点
- `web/src/components/ProjectPanel.vue` 中的 `handleFileChange` 和 `handleRefresh` 函数
- 包含 `console.log` 和 `debugger` 语句

### 后端测试点
- `src/cli.ts` 中的 `startWebServer` 函数
- 包含 `console.log` 和 `debugger` 语句

## 📝 调试技巧

### 1. 设置断点
- 在代码行号左侧点击设置断点
- 使用 `debugger;` 语句强制断点
- 条件断点：右键断点可设置条件

### 2. 调试面板功能
- **变量面板**：查看当前作用域的变量
- **监视面板**：添加表达式监视
- **调用堆栈**：查看函数调用链
- **断点面板**：管理所有断点

### 3. 调试控制
- `F5` - 继续执行
- `F10` - 单步跳过
- `F11` - 单步进入
- `Shift+F11` - 单步跳出
- `Shift+F5` - 停止调试

## 🌐 浏览器调试

### Chrome DevTools
1. 打开 `http://localhost:5173`
2. 按 `F12` 打开开发者工具
3. 在 Sources 面板中：
   - 左侧文件树中找到源文件
   - 点击行号设置断点
   - 使用 Console 面板执行代码

### Vue DevTools
建议安装 Vue DevTools 浏览器扩展，可以：
- 查看组件树
- 检查组件状态
- 监听事件
- 性能分析

## 🔍 常见问题

### 1. 断点不生效
- 确保 sourcemap 已启用
- 检查文件路径是否正确
- 重启调试会话

### 2. 无法连接调试器
- 确保端口没有被占用
- 检查防火墙设置
- 重启开发服务器

### 3. 源码映射问题
- 确保 `sourceMap: true` 配置正确
- 清除浏览器缓存
- 重新构建项目

## 🎉 开始调试

现在你可以：
1. 在代码中设置断点
2. 启动调试会话
3. 逐步执行代码
4. 检查变量值
5. 分析程序流程

祝你调试愉快！🐛➡️✨