#!/usr/bin/env node

// 引入内置的crypto模块生成UUID
const crypto = require('crypto');

/**
 * 生成一个UUID v4
 * @returns {string} 格式化后的UUID
 */
function generateUUID() {
  // 生成16字节的随机数据
  const buffer = crypto.randomBytes(16);
  
  // 设置UUID版本和变体
  buffer[6] = (buffer[6] & 0x0F) | 0x40; // v4
  buffer[8] = (buffer[8] & 0x3F) | 0x80; // RFC 4122变体
  
  // 转换为十六进制并格式化
  return buffer.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

/**
 * 解析命令行参数获取要生成的UUID数量
 * @returns {number} 要生成的UUID数量，默认为1
 */
function getCountFromArgs() {
  // 命令行参数数组，第一个是node路径，第二个是脚本路径，第三个开始是用户参数
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return 1;
  }
  
  // 尝试将第一个参数解析为数字
  const count = parseInt(args[0], 10);
  
  // 验证数字是否有效
  if (isNaN(count) || count < 1) {
    console.error('请提供一个有效的正整数作为要生成的UUID数量');
    process.exit(1);
  }
  
  return count;
}

/**
 * 主函数：生成并输出指定数量的UUID
 */
function main() {
  try {
    const count = getCountFromArgs();
    for (let i = 0; i < count; i++) {
      console.log(generateUUID());
    }
  } catch (error) {
    console.error('生成UUID时出错：', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();
