# 需求背景
Agent执行的不确定性全部来自LLM，如果我们希望Agent的执行结果可预测，用户需要对LLM的输入进行严格控制。
在cc的时间线日志中，有两类节点是有LLM决定的，Agent_Message和Tool_Use，Agent_Message是LLM直接回复的消息，Tool_Use是由LLM决定使用哪些工具。
所以我们需要对这两类节点的LLM输入进行反复调试、验证，确保每次执行的结果是可预测的。

# 功能需求
- 用户分析时间线日志，发现某一个Agent_Message或Tool_Use节点的执行结果不符合预期
- 由于Agent_Message和Tool_Use节点是由某一次对LLM的请求决定的，所以用户需要能够查看该次请求的LLM输入和输出，以便分析问题所在
- 用户需要实时修改LLM的输入，重新向LLM发送请求，根据LLM的返回验证对输入修改的有效性
- 由于LLM的随机性，仅验证一次是不够的，用户需要批量请求LLM，观察结果的正确率

# 实现方案
- 在步骤详情面板增加一个”调试“按钮，点击按钮打开新浏览器标签页，展示”调试页面“
- 进入调试页面，先通过如下逻辑加载LLM请求数据：
  - 1、当前日志文件名是sessionid.jsonl，通过sessionid到项目目录的.claude-trace子目录中找到同名的jsonl文件，这就是LLM请求的日志文件；
  - 2、将LLM请求日志中的body_raw转换成JSON，先将数组拼接成字符串，然后将字符串转换成JSON对象
  - 3、找到当前时间线节点日志JSON中的”message.id“属性值，与LLM请求日志每一套JSON记录中的body_raw.data.message.id的值进行比较，找到时间线日志节点对应的LLM请求日志记录
- 将LLM请求日志的完整JSON显示在调试页面。其他功能先不开发，后续再逐步迭代。