const http = require('http');

// 从命令行参数获取 session_id（第一个参数为 node，第二个为文件名，第三个开始为自定义参数）
const sessionId = process.argv[2];

if (!sessionId) {
  console.error('请提供 session_id 作为命令行参数，例如：node sendRequest.js "your-session-id"');
  process.exit(1); // 退出程序
}

// 请求配置
const options = {
  hostname: 'localhost',
  port: 8085,
  path: '/api/hooks/sessionEnd',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// 动态构建请求数据（session_id 为传入的参数）
const postData = JSON.stringify({
  "session_id": sessionId,
  "cwd": "/app/workspace/platform_ai/x_0338",
  "hook_event_name": "SessionEnd"
});

// 发送请求
const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);

  res.on('data', (d) => {
    process.stdout.write(d);
  });

  res.on('end', () => {
    console.log('\n请求已完成');
  });
});

// 错误处理
req.on('error', (error) => {
  console.error('请求出错:', error);
});

// 发送数据
req.write(postData);
req.end();