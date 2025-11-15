#!/usr/bin/env node

import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { HTMLGenerator } from "./html-generator";
import * as os from "os";

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
Record all your interactions with Claude Code as you develop your projects

${colors.yellow}USAGE:${colors.reset}
  ccdebug [OPTIONS] [--run-with CLAUDE_ARG...]

${colors.yellow}OPTIONS:${colors.reset}
  --extract-token    Extract OAuth token and exit (reproduces claude-token.py)
  --generate-html    Generate HTML report from JSONL file
  --index           Generate conversation summaries and index for .claude-trace/ directory
  --run-with         Pass all following arguments to Claude process
  --include-all-requests Include all requests made through fetch, otherwise only requests to v1/messages with more than 2 messages in the context
  --no-open          Don't open generated HTML file in browser
  --log              Specify custom log file base name (without extension)
  --claude-path      Specify custom path to Claude binary
  --version, -v      Show version information
  --help, -h         Show this help message

${colors.yellow}MODES:${colors.reset}
  ${colors.green}Interactive logging:${colors.reset}
    ccdebug                               Start Claude with traffic logging
  ccdebug --log my-session              Start Claude with custom log file name
  ccdebug --run-with chat                    Run Claude with specific command
  ccdebug --run-with chat --model sonnet-3.5 Run Claude with multiple arguments

  ${colors.green}Token extraction:${colors.reset}
    ccdebug --extract-token               Extract OAuth token for SDK usage

  ${colors.green}HTML generation:${colors.reset}
    ccdebug --generate-html file.jsonl          Generate HTML from JSONL file
    ccdebug --generate-html file.jsonl out.html Generate HTML with custom output name
    ccdebug --generate-html file.jsonl          Generate HTML and open in browser (default)
    ccdebug --generate-html file.jsonl --no-open Generate HTML without opening browser

  ${colors.green}Indexing:${colors.reset}
    ccdebug --index                             Generate conversation summaries and index

  ${colors.green}Web server:${colors.reset}
  ccdebug --serve                             Start web timeline server
  ccdebug --serve --port 8080                Start web server on custom port
  ccdebug --serve --project /path/to/project Start web server for specific project

${colors.yellow}EXAMPLES:${colors.reset}
  # Start Claude with logging
  ccdebug

  # Start Claude with custom log file name
  ccdebug --log my-session

  # Run Claude chat with logging
  ccdebug --run-with chat

  # Run Claude with specific model
  ccdebug --run-with chat --model sonnet-3.5

  # Pass multiple arguments to Claude
  ccdebug --run-with --model gpt-4o --temperature 0.7

  # Extract token for Anthropic SDK
  export ANTHROPIC_API_KEY=$(ccdebug --extract-token)

  # Generate HTML report
  ccdebug --generate-html logs/traffic.jsonl report.html

  # Generate HTML report and open in browser (default)
  ccdebug --generate-html logs/traffic.jsonl

  # Generate HTML report without opening browser
  ccdebug --generate-html logs/traffic.jsonl --no-open

  # Generate conversation index
  ccdebug --index

  # Start web timeline server
  ccdebug --serve

  # Start web server on custom port
  ccdebug --serve --port 8080

  # Start web server for specific project
  ccdebug --serve --project /path/to/project

${colors.yellow}OUTPUT:${colors.reset}
  Logs are saved to: ${colors.green}.claude-trace/log-YYYY-MM-DD-HH-MM-SS.{jsonl,html}${colors.reset}
  With --log NAME:   ${colors.green}.claude-trace/NAME.{jsonl,html}${colors.reset}

${colors.yellow}MIGRATION:${colors.reset}
  This tool replaces Python-based claude-logger and claude-token.py scripts
  with a pure Node.js implementation. All output formats are compatible.

For more information, visit: https://github.com/myskyline_ai/ccdebug
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
			log(`Claude binary not found at specified path: ${customPath}`, "red");
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
			// Linux/Mac: 使用 which 命令
			claudePath = require("child_process")
				.execSync("which claude", {
					encoding: "utf-8",
				})
				.trim();
		}

		// Handle shell aliases (e.g., "claude: aliased to /path/to/claude")
		const aliasMatch = claudePath.match(/:\s*aliased to\s+(.+)$/);
		if (aliasMatch && aliasMatch[1]) {
			claudePath = aliasMatch[1];
		}

		// Check if the path is a bash wrapper (Linux/Mac) or batch file (Windows)
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

		log(`Claude CLI not found in PATH`, "red");
		log(`Also checked for local installation at:`, "red");
		possiblePaths.forEach(p => log(`  ${p}`, "red"));
		log(`Please install Claude Code CLI first`, "red");
		process.exit(1);
	}
}

