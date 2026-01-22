import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { RawPair } from "./types";
import { HTMLGenerator } from "./html-generator";
import { LogFileManager } from "./log-file-manager";
import { error } from "console";

export interface InterceptorConfig {
	logDirectory?: string;
	logBaseName?: string;
	enableRealTimeHTML?: boolean;
	logLevel?: "debug" | "info" | "warn" | "error";
}

export class ClaudeTrafficLogger {
	private traceHomeDir: string;
	private traceLogDir: string;
	private traceLogFile: string;
	private ccLogDir: string;
	private ccLogFile: string;
	private htmlFile: string;
	private pendingRequests: Map<string, any> = new Map();
	private pairs: RawPair[] = [];
	private config: InterceptorConfig;
	private htmlGenerator: HTMLGenerator;

	constructor(config: InterceptorConfig = {}) {
		// 检查是否启用了跟踪
		const traceEnabled = process.env.CLAUDE_TRACE_ENABLED === "true";
		
		if (!traceEnabled) {
			// 如果未启用跟踪，则不初始化日志记录器
			this.config = {
				logDirectory: ".claude-trace",
				enableRealTimeHTML: false,
				logLevel: "info",
				...config,
			};
			// 不创建目录和文件
			this.traceHomeDir = "";
			this.traceLogDir = "";
			this.traceLogFile = "";
			this.ccLogDir = "";
			this.ccLogFile = "";
			this.htmlFile = "";
			this.htmlGenerator = new HTMLGenerator();
			return;
		}
		
		this.config = {
			logDirectory: ".claude-trace",
			enableRealTimeHTML: false,
			logLevel: "info",
			...config,
		};

		//创建.claude-trace目录
		this.traceHomeDir = this.config.logDirectory!;
		if (!fs.existsSync(this.traceHomeDir)) {
			fs.mkdirSync(this.traceHomeDir, { recursive: true });
		}
		//创建tracelog目录
		this.traceLogDir = path.join(this.traceHomeDir, 'tracelog');
		if (!fs.existsSync(this.traceLogDir)) {
			fs.mkdirSync(this.traceLogDir, { recursive: true });
		}
		// 创建cclog目录
		this.ccLogDir = path.join(this.traceHomeDir, 'cclog');
		if (!fs.existsSync(this.ccLogDir)) {
			fs.mkdirSync(this.ccLogDir, { recursive: true });
		}
		this.ccLogFile = '';

		// Generate filenames based on custom name or timestamp
		const logBaseName = config?.logBaseName || process.env.CLAUDE_TRACE_LOG_NAME;
		const fileBaseName =
			logBaseName || `log-${new Date().toISOString().replace(/[:.]/g, "-").replace("T", "-").slice(0, -5)}`; // Remove milliseconds and Z

		this.traceLogFile = path.join(this.traceLogDir, `${fileBaseName}.jsonl`);
		this.htmlFile = path.join(this.traceLogDir, `${fileBaseName}.html`);

		// Initialize HTML generator
		this.htmlGenerator = new HTMLGenerator();

		// Clear log file
		fs.writeFileSync(this.traceLogFile, "");

		// Output the actual filenames with absolute paths
		console.log(`Logs will be written to:`);
		console.log(`  JSONL: ${path.resolve(this.traceLogFile)}`);
		console.log(`  HTML:  ${path.resolve(this.htmlFile)}`);
	}

	private isClaudeAPI(url: string | URL): boolean {
		const urlString = typeof url === "string" ? url : url.toString();
		const includeAllRequests = process.env.CLAUDE_TRACE_INCLUDE_ALL_REQUESTS === "true";

		// Support custom ANTHROPIC_BASE_URL
		const baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
		const apiHost = new URL(baseUrl).hostname;

		// Check for direct Anthropic API calls
		const isAnthropicAPI = urlString.includes(apiHost);

		// Check for AWS Bedrock Claude API calls
		const isBedrockAPI = urlString.includes("bedrock-runtime.") && urlString.includes(".amazonaws.com");

		if (includeAllRequests) {
			return isAnthropicAPI || isBedrockAPI; // Capture all Claude API requests
		}

		return (isAnthropicAPI && urlString.includes("/v1/messages")) || isBedrockAPI;
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	private redactSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
		const redactedHeaders = { ...headers };
		const sensitiveKeys = [
			"authorization",
			"x-api-key",
			"x-auth-token",
			"cookie",
			"set-cookie",
			"x-session-token",
			"x-access-token",
			"bearer",
			"proxy-authorization",
		];

		for (const key of Object.keys(redactedHeaders)) {
			const lowerKey = key.toLowerCase();
			if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
				// Keep first 10 chars and last 4 chars, redact middle
				const value = redactedHeaders[key];
				if (value && value.length > 14) {
					redactedHeaders[key] = `${value.substring(0, 10)}...${value.slice(-4)}`;
				} else if (value && value.length > 4) {
					redactedHeaders[key] = `${value.substring(0, 2)}...${value.slice(-2)}`;
				} else {
					redactedHeaders[key] = "[REDACTED]";
				}
			}
		}

