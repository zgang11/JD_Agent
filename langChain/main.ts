// @ts-ignore Node 24 可直接运行 TypeScript，无需额外安装 @types/node
import { createInterface } from 'node:readline/promises'
import { Agent } from './src/agent/index.ts'
import { TavilySearch } from '@langchain/tavily'

const nodeProcess = globalThis as unknown as {
    process: { stdin: unknown; stdout: unknown }
}

const tools = [
    new TavilySearch({
        maxResults: 3 // 最多查询 3 个结果
    })
]

const agent = new Agent({ tools })

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
