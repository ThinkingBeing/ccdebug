// 创建当前时间的Date对象（默认使用本地时间，但后续会转换为UTC）
const now = new Date();

// 转换为ISO 8601格式的UTC时间，自动包含'Z'后缀
const isoTime = now.toISOString();

// 输出结果
console.log(isoTime);