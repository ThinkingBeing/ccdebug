#!/usr/bin/env node

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { HTMLGenerator } from "./html-generator";
import * as os from "os";
import * as http from "http";
import * as https from "https";
import { URL } from "url";

/**
 * 获取工具版本号
 */
function getVersion(): string {
	try {
		const packageJsonPath = path.join(__dirname, "..", "package.json");
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
		return packageJson.version || "unknown";
	} catch (error) {
		return "unknown";
	}
}

// Colors for output
export const colors = {
	red: "\x1b[0;31m",
	green: "\x1b[0;32m",
	yellow: "\x1b[1;33m",
	blue: "\x1b[0;34m",
	reset: "\x1b[0m",
} as const;

type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset"): void {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function showHelp(): void {
	console.log(`
${colors.blue}CCDebug${colors.reset}
查看CC标准日志，跟踪CC所有API请求，允许修改并重新发起单步中的API请求，以调试CC轨迹

${colors.yellow}用法:${colors.reset}
  ccdebug [选项] [--run-with CLAUDE_参数...]

${colors.yellow}选项:${colors.reset}
  --serve           启动站点，查看claude code日志
  --run-with         将后续所有参数传递给 Claude 进程
  --claude-path      指定 Claude 二进制文件或cli.js的路径
  --version, -v      显示版本信息
  --help, -h         显示此帮助信息

${colors.yellow}模式:${colors.reset}
  ${colors.green}交互式日志:${colors.reset}
  ccdebug   启动带流量日志的 Claude
  ccdebug --run-with -p ”请按要求工作“ --verbose  使用特定命令运行 Claude

  ${colors.green}Web 服务器:${colors.reset}
  ccdebug --serve                            启动站点，查看claude code日志
  ccdebug --serve --port 8080                在自定义端口上启动站点
  ccdebug --serve --project /path/to/project 为特定项目启动站点

${colors.yellow}输出:${colors.reset}
  cc标准日志: ${colors.green}.claude-trace/cclog/*.jsonl${colors.reset}
  cc跟踪日志: ${colors.green}.claude-trace/tracelog/*.jsonl${colors.reset}

更多信息请访问: https://github.com/myskyline_ai/ccdebug
`);
}

