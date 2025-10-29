const http = require('http');

// 请求参数
const postData = JSON.stringify({
  cleanDir: "D:\\AITEST\\slxt_ligf\\tsglxt\\data\\metadata\\Customize\\MetaDataDesign",
  containerId: "feb163f8387fdb56d77479934576808248f9504c830024c0e895899d679ce33a"
});

// 请求配置
const options = {
  hostname: '10.20.21.14',
  port: 3000,
  path: '/restart',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

// 发送请求
const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    console.log('响应内容:', chunk.toString());
  });
  
  res.on('end', () => {
    console.log('请求完成');
  });
});

// 错误处理
req.on('error', (e) => {
  console.error(`请求遇到错误: ${e.message}`);
});

// 写入请求数据
req.write(postData);
req.end();