function getLoaderPath(): string {
	const loaderPath = path.join(__dirname, "interceptor-loader.js");

	if (!fs.existsSync(loaderPath)) {
		log(`Interceptor loader not found at: ${loaderPath}`, "red");
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
	log("CCDebug", "blue");
	log("Starting Claude with traffic logging", "yellow");
	if (claudeArgs.length > 0) {
		log(`Claude arguments: ${claudeArgs.join(" ")}`, "blue");
	}
	console.log("");

	const claudePath = getClaudeAbsolutePath(customClaudePath);
	const loaderPath = getLoaderPath();

	log(`Using Claude binary: ${claudePath}`, "blue");
	log("Starting traffic logger...", "green");
	console.log("");

	// Launch node with interceptor and absolute path to claude, plus any additional arguments
	const spawnArgs = ["--require", loaderPath, claudePath, ...claudeArgs];
	const child: ChildProcess = spawn("node", spawnArgs, {
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

	// Handle child process events
	child.on("error", (error: Error) => {
		log(`Error starting Claude: ${error.message}`, "red");
		process.exit(1);
	});

	child.on("exit", (code: number | null, signal: string | null) => {
		if (signal) {
			log(`\nClaude terminated by signal: ${signal}`, "yellow");
		} else if (code !== 0 && code !== null) {
			log(`\nClaude exited with code: ${code}`, "yellow");
		} else {
			log("\nClaude session completed", "green");
		}
	});

	// Handle our own signals
	const handleSignal = (signal: string) => {
		log(`\nReceived ${signal}, shutting down...`, "yellow");
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
		log(`Unexpected error: ${err.message}`, "red");
		process.exit(1);
	}
}

// Scenario 2: --extract-token -> launch node with token interceptor and absolute path to claude
async function extractToken(customClaudePath?: string): Promise<void> {
	const claudePath = getClaudeAbsolutePath(customClaudePath);

	// Log to stderr so it doesn't interfere with token output
	console.error(`Using Claude binary: ${claudePath}`);

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
		log(`Token extractor not found at: ${tokenExtractorPath}`, "red");
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
		console.error("Timeout: No token found within 30 seconds");
		process.exit(1);
	}, 30000);

	// Handle child process events
	child.on("error", (error: Error) => {
		clearTimeout(timeout);
		cleanup();
		console.error(`Error starting Claude: ${error.message}`);
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
		console.error("No authorization token found");
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
			log(`Opening ${finalOutputFile} in browser`, "green");
		}

		process.exit(0);
	} catch (error) {
		const err = error as Error;
		log(`Error: ${err.message}`, "red");
		process.exit(1);
	}
}

// Scenario 5: --serve
async function startWebServer(port?: number, projectDir?: string): Promise<void> {
	try {
		console.log('🔍 调试测试: 启动Web服务器', { port, projectDir });
		
		// 使用 require 导入 web server 模块
		const webServerPath = path.resolve(__dirname, "../web/server/index.js");
		const webServerModule = require(webServerPath);
		const startServer = webServerModule.startWebServer;
		
		const serverPort = port || 3001;
		const serverProjectDir = projectDir || process.cwd();
		
		console.log('🔍 调试测试: 服务器配置', { serverPort, serverProjectDir });
		
		log("CCDebug Web Server", "blue");
		log(`Starting web timeline server on port ${serverPort}`, "yellow");
		log(`Project directory: ${serverProjectDir}`, "blue");
		console.log("");
		
		await startServer({
			projectDir: path.resolve(serverProjectDir),
			port: serverPort,
			staticDir: path.resolve(__dirname, "../web/dist")
		});
		
		log(`Web server started successfully!`, "green");
		log(`Open http://localhost:${serverPort} in your browser`, "green");
		
		// 保持进程运行
		process.on('SIGINT', () => {
			log('\nShutting down web server...', "yellow");
			process.exit(0);
		});
		
	} catch (error) {
		const err = error as Error;
		log(`Error starting web server: ${err.message}`, "red");
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
		log(`Error: ${err.message}`, "red");
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
			log(`Invalid port number: ${claudeTraceArgs[portIndex + 1]}`, "red");
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

		// Find the next argument that's not a flag as the output file
		let outputFile: string | undefined;
		for (let i = flagIndex + 2; i < claudeTraceArgs.length; i++) {
			const arg = claudeTraceArgs[i];
			if (!arg.startsWith("--")) {
				outputFile = arg;
				break;
			}
		}

		if (!inputFile) {
			log(`Missing input file for --generate-html`, "red");
			log(`Usage: ccdebug --generate-html input.jsonl [output.html]`, "yellow");
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
	log(`Unexpected error: ${err.message}`, "red");
	process.exit(1);
});
