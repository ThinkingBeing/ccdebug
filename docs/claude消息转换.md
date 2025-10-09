## 任务：转换JSON格式。
## 转换规则：
- 转换后JSON将消息合并成两类，分别是text和tool_use
- text消息的类型是“text_delta”
- tool_use消息的类型是“tool_use”和“input_json_delta”
- 注意转换后的消息顺序应该与转换前一致

## 转换示例：
```待转换JSON样例
[
    {
      "type": "message_start",
      "message": {
        "id": "msg_202510061306260c8fd0f42ae74af3",
        "type": "message",
        "role": "assistant",
        "model": "glm-4.5",
        "content": [],
        "stop_reason": null,
        "stop_sequence": null,
        "usage": {
          "input_tokens": 0,
          "output_tokens": 0
        }
      }
    },
    {
      "type": "ping"
    },
    {
      "type": "content_block_start",
      "index": 0,
      "content_block": {
        "type": "text",
        "text": ""
      }
    },
    {
      "type": "content_block_delta",
      "index": 0,
      "delta": {
        "type": "text_delta",
        "text": "我来帮你研究Agent设计的概念和方法"
      }
    },
    {
      "type": "content_block_delta",
      "index": 0,
      "delta": {
        "type": "text_delta",
        "text": "。让我先了解当前项目结构和信息源配置。\n"
      }
    },
    {
      "type": "content_block_stop",
      "index": 0
    },
    {
      "type": "content_block_start",
      "index": 1,
      "content_block": {
        "type": "tool_use",
        "id": "call_ae4s5txpvt",
        "name": "TodoWrite",
        "input": {}
      }
    },
    {
      "type": "content_block_delta",
      "index": 1,
      "delta": {
        "type": "input_json_delta",
        "partial_json": "{\"todos\":[{\"content\": \"读取项目README.md了解项目背景\", \"id\": \"1\", \"status\": \"pending\", \"activeForm\": \"读取项目README.md了解项目背景\"}, {\"content\": \"查看信息源配置文件Sources-test.json5\", \"id\": \"2\", \"status\": \"pending\", \"activeForm\": \"查看信息源配置文件\"}, {\"content\": \"搜索现有资料中关于Agent设计的内容\", \"id\": \"3\", \"status\": \"pending\", \"activeForm\": \"搜索现有资料中关于Agent设计的内容\"}, {\"content\": \"从信息源获取Agent设计相关信息\", \"id\": \"4\", \"status\": \"pending\", \"activeForm\": \"从信息源获取Agent设计相关信息\"}, {\"content\": \"整理分析信息并生成知识文档\", \"id\": \"5\", \"status\": \"pending\", \"activeForm\": \"整理分析信息并生成知识文档\"}]}"
      }
    },
    {
      "type": "content_block_stop",
      "index": 1
    },
    {
      "type": "message_delta",
      "delta": {
        "stop_reason": "tool_use",
        "stop_sequence": null
      },
      "usage": {
        "input_tokens": 22656,
        "output_tokens": 351,
        "cache_read_input_tokens": 1808
      }
    },
    {
      "type": "message_stop"
    }
  ]
```
```JSON样例转换后
[
      {
        "type": "text",
        "text": "我来帮你研究Agent设计的概念和方法。让我先了解当前项目结构和信息源配置。\n"
      },
      {
        "type": "tool_use",
        "id": "call_ae4s5txpvt",
        "name": "TodoWrite",
        "input": {
            "todos": [
                {
                    "content": "读取项目README.md了解项目背景",
                    "id": "1",
                    "status": "pending",
                    "activeForm": "读取项目README.md了解项目背景"
                },
                {
                    "content": "查看信息源配置文件Sources-test.json5",
                    "id": "2",
                    "status": "pending",
                    "activeForm": "查看信息源配置文件"
                },
                {
                    "content": "搜索现有资料中关于Agent设计的内容",
                    "id": "3",
                    "status": "pending",
                    "activeForm": "搜索现有资料中关于Agent设计的内容"
                },
                {
                    "content": "从信息源获取Agent设计相关信息",
                    "id": "4",
                    "status": "pending",
                    "activeForm": "从信息源获取Agent设计相关信息"
                },
                {
                    "content": "整理分析信息并生成知识文档",
                    "id": "5",
                    "status": "pending",
                    "activeForm": "整理分析信息并生成知识文档"
                }
            ]
        }
      }
    ]
```