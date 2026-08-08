/**
 * systemDesignOpenAIScript.ts
 *
 * Upgraded High-Knowledge Script for:
 *   System Design Interview — How to Design OpenAI / ChatGPT (Streaming LLM & KV Cache)
 */

export interface OpenAIBeat {
    id: string;
    section?: number;
    title: string;
    kicker?: string;
    concepts?: string[];
    productMoment?: string;
    narration: { en: string; zh?: string };
}

export const SYSTEM_DESIGN_OPENAI_BEATS: OpenAIBeat[] = [
    {
        id: 'sd-openai-intro',
        section: 1,
        title: 'Start with the experience',
        kicker: 'The interview problem',
        concepts: ['First-token latency', 'Streaming response'],
        narration: {
            en: 'When asked to design a streaming assistant, begin with what the user feels. Generating a full response before sending any text feels slow, times out over HTTP, and hides progress. Start by establishing the goal: prompt in, first token out instantly, and text streaming as it arrives.',
        },
    },
    {
        id: 'sd-openai-sse-streaming',
        section: 2,
        title: 'Optimize the first useful moment',
        kicker: 'The protocol boundary',
        concepts: ['Server-Sent Events', 'Token streaming'],
        narration: {
            en: 'At real traffic, the bottleneck is not only total throughput. It is first-token latency and a growing queue. Stream each generated token to the browser over Server-Sent Events, then state how you will protect the service when demand outruns workers.',
        },
    },
    {
        id: 'sd-openai-kv-cache',
        section: 3,
        title: 'Reuse work already paid for',
        kicker: 'The request flow',
        concepts: ['KV cache', 'Context cost'],
        narration: {
            en: 'The next decision is context cost. A serving system keeps reusable attention state in a KV cache, so each new token does not reprocess the entire conversation. Name the trade-off: faster generation consumes scarce accelerator memory.',
        },
    },
    {
        id: 'sd-openai-failure-modes',
        section: 4,
        title: 'Say what breaks before asked',
        kicker: 'Production follow-up',
        concepts: ['Rate limits', 'Graceful overload'],
        narration: {
            en: 'Then cover failure modes. Long prompts consume memory, bursts overflow queues, and retries can multiply load. Set per-user limits, cap context deliberately, return a retryable overload response, and shed optional work before the critical path collapses.',
        },
    },
    {
        id: 'sd-openai-gpu-workers',
        section: 5,
        title: 'Benchmark the design, not the vendor',
        kicker: 'The worker fleet',
        concepts: ['Continuous batching', 'Tail latency'],
        narration: {
            en: 'OpenAI and Anthropic do not publish their serving schedulers. Use public systems such as vLLM as a comparison point, not a claim about a vendor stack. Continuous batching can keep accelerators busy, but maximizing throughput can hurt fairness and tail latency for one long request.',
        },
    },
    {
        id: 'sd-openai-practice',
        section: 6,
        title: 'Practice the trade-offs, not a script',
        kicker: 'CareerVivid',
        concepts: ['Interactive drills', 'Company follow-ups'],
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive LLM streaming scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战、GPU 显存计算器与 300+ 真实大厂面试题库！',
        },
        productMoment: 'practice',
    },
];
