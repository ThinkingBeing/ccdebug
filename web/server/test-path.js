// 测试路径转换逻辑
const testCases = [
  {
    input: "D:\\mysoft\\cctest\\tests\\办公资产_1\\work",
    expected: "D--mysoft-cctest-tests------1-work"
  },
  {
    input: "/Users/ligf/Code/claude-code/ccdebug/ccdemo",
    expected: "-Users-ligf-Code-claude-code-ccdebug-ccdemo"
  },
  {
    input: "/Users/ligf/Code/项目/测试",
    expected: "-Users-ligf-Code------"  // 修正：4个路径分隔符 + 项目(2个字符) + 测试(2个字符) = 6个 -
  }
];

function generateProjectId(projectPath) {
  return projectPath.replace(/[\/\\:_]/g, '-').replace(/[^\x00-\x7F]/g, '-');
}

console.log('测试路径转换逻辑:');
console.log('='.repeat(50));

testCases.forEach((testCase, index) => {
  const result = generateProjectId(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`测试 ${index + 1}:`);
  console.log(`输入: ${testCase.input}`);
  console.log(`期望: ${testCase.expected}`);
  console.log(`结果: ${result}`);
  console.log(`通过: ${passed ? '✓' : '✗'}`);
  
  if (!passed) {
    console.log(`差异分析:`);
    console.log(`  期望长度: ${testCase.expected.length}`);
    console.log(`  结果长度: ${result.length}`);
    for (let i = 0; i < Math.max(testCase.expected.length, result.length); i++) {
      const expectedChar = testCase.expected[i] || '(无)';
      const resultChar = result[i] || '(无)';
      if (expectedChar !== resultChar) {
        console.log(`  位置 ${i}: 期望 '${expectedChar}', 得到 '${resultChar}'`);
      }
    }
  }
  
  console.log('-'.repeat(30));
});