function resolveToJsFile(filePath: string): string {
	try {
		// First, resolve any symlinks
		const realPath = fs.realpathSync(filePath);

		// Check if it's already a JS file
		if (realPath.endsWith(".js")) {
			return realPath;
		}

		// If it's a Node.js shebang script, check if it's actually a JS file
		if (fs.existsSync(realPath)) {
			const content = fs.readFileSync(realPath, "utf-8");
			// Check for Node.js shebang
			if (
				content.startsWith("#!/usr/bin/env node") ||
				content.match(/^#!.*\/node$/m) ||
				content.includes("require(") ||
				content.includes("import ")
			) {
				// This is likely a JS file without .js extension
				return realPath;
			}
		}

		// If not a JS file, try common JS file locations
		const possibleJsPaths = [
			realPath + ".js",
			realPath.replace(/\/bin\//, "/lib/") + ".js",
			realPath.replace(/\/\.bin\//, "/lib/bin/") + ".js",
		];

		for (const jsPath of possibleJsPaths) {
			if (fs.existsSync(jsPath)) {
				return jsPath;
			}
		}

		// Fall back to original path
		return realPath;
	} catch (error) {
		// If resolution fails, return original path
		return filePath;
	}
}

function getClaudeAbsolutePath(customPath?: string): string {
	// If custom path is provided, use it directly
	if (customPath) {
		if (!fs.existsSync(customPath)) {
			log(`在指定路径未找到 Claude 二进制文件: ${customPath}`, "red");
			process.exit(1);
		}
		return resolveToJsFile(customPath);
	}

	// 检测操作系统
	const isWindows = os.platform() === 'win32';

	try {
		let claudePath: string;
		
		if (isWindows) {
			// Windows: 使用 where 命令
			try {
				const whereResult = require("child_process")
					.execSync("where claude", {
						encoding: "utf-8",
					})
					.trim();
				
				// where 命令可能返回多个结果，优先选择 Windows 批处理文件
				const paths = whereResult.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
				
				// 优先选择 .cmd 或 .bat 文件，而不是 Unix shell 脚本
				claudePath = paths.find((p: string) => p.endsWith('.cmd') || p.endsWith('.bat')) || paths[0];
				
			} catch (error) {
				// where 命令失败，尝试使用 PowerShell
				try {
					claudePath = require("child_process")
						.execSync('powershell -Command "Get-Command claude | Select-Object -ExpandProperty Source"', {
							encoding: "utf-8",
						})
						.trim();
				} catch (psError) {
					throw new Error("Claude not found in PATH");
				}
			}
		} else {
			// Linux/Mac: 使用 which 命令，但排除当前项目目录
			try {
				// 获取当前工作目录
				const currentDir = process.cwd();
				
				// 使用 which 命令获取所有可能的 claude 路径
				const whichResult = require("child_process")
					.execSync("which -a claude", {
						encoding: "utf-8",
					})
					.trim();
				
				// 分割所有路径
				const allPaths = whichResult.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
				
				// 找到不在当前项目目录中的路径
				claudePath = allPaths.find((p: string) => !p.includes(currentDir));
				
				// 如果没有找到合适的路径，使用第一个（全局）路径
				if (!claudePath && allPaths.length > 0) {
					claudePath = allPaths[0];
				}
				
				if (!claudePath) {
					throw new Error("Claude not found in PATH");
				}
			} catch (error) {
				throw new Error("Claude not found in PATH");
			}
		}

		// Handle shell aliases (e.g., "claude: aliased to /path/to/claude")
		const aliasMatch = claudePath.match(/:\s*aliased to\s+(.+)$/);
		if (aliasMatch && aliasMatch[1]) {
			claudePath = aliasMatch[1];
		}

		// Check if path is a bash wrapper (Linux/Mac) or batch file (Windows)
		if (fs.existsSync(claudePath)) {
			const content = fs.readFileSync(claudePath, "utf-8");
			
			if (isWindows) {
				// Windows: 检查批处理文件 (.bat, .cmd) 或 PowerShell 脚本
				if (claudePath.endsWith('.bat') || claudePath.endsWith('.cmd')) {
					// 解析批处理文件来找到实际的 Node.js 脚本
					// 匹配模式如: "%dp0%\node_modules\@anthropic-ai\claude-code\cli.js"
					const matches = content.match(/["']([^"']*\.js)["']/g);
					if (matches && matches.length > 0) {
						// 取最后一个匹配，通常是实际的JS文件
						let jsPath = matches[matches.length - 1].replace(/["']/g, '');
						
						// 替换 %dp0% 变量为批处理文件所在目录
						if (jsPath.includes('%dp0%')) {
							const batchDir = path.dirname(claudePath);
							jsPath = jsPath.replace(/%dp0%/g, batchDir + '\\');
						}
						return resolveToJsFile(jsPath);
					}
				} else if (content.startsWith('#!') && content.includes('node')) {
					// Node.js shebang 脚本
					return resolveToJsFile(claudePath);
				}
			} else {
				// Linux/Mac: 检查 bash wrapper
				if (content.startsWith("#!/bin/bash")) {
					// Parse bash wrapper to find actual executable
					const execMatch = content.match(/exec\s+"([^"]+)"/);
					if (execMatch && execMatch[1]) {
						const actualPath = execMatch[1];
						return resolveToJsFile(actualPath);
					}
				}
			}
		}

		return resolveToJsFile(claudePath);
	} catch (error) {
		// First try the local installation paths
		const localClaudeWrapper = path.join(os.homedir(), ".claude", "local", "claude");
		const localClaudeBat = path.join(os.homedir(), ".claude", "local", "claude.bat");
		const localClaudePath = path.join(os.homedir(), ".claude", "local", "node_modules", ".bin", "claude");
		const localClaudeCmd = path.join(os.homedir(), ".claude", "local", "node_modules", ".bin", "claude.cmd");

		// Try different local installation paths based on OS
		const possiblePaths = isWindows ? [localClaudeBat, localClaudeCmd, localClaudePath] : [localClaudeWrapper, localClaudePath];
		
		for (const tryPath of possiblePaths) {
			if (fs.existsSync(tryPath)) {
				const content = fs.readFileSync(tryPath, "utf-8");
				
				if (isWindows && (tryPath.endsWith('.bat') || tryPath.endsWith('.cmd'))) {
					// 解析 Windows 批处理文件
					const matches = content.match(/["']([^"']*\.js)["']/g);
					if (matches && matches.length > 0) {
						let jsPath = matches[matches.length - 1].replace(/["']/g, '');
						if (jsPath.includes('%dp0%')) {
							const batchDir = path.dirname(tryPath);
							jsPath = jsPath.replace(/%dp0%/g, batchDir + '\\');
						}
						return resolveToJsFile(jsPath);
					}
				} else if (!isWindows && content.startsWith("#!/bin/bash")) {
					// 解析 Linux/Mac bash wrapper
					const execMatch = content.match(/exec\s+"([^"]+)"/);
					if (execMatch && execMatch[1]) {
						return resolveToJsFile(execMatch[1]);
					}
				}
				
				return resolveToJsFile(tryPath);
			}
		}

		log(`在 PATH 中未找到 Claude CLI`, "red");
		log(`已检查本地安装位置:`, "red");
		possiblePaths.forEach(p => log(`  ${p}`, "red"));
		log(`请先安装 Claude Code CLI`, "red");
		process.exit(1);
	}
}

function isNodeScript(claudePath: string): boolean {
	try {
		return claudePath.endsWith('.js');
	} catch {
		return false;
	}
}

function getLoaderPath(): string {
	// Check if we're in development mode (running from src) or production mode (running from dist)
	const isDevMode = __dirname.includes('src') || !fs.existsSync(path.join(__dirname, '..', 'dist'));
	
	let loaderPath: string;
	if (isDevMode) {
		// Development mode: use src directory
		loaderPath = path.resolve(__dirname, "interceptor-loader.js");
	} else {
		// Production mode: use dist directory
		loaderPath = path.resolve(__dirname, "interceptor-loader.js");
	}

	if (!fs.existsSync(loaderPath)) {
		log(`未找到拦截器加载器: ${loaderPath}`, "red");
		process.exit(1);
	}

	return loaderPath;
}

// Scenario 1: No args -> launch node with interceptor and absolute path to claude
async function runClaudeWithInterception(
	claudeArgs: string[] = [],
	includeAllRequests: boolean = false,
	openInBrowser: boolean = false,
	customClaudePath?: string,
	logBaseName?: string,
): Promise<void> {
	log("启动 Claude 并记录流量日志", "blue");
	if (claudeArgs.length > 0) {
		log(`Claude 参数: ${claudeArgs.join(" ")}`, "blue");
	}

	const claudePath = getClaudeAbsolutePath(customClaudePath);
	log(`使用 Claude 二进制文件: ${claudePath}`, "blue");
	
	let child: ChildProcess;
	
	if (isNodeScript(claudePath)) {
		// Node.js 脚本方式：使用原有的 --require 方式
		log("使用 Node.js 拦截方法", "blue");
		const loaderPath = getLoaderPath();
		const spawnArgs = ["--require", loaderPath, claudePath, ...claudeArgs];
		child = spawn("node", spawnArgs, {
			env: {
				...process.env,
				NODE_OPTIONS: "--no-deprecation",
				CLAUDE_TRACE_INCLUDE_ALL_REQUESTS: includeAllRequests ? "true" : "false",
				CLAUDE_TRACE_OPEN_BROWSER: openInBrowser ? "true" : "false",
				...(logBaseName ? { CLAUDE_TRACE_LOG_NAME: logBaseName } : {}),
			},
			stdio: "inherit",
			cwd: process.cwd(),
		});
	} else {
		// ===== 方式 2: 二进制文件 - 无法拦截（给出提示）=====
		console.log("");
		log("⚠️  警告: 检测到原生二进制文件", "yellow");
		log("CCDebug 无法拦截来自 Claude Code 原生二进制版本的 API 请求，调试功能将无法工作", "yellow");
		log("要使用 CCDebug 的完整调试功能，请改用 NPM 版本的 Claude Code。", "yellow");
		console.log("");
		log("正在启动 Claude（不进行 API 拦截）...", "blue");
		console.log("");

		// 给用户一点时间阅读提示信息
		await new Promise(resolve => setTimeout(resolve, 500));

		// 直接启动 Claude 二进制文件，不使用代理
		child = spawn(claudePath, claudeArgs, {
			env: {
				...process.env,
			},
			stdio: "inherit",
			cwd: process.cwd(),
		});
	}

	// Node.js 模式显示成功消息
	if (isNodeScript(claudePath)) {
		log("流量日志记录器启动成功", "green");
		console.log("");
	}

	// Handle child process events
	child.on("error", (error: Error) => {
		log(`启动 Claude 时出错: ${error.message}`, "red");
		process.exit(1);
	});

	child.on("exit", (code: number | null, signal: string | null) => {
		if (signal) {
			log(`\nClaude 被信号终止: ${signal}`, "yellow");
		} else if (code !== 0 && code !== null) {
			log(`\nClaude 退出，退出码: ${code}`, "yellow");
		} else {
			log("\nClaude 会话已完成", "green");
		}
	});

	// Handle our own signals
	const handleSignal = (signal: string) => {
		log(`\n收到 ${signal} 信号，正在关闭...`, "yellow");
		if (child.pid) {
			child.kill(signal as NodeJS.Signals);
		}
	};

	process.on("SIGINT", () => handleSignal("SIGINT"));
	process.on("SIGTERM", () => handleSignal("SIGTERM"));

	// Wait for child process to complete
	try {
		await new Promise<void>((resolve, reject) => {
			child.on("exit", () => resolve());
			child.on("error", reject);
		});
	} catch (error) {
		const err = error as Error;
		log(`意外错误: ${err.message}`, "red");
		process.exit(1);
	}
}

// Scenario 2: --extract-token -> launch node with token interceptor and absolute path to claude
async function extractToken(customClaudePath?: string): Promise<void> {
	const claudePath = getClaudeAbsolutePath(customClaudePath);

	// Log to stderr so it doesn't interfere with token output
	console.error(`使用 Claude 二进制文件: ${claudePath}`);

	// Create .claude-trace directory if it doesn't exist
    const ccdebugDir = path.join(process.cwd(), ".claude-trace");
	if (!fs.existsSync(ccdebugDir)) {
        fs.mkdirSync(ccdebugDir, { recursive: true });
    }

	// Token file location
	const tokenFile = path.join(ccdebugDir, "token.txt");

	// Use the token extractor directly without copying
	const tokenExtractorPath = path.join(__dirname, "token-extractor.js");
	if (!fs.existsSync(tokenExtractorPath)) {
		log(`未找到令牌提取器: ${tokenExtractorPath}`, "red");
		process.exit(1);
	}

	const cleanup = () => {
		try {
			if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
		} catch (e) {
			// Ignore cleanup errors
		}
	};

	// Launch node with token interceptor and absolute path to claude
	const { ANTHROPIC_API_KEY, ...envWithoutApiKey } = process.env;
	const child: ChildProcess = spawn("node", ["--require", tokenExtractorPath, claudePath, "-p", "hello"], {
		env: {
			...envWithoutApiKey,
			NODE_TLS_REJECT_UNAUTHORIZED: "0",
			CLAUDE_TRACE_TOKEN_FILE: tokenFile,
		},
		stdio: "inherit", // Suppress all output from Claude
		cwd: process.cwd(),
	});

	// Set a timeout to avoid hanging
	const timeout = setTimeout(() => {
		child.kill();
		cleanup();
		console.error("超时: 30 秒内未找到令牌");
		process.exit(1);
	}, 30000);

	// Handle child process events
	child.on("error", (error: Error) => {
		clearTimeout(timeout);
		cleanup();
		console.error(`启动 Claude 时出错: ${error.message}`);
		process.exit(1);
	});

	child.on("exit", () => {
		clearTimeout(timeout);

		try {
			if (fs.existsSync(tokenFile)) {
				const token = fs.readFileSync(tokenFile, "utf-8").trim();
				cleanup();
				if (token) {
					// Only output the token, nothing else
					console.log(token);
					process.exit(0);
				}
			}
		} catch (e) {
			// File doesn't exist or read error
		}

		cleanup();
		console.error("未找到授权令牌");
		process.exit(1);
	});

	// Check for token file periodically
	const checkToken = setInterval(() => {
		try {
			if (fs.existsSync(tokenFile)) {
				const token = fs.readFileSync(tokenFile, "utf-8").trim();
				if (token) {
					clearTimeout(timeout);
					clearInterval(checkToken);
					child.kill();
					cleanup();

					// Only output the token, nothing else
					console.log(token);
					process.exit(0);
				}
			}
		} catch (e) {
			// Ignore read errors, keep trying
		}
	}, 500);
}

// Scenario 3: --generate-html input.jsonl output.html
async function generateHTMLFromCLI(
	inputFile: string,
	outputFile?: string,
	includeAllRequests: boolean = false,
	openInBrowser: boolean = false,
): Promise<void> {
	try {
		const htmlGenerator = new HTMLGenerator();
		const finalOutputFile = await htmlGenerator.generateHTMLFromJSONL(inputFile, outputFile, includeAllRequests);

		if (openInBrowser) {
			spawn("open", [finalOutputFile], { detached: true, stdio: "ignore" }).unref();
			log(`正在浏览器中打开 ${finalOutputFile}`, "green");
		}

		process.exit(0);
	} catch (error) {
		const err = error as Error;
		log(`错误: ${err.message}`, "red");
		process.exit(1);
	}
}

// Scenario 5: --serve
async function startWebServer(port?: number, projectDir?: string): Promise<void> {
	try {
		// 使用 require 导入 web server 模块
		const webServerPath = path.resolve(__dirname, "../web/server/index.js");
		const webServerModule = require(webServerPath);
		const startServer = webServerModule.startWebServer;
		
		const serverPort = port || 3001;
		const serverProjectDir = projectDir || process.cwd();

		log("CCDebug Web 服务器", "blue");
		log(`正在端口 ${serverPort} 上启动 Web 时间线服务器`, "yellow");
		log(`项目目录: ${serverProjectDir}`, "blue");
		console.log("");

		await startServer({
			projectDir: path.resolve(serverProjectDir),
			port: serverPort,
			staticDir: path.resolve(__dirname, "../web/dist")
		});

		log(`Web 服务器启动成功！`, "green");
		log(`在浏览器中打开 http://localhost:${serverPort}`, "green");

		// 保持进程运行
		process.on('SIGINT', () => {
			log('\n正在关闭 Web 服务器...', "yellow");
			process.exit(0);
		});

	} catch (error) {
		const err = error as Error;
		log(`启动 Web 服务器时出错: ${err.message}`, "red");
		process.exit(1);
	}
}

// Scenario 4: --index
async function generateIndex(): Promise<void> {
	try {
		const { IndexGenerator } = await import("./index-generator");
		const indexGenerator = new IndexGenerator();
		await indexGenerator.generateIndex();
		process.exit(0);
	} catch (error) {
		const err = error as Error;
		log(`错误: ${err.message}`, "red");
		process.exit(1);
	}
}

// Main entry point
async function main(): Promise<void> {
	const args = process.argv.slice(2);

	// Split arguments at --run-with flag
	const argIndex = args.indexOf("--run-with");
	let claudeTraceArgs: string[];
	let claudeArgs: string[];

	if (argIndex !== -1) {
		claudeTraceArgs = args.slice(0, argIndex);
		claudeArgs = args.slice(argIndex + 1);
	} else {
		claudeTraceArgs = args;
		claudeArgs = [];
	}

	// Check for version flags
	if (claudeTraceArgs.includes("--version") || claudeTraceArgs.includes("-v")) {
		console.log(`CCDebug version ${getVersion()}`);
		process.exit(0);
	}

	// Check for help flags
	if (claudeTraceArgs.includes("--help") || claudeTraceArgs.includes("-h")) {
		showHelp();
		process.exit(0);
	}

	// Check for include all requests flag
	const includeAllRequests = claudeTraceArgs.includes("--include-all-requests");

	// Check for no-open flag (inverted logic - open by default)
	const openInBrowser = !claudeTraceArgs.includes("--no-open");

	// Check for custom Claude path
	let customClaudePath: string | undefined;
	const claudePathIndex = claudeTraceArgs.indexOf("--claude-path");
	if (claudePathIndex !== -1 && claudeTraceArgs[claudePathIndex + 1]) {
		customClaudePath = claudeTraceArgs[claudePathIndex + 1];
	}

	// Check for custom log base name
	let logBaseName: string | undefined;
	const logIndex = claudeTraceArgs.indexOf("--log");
	if (logIndex !== -1 && claudeTraceArgs[logIndex + 1]) {
		logBaseName = claudeTraceArgs[logIndex + 1];
	}

	// Check for serve command options
	let servePort: number | undefined;
	let serveProjectDir: string | undefined;
	
	const portIndex = claudeTraceArgs.indexOf("--port");
	if (portIndex !== -1 && claudeTraceArgs[portIndex + 1]) {
		servePort = parseInt(claudeTraceArgs[portIndex + 1], 10);
		if (isNaN(servePort)) {
			log(`无效的端口号: ${claudeTraceArgs[portIndex + 1]}`, "red");
			process.exit(1);
		}
	}
	
	const projectIndex = claudeTraceArgs.indexOf("--project");
	if (projectIndex !== -1 && claudeTraceArgs[projectIndex + 1]) {
		serveProjectDir = claudeTraceArgs[projectIndex + 1];
	}

	// Scenario 2: --extract-token
	if (claudeTraceArgs.includes("--extract-token")) {
		await extractToken(customClaudePath);
		return;
	}

	// Scenario 3: --generate-html input.jsonl output.html
	if (claudeTraceArgs.includes("--generate-html")) {
		const flagIndex = claudeTraceArgs.indexOf("--generate-html");
		const inputFile = claudeTraceArgs[flagIndex + 1];

		// Find is next argument that's not a flag as the output file
		let outputFile: string | undefined;
		for (let i = flagIndex + 2; i < claudeTraceArgs.length; i++) {
			const arg = claudeTraceArgs[i];
			if (!arg.startsWith("--")) {
				outputFile = arg;
				break;
			}
		}

		if (!inputFile) {
			log(`--generate-html 缺少输入文件`, "red");
			log(`用法: ccdebug --generate-html input.jsonl [output.html]`, "yellow");
			process.exit(1);
		}

		await generateHTMLFromCLI(inputFile, outputFile, includeAllRequests, openInBrowser);
		return;
	}

	// Scenario 4: --index
	if (claudeTraceArgs.includes("--index")) {
		await generateIndex();
		return;
	}

	// Scenario 5: --serve
	if (claudeTraceArgs.includes("--serve")) {
		await startWebServer(servePort, serveProjectDir);
		return;
	}

	// Scenario 1: No args (or claude with args) -> launch claude with interception
	await runClaudeWithInterception(claudeArgs, includeAllRequests, openInBrowser, customClaudePath, logBaseName);
}

main().catch((error) => {
	const err = error as Error;
	log(`意外错误: ${err.message}`, "red");
	process.exit(1);
});
