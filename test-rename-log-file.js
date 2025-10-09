/**
 * 测试 interceptor.ts 中的 renameLogFileBySessionId 方法
 * 
 * 测试覆盖的场景：
 * 1. 正常情况：成功提取 sessionid 并重命名文件
 * 2. 文件不存在的情况
 * 3. 文件为空的情况
 * 4. JSON 格式错误的情况
 * 5. 缺少 user_id 的情况
 * 6. user_id 格式不正确的情况
 * 7. 文件重命名失败的情况
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 创建临时测试目录
const testDir = path.join(os.tmpdir(), 'claude-trace-test-' + Date.now());
fs.mkdirSync(testDir, { recursive: true });

console.log(`测试目录: ${testDir}`);

// 模拟 ClaudeTrafficLogger 类的部分功能
class TestClaudeTrafficLogger {
    constructor(logFile) {
        this.logFile = logFile;
    }

    // 复制 interceptor.ts 中的 renameLogFileBySessionId 方法
    renameLogFileBySessionId() {
        try {
            // Check if log file exists
            if (!fs.existsSync(this.logFile)) {
                console.log("Log file does not exist, skipping rename");
                return;
            }

            // Read the first line of the JSONL file
            const fileContent = fs.readFileSync(this.logFile, 'utf-8');
            const lines = fileContent.split('\n').filter(line => line.trim());
            
            if (lines.length === 0) {
                console.log("Log file is empty, skipping rename");
                return;
            }

            // Parse the first record
            const firstRecord = JSON.parse(lines[0]);
            
            // Extract user_id from request.metadata.user_id
            const userId = firstRecord?.request?.metadata?.user_id;
            if (!userId) {
                console.log("No user_id found in first record, skipping rename");
                return;
            }

            // Extract sessionid from user_id (format: xxxx_session_{sessionid})
            const sessionMatch = userId.match(/_session_([^_]+)$/);
            if (!sessionMatch || !sessionMatch[1]) {
                console.log(`No sessionid found in user_id: ${userId}, skipping rename`);
                return;
            }

            const sessionId = sessionMatch[1];
            const logDir = path.dirname(this.logFile);
            const newLogFile = path.join(logDir, `${sessionId}.jsonl`);

            // Rename the file
            fs.renameSync(this.logFile, newLogFile);
            console.log(`Log file renamed from ${path.basename(this.logFile)} to ${sessionId}.jsonl`);
            
            // Update the logFile path for future reference
            this.logFile = newLogFile;

        } catch (error) {
            console.log(`Error renaming log file: ${error}`);
        }
    }
}

// 测试用例
const tests = [
    {
        name: "测试1: 正常情况 - 成功提取sessionid并重命名文件",
        setup: () => {
            const logFile = path.join(testDir, 'test1.jsonl');
            const testData = {
                request: {
                    metadata: {
                        user_id: "user123_session_abc123def"
                    }
                },
                response: { status: 200 }
            };
            fs.writeFileSync(logFile, JSON.stringify(testData) + '\n');
            return logFile;
        },
        verify: (logFile) => {
            const expectedFile = path.join(testDir, 'abc123def.jsonl');
            return fs.existsSync(expectedFile) && !fs.existsSync(logFile);
        }
    },
    {
        name: "测试2: 文件不存在的情况",
        setup: () => {
            return path.join(testDir, 'nonexistent.jsonl');
        },
        verify: (logFile) => {
            return !fs.existsSync(logFile); // 文件仍然不存在
        }
    },
    {
        name: "测试3: 文件为空的情况",
        setup: () => {
            const logFile = path.join(testDir, 'empty.jsonl');
            fs.writeFileSync(logFile, '');
            return logFile;
        },
        verify: (logFile) => {
            return fs.existsSync(logFile) && fs.readFileSync(logFile, 'utf-8') === '';
        }
    },
    {
        name: "测试4: JSON格式错误的情况",
        setup: () => {
            const logFile = path.join(testDir, 'invalid-json.jsonl');
            fs.writeFileSync(logFile, 'invalid json content\n');
            return logFile;
        },
        verify: (logFile) => {
            return fs.existsSync(logFile); // 文件应该仍然存在，没有被重命名
        }
    },
    {
        name: "测试5: 缺少user_id的情况",
        setup: () => {
            const logFile = path.join(testDir, 'no-userid.jsonl');
            const testData = {
                request: {
                    metadata: {}
                },
                response: { status: 200 }
            };
            fs.writeFileSync(logFile, JSON.stringify(testData) + '\n');
            return logFile;
        },
        verify: (logFile) => {
            return fs.existsSync(logFile); // 文件应该仍然存在，没有被重命名
        }
    },
    {
        name: "测试6: user_id格式不正确的情况",
        setup: () => {
            const logFile = path.join(testDir, 'invalid-userid.jsonl');
            const testData = {
                request: {
                    metadata: {
                        user_id: "invalid_format_without_session"
                    }
                },
                response: { status: 200 }
            };
            fs.writeFileSync(logFile, JSON.stringify(testData) + '\n');
            return logFile;
        },
        verify: (logFile) => {
            return fs.existsSync(logFile); // 文件应该仍然存在，没有被重命名
        }
    },
    {
        name: "测试7: 多种sessionid格式测试",
        setup: () => {
            const logFile = path.join(testDir, 'multi-format.jsonl');
            const testData = {
                request: {
                    metadata: {
                        user_id: "complex_user_123_session_xyz789"
                    }
                },
                response: { status: 200 }
            };
            fs.writeFileSync(logFile, JSON.stringify(testData) + '\n');
            return logFile;
        },
        verify: (logFile) => {
            const expectedFile = path.join(testDir, 'xyz789.jsonl');
            return fs.existsSync(expectedFile) && !fs.existsSync(logFile);
        }
    },
    {
        name: "测试8: 包含多行数据的JSONL文件",
        setup: () => {
            const logFile = path.join(testDir, 'multiline.jsonl');
            const testData1 = {
                request: {
                    metadata: {
                        user_id: "user456_session_multitest123"
                    }
                },
                response: { status: 200 }
            };
            const testData2 = {
                request: {
                    metadata: {
                        user_id: "another_user_session_different"
                    }
                },
                response: { status: 201 }
            };
            fs.writeFileSync(logFile, JSON.stringify(testData1) + '\n' + JSON.stringify(testData2) + '\n');
            return logFile;
        },
        verify: (logFile) => {
            const expectedFile = path.join(testDir, 'multitest123.jsonl');
            return fs.existsSync(expectedFile) && !fs.existsSync(logFile);
        }
    }
];

// 运行测试
console.log('开始运行测试...\n');

let passedTests = 0;
let totalTests = tests.length;

tests.forEach((test, index) => {
    console.log(`运行 ${test.name}`);
    
    try {
        // 设置测试环境
        const logFile = test.setup();
        
        // 创建测试实例并运行方法
        const logger = new TestClaudeTrafficLogger(logFile);
        
        // 捕获控制台输出
        const originalLog = console.log;
        const logs = [];
        console.log = (...args) => {
            logs.push(args.join(' '));
        };
        
        // 运行被测试的方法
        logger.renameLogFileBySessionId();
        
        // 恢复控制台输出
        console.log = originalLog;
        
        // 验证结果
        const passed = test.verify(logFile);
        
        if (passed) {
            console.log(`✅ ${test.name} - 通过`);
            passedTests++;
        } else {
            console.log(`❌ ${test.name} - 失败`);
        }
        
        // 显示捕获的日志
        if (logs.length > 0) {
            console.log(`   日志输出: ${logs.join(', ')}`);
        }
        
    } catch (error) {
        console.log(`❌ ${test.name} - 异常: ${error.message}`);
    }
    
    console.log('');
});

// 清理测试目录
try {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log(`测试目录已清理: ${testDir}`);
} catch (error) {
    console.log(`清理测试目录失败: ${error.message}`);
}

// 输出测试结果
console.log(`\n测试完成: ${passedTests}/${totalTests} 个测试通过`);

if (passedTests === totalTests) {
    console.log('🎉 所有测试都通过了！');
    process.exit(0);
} else {
    console.log('❌ 有测试失败');
    process.exit(1);
}