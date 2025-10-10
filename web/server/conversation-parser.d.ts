export declare class ConversationParser {
    private logDir;
    /**
     * 设置日志目录
     * @param logDir 日志目录路径
     */
    setLogDirectory(logDir: string): void;
    /**
     * 从日志目录推断项目目录
     * @returns 项目目录路径
     */
    private inferProjectDirectory;
    /**
     * 从cc日志目录加载对话日志
     * @param fileId 文件ID
     * @returns 对话数据
     */
    parseFile(fileId: string): Promise<any>;
    /**
     * 解析JSONL文件内容为对话数据
     * @param lines JSONL文件的行数组
     * @returns 对话数据数组
     */
    parseConversations(lines: string[]): any[];
    private isConversationStart;
    private generateConversationId;
    private parseStep;
    private determineStepType;
    private extractContent;
    private extractUserMessageContent;
    private extractAssistantMessageContent;
    private extractAssistantThinkingContent;
    private extractToolCallContent;
    private extractToolResultContent;
    private extractAgentChildContent;
    private extractAgentEndContent;
    private extractFallbackContent;
    private extractMetadata;
    /**
     * 根据文件ID获取对话数据
     * @param fileId 文件ID
     * @param lines 文件内容行
     * @returns 对话数据数组
     */
    getConversationsByFileId(fileId: string, lines: string[]): any[];
}
//# sourceMappingURL=conversation-parser.d.ts.map