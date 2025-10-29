# 完整启动
npx tsx src/cli.ts --serve --port 3001 --project /Users/ligf/Code/claude-code/ccdebug/ccdemo --include-all-requests

# 仅启动web
npx tsx src/cli.ts --serve --port 3008 --project /Users/ligf/Code/claude-code/ccdebug/ccdemo

npx tsx src/cli.ts --serve --port 3001 --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/0011

npx tsx src/cli.ts --serve --port 3008 --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/x_0338


npx tsx ../src/cli.ts

npx tsx ../src/cli.ts --serve --port 3007


cat 3.图书管理应用.md | npx tsx ../src/cli.ts --run-with -p "请按要求工作" --output-format stream-json --verbose

cat docs/test.md | npx tsx ../src/cli.ts --run-with -p "/DevSolo 请按要求工作" --output-format stream-json --verbose

# 主题：如何设计Agent