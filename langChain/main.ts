// @ts-ignore Node 24 可直接运行 TypeScript，无需额外安装 @types/node
import { createInterface } from 'node:readline/promises'
import { Agent } from './src/agent/index.ts'
import { TavilySearch } from '@langchain/tavily'
import { createMiddleware, AIMessage } from 'langchain'

const nodeProcess = globalThis as unknown as {
    process: { stdin: unknown; stdout: unknown }
}

const tools = [
    new TavilySearch({
        maxResults: 3 // 最多查询 3 个结果
    })
]

const createMessageLimitMiddleware = (maxMessages: number = 50) => {
    return createMiddleware({
        name: "MessageLimitMiddleware",
        beforeModel: {
            canJumpTo: ["end"],
            hook: (state) => {
                if (state.messages.length === maxMessages) {
                    return {
                        messages: [new AIMessage("⚠️ 已达 50 轮，请在下一轮给出最终答案。")],
                        jumpTo: "end",
                    };
                }
                return;
            }
        },
        afterModel: (state) => {
            const lastMessage = state.messages[state.messages.length - 1];
            console.log(`Model returned: ${lastMessage.content}`);
            return;
        },
    });
};

const createRetryMiddleware = (maxRetries: number = 3) => {
    return createMiddleware({
        name: "RetryMiddleware",
        wrapModelCall: (request, handler) => {
            console.log('RetryMiddleware');
            for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                    return handler(request);
                } catch (e) {
                    if (attempt === maxRetries - 1) {
                        throw e;
                    }
                    console.log(`Retry ${attempt + 1}/${maxRetries} after error: ${e}`);
                }
            }
            throw new Error("Unreachable");
        },
    });
};

const toolMonitoringMiddleware = createMiddleware({
    name: "ToolMonitoringMiddleware",
    wrapToolCall: (request, handler) => {
        console.log(`Executing tool: ${request.toolCall.name}`);
        console.log(`Arguments: ${JSON.stringify(request.toolCall.args)}`);
        try {
            const result = handler(request);
            console.log("Tool completed successfully");
            return result;
        } catch (e) {
            console.log(`Tool failed: ${e}`);
            throw e;
        }
    },
});

const agent = new Agent({
    tools,
    middleware: [createMessageLimitMiddleware(), createRetryMiddleware(), toolMonitoringMiddleware]
})

const rl = createInterface({
    input: nodeProcess.process.stdin,
    output: nodeProcess.process.stdout
})

console.log('Agent 已启动，输入问题后回车查询天气，输入 exit 退出。')

while (true) {
    const question = (await rl.question('你: ')).trim()

    if (!question) continue

    if (question.toLowerCase() === 'exit') {
        console.log('已退出。')
        break
    }

    console.log('正在查询...')
    try {
        const answer = await agent.ask(question)
        console.log(`Agent: ${answer}`)
    } catch (error) {
        console.error('查询失败:', error instanceof Error ? error.message : error)
    }
}

rl.close()
