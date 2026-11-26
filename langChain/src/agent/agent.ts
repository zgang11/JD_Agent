import 'dotenv/config'
import { MemorySaver } from '@langchain/langgraph'
// import type { StateDefinitionInit } from '@langchain/langgraph'
import { createAgent, type CreateAgentParams } from 'langchain'
import { HumanMessage } from '@langchain/core/messages'

export interface AgentOptions {
    model?: string
    maxResults?: number
    threadId?: string
    tools?: CreateAgentParams['tools']
    checkpointer?: CreateAgentParams['checkpointer']
    // stateSchema?: StateDefinitionInit
    middleware?: CreateAgentParams['middleware']
}

export class Agent {
    private readonly agent: ReturnType<typeof createAgent>
    private readonly threadId: string
    private readonly model: string
    private readonly tools: CreateAgentParams['tools']
    private readonly checkpointer: CreateAgentParams['checkpointer']
    // private readonly stateSchema: StateDefinitionInit | undefined = undefined
    private readonly middleware: CreateAgentParams['middleware'] = []

    constructor(options: AgentOptions = {}) {
        this.model = options.model ?? 'deepseek:deepseek-flash'
        this.tools = options.tools ?? []
        this.checkpointer = options.checkpointer ?? new MemorySaver()
        // this.stateSchema = options.stateSchema ?? undefined
        this.middleware = options.middleware ?? []

        this.threadId = options.threadId ?? '1'
        this.agent = createAgent({
            model: this.model,
            tools: this.tools,
            checkpointer: this.checkpointer,
            // stateSchema: this.stateSchema,
            middleware: this.middleware
        })
    }

    async ask(question: string): Promise<string> {
        const state = await this.agent.invoke(
            { messages: [new HumanMessage(question)] },
            { configurable: { thread_id: this.threadId } }
        )

        const lastMessage = state.messages.at(-1)
        return String(lastMessage?.content ?? '未获取到结果')
    }
}
