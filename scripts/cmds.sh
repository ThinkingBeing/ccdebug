# 启动web（ccdemo）
npx --node-options="--inspect-brk=9321" tsx src/cli.ts --serve --port 4101 --project ccdemo

npx tsx src/cli.ts --serve --port 4101 --project ccdemo

npx tsx src/cli.ts -l --port 4101 --project .

npx --node-options="--inspect-brk=9321" tsx src/cli.ts -l --serve --port 4102 --project .

# 启动web（其他目录）
npx tsx src/cli.ts -l --port 4001 --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/0011_原型验证

npx tsx src/cli.ts -l --port 4102 --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/0011_需求分支

npx tsx src/cli.ts -l --port 4102 --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/0011

npx --node-options="--inspect-brk=9321" tsx src/cli.ts -l --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/x_0338

# 启动cc（快速测试）
npx --node-options="--inspect-brk=9321" tsx src/cli.ts  --run-with -p "1+2=?" --output-format stream-json --verbose

npx tsx ../src/cli.ts --claude-path "/Users/ligf/.local/bin/claude"  --run-with -p "启动SubAgent计算圆周率，精确到第十位" --output-format stream-json --verbose

npx tsx src/cli.ts --claude-path "/opt/homebrew/bin/claude"  --run-with -p "1+2=?" --output-format stream-json --verbose

claude -p "1+2=?" --output-format stream-json --verbose

/opt/homebrew/bin/claude -p "1+2=?" --output-format stream-json --verbose

npx tsx src/cli.ts --claude-path "/Users/ligf/.nvm/versions/node/v22.20.0/lib/node_modules/@anthropic-ai/claude-code/cli.js"  --run-with -p "1+2=?" --output-format stream-json --verbose

"/Users/ligf/.nvm/versions/node/v22.20.0/lib/node_modules/@anthropic-ai/claude-code/cli.js"  -p "1+2=?" --output-format stream-json --verbose

# 启动cc（完整测试）
cd ccdemo && cat ../scripts/test.md | npx tsx ../src/cli.ts --run-with -p  --output-format stream-json --verbose

npm install -g @myskyline_ai-ccdebug-0.2.0.tgz