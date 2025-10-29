#!/bin/bash
# 先定位到当前脚本文件所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 清空Claude相关目录下的所有文件
echo "开始清理Claude缓存文件..."
echo "清除Claude缓存文件"
rm -rf ~/.claude/todos/*
rm -rf ~/.claude/statsig/*
rm -rf ~/.claude/shell-snapshots/*
rm -rf ~/.claude/projects/*

echo "清理日志文件"
rm -rf ../.claude-trace/*

echo "清理code目录"
rm -f ../code/AppForm/*.json
rm -f ../code/AppGrid/*.json
rm -f ../code/Entity/*.json
rm -f ../code/FunctionPage/*.json
rm -f ../code/MyFunction/*.json
rm -f ../code/ParamType/*.json
rm -f ../code/Param/*.json

echo "清理conversation目录"
rm -f ../conversation/*.json

echo "清理specs目录"
rm -rf ../specs/*

echo "Claude缓存、日志和临时文件清理完成！"