// 获取节点颜色
export const getNodeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'user_message': '#1890ff',      // 蓝色 - 用户查询
    'assistant_thinking': '#faad14', // 橙色 - AI思考
    'assistant_message': '#52c41a',  // 绿色 - AI回复
    'tool_call': '#722ed1',         // 紫色 - 工具调用
    'tool_result': '#13c2c2',       // 青色 - 工具结果
    'agent_child': '#f5222d',       // 红色 - 子代理
    'agent_end': '#8c8c8c'          // 灰色 - 对话结束
  }
  return colors[type] || '#d9d9d9'
}

// 获取节点浅色背景
export const getNodeLightColor = (type: string): string => {
  const lightColors: Record<string, string> = {
    'user_message': '#e6f7ff',      // 浅蓝色
    'assistant_thinking': '#fff7e6', // 浅橙色
    'assistant_message': '#f6ffed',  // 浅绿色
    'tool_call': '#f9f0ff',         // 浅紫色
    'tool_result': '#e6fffb',       // 浅青色
    'agent_child': '#fff1f0',       // 浅红色
    'agent_end': '#f5f5f5'          // 浅灰色
  }
  return lightColors[type] || '#f5f5f5'
}