		return redactedHeaders;
	}

	private async cloneResponse(response: Response): Promise<Response> {
		// Clone the response to avoid consuming the body
		return response.clone();
	}

	private async parseRequestBody(body: any): Promise<any> {
		if (!body) return null;

		if (typeof body === "string") {
			try {
				return JSON.parse(body);
			} catch {
				return body;
			}
		}

		if (body instanceof FormData) {
			const formObject: Record<string, any> = {};
			for (const [key, value] of body.entries()) {
				formObject[key] = value;
			}
			return formObject;
		}

		return body;
	}

	private async parseResponseBody(response: Response): Promise<{ body?: any; body_raw?: string }> {
		const contentType = response.headers.get("content-type") || "";

		try {
			if (contentType.includes("application/json")) {
				const body = await response.json();
				return { body };
			} else if (contentType.includes("text/event-stream")) {
				const body_raw = await response.text();
				return { body_raw };
			} else if (contentType.includes("text/")) {
				const body_raw = await response.text();
				return { body_raw };
			} else {
				// For other types, try to read as text
				const body_raw = await response.text();
				return { body_raw };
			}
		} catch (error) {
			// Silent error handling during runtime
			return {};
		}
	}

	public instrumentAll(): void {
		this.instrumentFetch();
		this.instrumentNodeHTTP();
	}

	public instrumentFetch(): void {
		// 检查是否启用了跟踪
		if (!this.traceLogFile) {
			return;
		}
		
		if (!global.fetch) {
			// Silent - fetch not available
			return;
		}

		// Check if already instrumented by checking for our marker
		if ((global.fetch as any).__claudeTraceInstrumented) {
			return;
		}

		const originalFetch = global.fetch;
		const logger = this;

		global.fetch = async function (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
			// Convert input to URL for consistency
			const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

			// Only intercept Claude API calls
			if (!logger.isClaudeAPI(url)) {
				return originalFetch(input, init);
			}

			const requestId = logger.generateRequestId();
			const requestTimestamp = Date.now();

			// Capture request details
			const requestData = {
				timestamp: requestTimestamp / 1000, // Convert to seconds (like Python version)
				method: init.method || "GET",
				url: url,
				headers: logger.redactSensitiveHeaders(Object.fromEntries(new Headers(init.headers || {}).entries())),
				body: await logger.parseRequestBody(init.body),
			};

			// Store pending request
			logger.pendingRequests.set(requestId, requestData);

			try {
				// Make the actual request
				const response = await originalFetch(input, init);
				const responseTimestamp = Date.now();

				// Clone response to avoid consuming the body
				const clonedResponse = await logger.cloneResponse(response);

				// Parse response body
				const responseBodyData = await logger.parseResponseBody(clonedResponse);

				// Create response data
				const responseData = {
					timestamp: responseTimestamp / 1000,
					status_code: response.status,
					headers: logger.redactSensitiveHeaders(Object.fromEntries(response.headers.entries())),
					...responseBodyData,
				};

				// Create paired request-response object
				const pair: RawPair = {
					request: requestData,
					response: responseData,
					logged_at: new Date().toISOString(),
				};

				// Remove from pending and add to pairs
				logger.pendingRequests.delete(requestId);
				logger.pairs.push(pair);

				// Write to log file
				await logger.writePairToLog(pair);

				// Generate HTML if enabled
				if (logger.config.enableRealTimeHTML) {
					await logger.generateHTML();
				}

				return response;
			} catch (error) {
				// Remove from pending requests on error
				logger.pendingRequests.delete(requestId);
				throw error;
			}
		};

		// Mark fetch as instrumented
		(global.fetch as any).__claudeTraceInstrumented = true;

		// Silent initialization
	}

	public instrumentNodeHTTP(): void {
		// 检查是否启用了跟踪
		if (!this.traceLogFile) {
			return;
		}
		
		try {
			const http = require("http");
			const https = require("https");
			const logger = this;

			// Instrument http.request
			if (http.request && !(http.request as any).__claudeTraceInstrumented) {
				const originalHttpRequest = http.request;
				http.request = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpRequest, options, callback, false);
				};
				(http.request as any).__claudeTraceInstrumented = true;
			}

			// Instrument http.get
			if (http.get && !(http.get as any).__claudeTraceInstrumented) {
				const originalHttpGet = http.get;
				http.get = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpGet, options, callback, false);
				};
				(http.get as any).__claudeTraceInstrumented = true;
			}

			// Instrument https.request
			if (https.request && !(https.request as any).__claudeTraceInstrumented) {
				const originalHttpsRequest = https.request;
				https.request = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpsRequest, options, callback, true);
				};
				(https.request as any).__claudeTraceInstrumented = true;
			}

			// Instrument https.get
			if (https.get && !(https.get as any).__claudeTraceInstrumented) {
				const originalHttpsGet = https.get;
				https.get = function (options: any, callback?: any) {
					return logger.interceptNodeRequest(originalHttpsGet, options, callback, true);
				};
				(https.get as any).__claudeTraceInstrumented = true;
			}
		} catch (error) {
			// Silent error handling
		}
	}

	private interceptNodeRequest(originalRequest: any, options: any, callback: any, isHttps: boolean) {
		// Parse URL from options
		const url = this.parseNodeRequestURL(options, isHttps);

		if (!this.isClaudeAPI(url)) {
			return originalRequest.call(this, options, callback);
		}

		const requestId = this.generateRequestId();
		const requestTimestamp = Date.now();
		let requestBody = "";

		// Create the request
		const req = originalRequest.call(this, options, (res: any) => {
			const responseTimestamp = Date.now();
			let responseBody = "";

			// Capture response data
			res.on("data", (chunk: any) => {
				responseBody += chunk;
			});

			res.on("end", async () => {
				// Process the captured request/response
				const requestData = {
					timestamp: requestTimestamp / 1000,
					method: options.method || "GET",
					url: url,
					headers: this.redactSensitiveHeaders(options.headers || {}),
					body: requestBody ? await this.parseRequestBody(requestBody) : null,
				};

				const responseData = {
					timestamp: responseTimestamp / 1000,
					status_code: res.statusCode,
					headers: this.redactSensitiveHeaders(res.headers || {}),
					...(await this.parseResponseBodyFromString(responseBody, res.headers["content-type"])),
				};

				const pair: RawPair = {
					request: requestData,
					response: responseData,
					logged_at: new Date().toISOString(),
				};

				this.pairs.push(pair);
				await this.writePairToLog(pair);

				if (this.config.enableRealTimeHTML) {
					await this.generateHTML();
				}
			});

			// Call original callback if provided
			if (callback) {
				callback(res);
			}
		});

		// Capture request body
		const originalWrite = req.write;
		req.write = function (chunk: any) {
			if (chunk) {
				requestBody += chunk;
			}
			return originalWrite.call(this, chunk);
		};

		return req;
	}

	private parseNodeRequestURL(options: any, isHttps: boolean): string {
		if (typeof options === "string") {
			return options;
		}

		const protocol = isHttps ? "https:" : "http:";
		const hostname = options.hostname || options.host || "localhost";
		const port = options.port ? `:${options.port}` : "";
		const path = options.path || "/";

		return `${protocol}//${hostname}${port}${path}`;
	}

	private async parseResponseBodyFromString(
		body: string,
		contentType?: string,
	): Promise<{ body?: any; body_raw?: string }> {
		try {
			if (contentType && contentType.includes("application/json")) {
				return { body: JSON.parse(body) };
			} else if (contentType && contentType.includes("text/event-stream")) {
				return { body_raw: body };
			} else {
				return { body_raw: body };
			}
		} catch (error) {
			return { body_raw: body };
		}
	}

	private async writePairToLog(pair: RawPair): Promise<void> {
		// 检查是否启用了跟踪
		if (!this.traceLogFile) {
			return;
		}
		
		try {
			const jsonLine = JSON.stringify(pair) + "\n";
			fs.appendFileSync(this.traceLogFile, jsonLine);
		} catch (error) {
			// Silent error handling during runtime
		}
	}

	private async generateHTML(): Promise<void> {
		// 检查是否启用了跟踪
		if (!this.htmlFile) {
			return;
		}
		
		try {
			const includeAllRequests = process.env.CLAUDE_TRACE_INCLUDE_ALL_REQUESTS === "true";
			await this.htmlGenerator.generateHTML(this.pairs, this.htmlFile, {
				title: `${this.pairs.length} API Calls`,
				timestamp: new Date().toISOString().replace("T", " ").slice(0, -5),
				includeAllRequests,
			});
			// Silent HTML generation
		} catch (error) {
			// Silent error handling during runtime
		}
	}

	public cleanup(): void {
		// 检查是否启用了跟踪
		if (!this.traceLogFile) {
			return;
		}
		
		console.log("Cleaning up orphaned requests...");

		for (const [, requestData] of this.pendingRequests.entries()) {
			const orphanedPair = {
				request: requestData,
				response: null,
				note: "ORPHANED_REQUEST - No matching response received",
				logged_at: new Date().toISOString(),
			};

			try {
				const jsonLine = JSON.stringify(orphanedPair) + "\n";
				fs.appendFileSync(this.traceLogFile, jsonLine);
			} catch (error) {
				console.log(`Error writing orphaned request: ${error}`);
			}
		}

		this.pendingRequests.clear();
		console.log(`Cleanup complete. Logged ${this.pairs.length} pairs`);

		//获取cc会话的sessionid
		let sessionId = this.getSessionIdFromLog();
		if(sessionId != '') {
			//将当前会话对应的cc日志文件，拷贝到.claude-trace/cclog目录
			this.copyCClogFile(sessionId);

			// Rename log file based on sessionid from first record
			this.renameTraceLogFileBySessionId(sessionId);
		}

		// Open browser if requested
		// const shouldOpenBrowser = process.env.CLAUDE_TRACE_OPEN_BROWSER === "true";
		// if (shouldOpenBrowser && fs.existsSync(this.htmlFile)) {
		// 	try {
		// 		spawn("open", [this.htmlFile], { detached: true, stdio: "ignore" }).unref();
		// 		console.log(`Opening ${this.htmlFile} in browser`);
		// 	} catch (error) {
		// 		console.log(`Failed to open browser: ${error}`);
		// 	}
		// }
	}

	private getSessionIdFromLog(): string {
		// 检查是否启用了跟踪
		if (!this.traceLogFile) {
			return '';
		}
		
		// Check if log file exists
		if (!fs.existsSync(this.traceLogFile)) {
			console.log("获取sessionId错误：Log file does not exist");
			return '';
		}

		// Read the first line of the JSONL file
		const fileContent = fs.readFileSync(this.traceLogFile, 'utf-8');
		const lines = fileContent.split('\n').filter(line => line.trim());
		
		if (lines.length === 0) {
			console.log("获取sessionId错误：Log file is empty");
			return '';
		}

		// 循环读取日志，直到找到user_id为止
		let userId = null;
		
		for (const line of lines) {
			const record = JSON.parse(line);
			userId = record?.request?.body?.metadata?.user_id;
			if (userId) {
				break;
			}
		}
		
		if (!userId) {
			console.log("获取sessionId错误：No user_id found in any record");
			return '';
		}

		// Extract sessionid from user_id (format: xxxx_session_{sessionid})
		const sessionMatch = userId.match(/_session_([^_]+)$/);
		if (!sessionMatch || !sessionMatch[1]) {
			console.log(`获取sessionId错误：No sessionid found in user_id: ${userId}`);
			return '';
		}

		return sessionMatch[1];
	}

	private copyCClogFile(sessionId: string): void {
		// 检查是否启用了跟踪
		if (!this.ccLogDir) {
			return;
		}
		
		//将当前会话对应的cc日志文件，拷贝到.claude-trace/cclog目录
		try {
			// 创建LogFileManager实例
			const logFileManager = new LogFileManager();

			// 获取当前工作目录作为项目路径
			const currentProjectPath = process.cwd();

			// 通过LogFileManager解析源日志目录
			const sourceLogDir = logFileManager.resolveLogDirectory(currentProjectPath);


			// 构建源文件路径（假设源文件名为sessionId.jsonl）
			const sourceFile = path.join(sourceLogDir, `${sessionId}.jsonl`);

			// 构建目标文件路径
			this.ccLogFile = path.join(this.ccLogDir, `${sessionId}.jsonl`);

			// 检查源文件是否存在
			if (!fs.existsSync(sourceFile)) {
				console.log(`源CC日志文件不存在: ${sourceFile}`);
				return;
			}

			// 拷贝文件
			fs.copyFileSync(sourceFile, this.ccLogFile);
			console.log(`CC日志文件已从 ${sourceFile} 拷贝到 ${this.ccLogFile}`);

			// 读取sourceLogDir目录下所有agent_*.jsonl文件，读取第一条记录的sessionId，找到与sessionId变量值相同的文件，拷贝到ccLogDir目录
			const files = fs.readdirSync(sourceLogDir).filter(file => file.startsWith('agent-') && file.endsWith('.jsonl'));

			for (const file of files) {
				const filePath = path.join(sourceLogDir, file);
				const content = fs.readFileSync(filePath, 'utf-8');
				const lines = content.split('\n').filter(line => line.trim());

				if (lines.length > 0) {
					try {
						const firstRecord = JSON.parse(lines[0]);
						const recordSessionId = firstRecord?.sessionId;
						if (recordSessionId === sessionId) {
							// 构建目标文件路径
							const ccAgentLogFile = path.join(this.ccLogDir, file);
							// 拷贝文件
							fs.copyFileSync(filePath, ccAgentLogFile);
							console.log(`SubAgent的CC日志文件已从 ${filePath} 拷贝到 ${ccAgentLogFile}`);
						}
					} catch (parseError) {
						// 静默处理解析错误，继续下一个文件
						continue;
					}
				}
			}

			// 兼容subagents日志的另一种存放方式：sourceLogDir/{sessionId}/subagents/目录
			const subagentsDir = path.join(sourceLogDir, sessionId, 'subagents');
			if (fs.existsSync(subagentsDir)) {
				try {
					const subagentFiles = fs.readdirSync(subagentsDir).filter(file => file.startsWith('agent-') && file.endsWith('.jsonl'));
					
					for (const file of subagentFiles) {
						const sourceFilePath = path.join(subagentsDir, file);
						const targetFilePath = path.join(this.ccLogDir, file);
						
						// 直接拷贝文件，因为已经在正确的sessionId目录下
						fs.copyFileSync(sourceFilePath, targetFilePath);
						console.log(`SubAgent的CC日志文件已从 ${sourceFilePath} 拷贝到 ${targetFilePath}`);
					}
				} catch (error) {
					console.log(`处理subagents目录时出错: ${error}`);
				}
			}

		} catch (error) {
			console.log(`拷贝CC日志文件时出错: ${error}`);
		}
	}

	private renameTraceLogFileBySessionId(sessionId: string): void {
		// 检查是否启用了跟踪
		if (!this.traceLogFile) {
			return;
		}
		
		try {
			
			const logDir = path.dirname(this.traceLogFile);
			const newLogFile = path.join(logDir, `${sessionId}.jsonl`);

			// Rename the file
			fs.renameSync(this.traceLogFile, newLogFile);
			console.log(`Log file renamed from ${path.basename(this.traceLogFile)} to ${sessionId}.jsonl`);
			
			// Update the logFile path for future reference
			this.traceLogFile = newLogFile;

		} catch (error) {
			console.log(`Error renaming log file: ${error}`);
		}
	}

	public getStats() {
		return {
			totalPairs: this.pairs.length,
			pendingRequests: this.pendingRequests.size,
			logFile: this.traceLogFile,
			htmlFile: this.htmlFile,
		};
	}
}

// Global logger instance
let globalLogger: ClaudeTrafficLogger | null = null;

// Track if event listeners have been set up
let eventListenersSetup = false;

export function initializeInterceptor(config?: InterceptorConfig): ClaudeTrafficLogger {
	if (globalLogger) {
		console.warn("Interceptor already initialized");
		return globalLogger;
	}

	globalLogger = new ClaudeTrafficLogger(config);
	globalLogger.instrumentAll();

	// Setup cleanup on process exit only once
	if (!eventListenersSetup) {
		const cleanup = () => {
			if (globalLogger) {
				globalLogger.cleanup();
			}
		};

		process.on("exit", cleanup);
		process.on("SIGINT", cleanup);
		process.on("SIGTERM", cleanup);
		process.on("uncaughtException", (error) => {
			console.error("Uncaught exception:", error);
			cleanup();
			process.exit(1);
		});

		eventListenersSetup = true;
	}

	return globalLogger;
}

export function getLogger(): ClaudeTrafficLogger | null {
	return globalLogger;
}
