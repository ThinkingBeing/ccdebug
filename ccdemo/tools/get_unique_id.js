function generateUniqueString() {
    // 字符集：数字 + 小写字母（共36个字符，不区分大小写场景下足够用）
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    
    // 取当前时间戳后3位（毫秒级）作为基础
    const timePart = Date.now().toString().slice(-3);
    
    // 再随机生成3位字符，组合成6位
    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }
    
    // 组合结果（时间部分+随机部分）
    return timePart + result;
}

// 示例使用
const uniqueStr = generateUniqueString();
console.log(uniqueStr); // 输出类似：456xyz、789abc 等6位字符串（全小写+数字）