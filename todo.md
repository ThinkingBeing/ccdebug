# 功能缺陷
- [X] trace日志文件重命名失败，提示：No user_id found in first record, skipping rename
  
# 重要改进
- [ ] 支持智能分析：AI按用户要求智能分析cc轨迹，定位cc执行偏差的原因

# 一般改进
- [X] cc运行结束时，将cc日志拷贝到.claude-trace/cclog目录，默认从此目录打开cc日志
- [X] 发送llm请求失败，因为llm的URL和key读取错误，应该按如下逻辑读取：
  - 首先从cc项目目录的.claude/settings.local.json中获取环境变量设置；
  - 如果没找到，从全局cc目录的设置文件获取
  - 如果没找到，从全局环境变量获取

# 体验优化
- [X] 时间线时间格式是UTC，应转换为本地时区
- [X] 步骤详情中的JSON日志框要自动换行显示
- [X] 命令行增加版本命令参数，运行开始也显示版本


