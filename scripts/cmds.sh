# 启动web（ccdemo）
npx tsx src/cli.ts --serve --port 4101 --project ccdemo

# 启动web（其他目录）
npx tsx src/cli.ts --serve --port 4102 --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/0011
npx tsx src/cli.ts --serve --port 4103 --project /Users/ligf/工作/Code/平台/ccmodeling/platform_ai/x_0338

# 启动cc（快速测试）
npx --node-options="--inspect-brk=9321" tsx src/cli.ts  --run-with -p "1+2=?" --output-format stream-json --verbose

npx --inspect-brk tsx src/cli.ts  --run-with -p "1+2=?" --output-format stream-json --verbose

# 启动cc（完整测试）
cd ccdemo && cat ../scripts/test.md | npx tsx ../src/cli.ts --run-with -p  --output-format stream-json --verbose
