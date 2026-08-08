/**
 * systemDesignLlmInferenceScript.ts
 *
 * System Design Interview: How to Design High-Throughput LLM Inference Serving
 * (PagedAttention, Continuous Batching, KV-Cache Virtual Memory & Tensor Parallelism)
 *
 * Target Total Runtime: ~9.5 minutes across 8 Beats.
 * Every beat MUST include concrete senior-engineer metrics (QPS, Latency ms, VRAM GB, Tokens/sec, Memory fragmentation %).
 */

export interface DiagramNode {
    id: string;
    label: string;
    subtext?: string;
    type: 'client' | 'gateway' | 'scheduler' | 'gpu' | 'vram' | 'storage';
    x: number; // percentage
    y: number; // percentage
    appearsAtSec: number; // relative to beat start
}

export interface DiagramEdge {
    from: string;
    to: string;
    label: string; // protocol / rate e.g. "SSE / 150 tok/s"
    appearsAtSec: number;
}

export interface LlmInferenceBeat {
    id: string;
    beatNumber: number;
    name: 'HOOK' | 'REQUIREMENTS' | 'NAIVE APPROACH' | 'WHY IT BREAKS' | 'CORE ARCHITECTURE' | 'DEEP DIVE' | 'TRADEOFFS' | 'RECAP + CTA';
    renderer: 'VEO' | 'DIAGRAM';
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    metrics: string[]; // Concrete numbers verified in narration
    diagramSpec?: {
        nodes: DiagramNode[];
        edges: DiagramEdge[];
    };
}

export const LLM_INFERENCE_BEATS: LlmInferenceBeat[] = [
    {
        id: 'beat-1-hook',
        beatNumber: 1,
        name: 'HOOK',
        renderer: 'VEO',
        title: { en: 'The LLM Serving Bottleneck · 80% VRAM Waste', zh: 'LLM 推理瓶颈 · 80% 显存浪费' },
        narration: {
            en: 'Serving a 70-billion parameter model to 10,000 concurrent users requires massive GPU clusters. Yet standard inference engines waste up to 80 percent of expensive H100 VRAM on pre-allocated key-value cache memory, driving per-token serving costs through the roof! How do top AI labs achieve 2,000 tokens per second at 99.9% reliability?',
            zh: '向 10,000 个并发用户提供 700 亿参数大模型服务需要庞大的 GPU 集群。然而传统的推理引擎高达 80% 的昂贵 H100 显存都被预分配的 KV 缓存所浪费，导致单 Token 成本极高！顶尖 AI 实验室到底如何在 99.9% 可靠性下实现每秒 2,000 Tokens 的吞吐？',
        },
        metrics: ['70B parameters', '10,000 concurrent users', '80% VRAM waste', 'H100 GPUs', '2,000 tokens/sec', '99.9% reliability'],
    },
    {
        id: 'beat-2-requirements',
        beatNumber: 2,
        name: 'REQUIREMENTS',
        renderer: 'DIAGRAM',
        title: { en: 'Inference SLA & Hardware Constraints', zh: '推理 SLA 与硬件约束指标' },
        narration: {
            en: 'Let us define the non-negotiable SLAs. We must support 5,000 active requests per second with a time-to-first-token under 50 milliseconds and inter-token latency under 15 milliseconds. On an 8-way Nvidia H100 cluster with 640 gigabytes of total High Bandwidth Memory, we must sustain 150 tokens per second per user session without running out of memory.',
            zh: '我们先明确核心 SLA 指标：系统必须支持每秒 5,000 个活跃请求，首 Token 延迟小于 50 毫秒，Token 间生成延迟小于 15 毫秒。在拥有 640GB HBM 显存的 8 卡 H100 集群上，必须在不发生 OOM 的前提下实现每用户单流每秒 150 Tokens 的生成速度。',
        },
        metrics: ['5,000 QPS', '50ms TTFT', '15ms inter-token latency', '8x H100 GPUs', '640GB HBM VRAM', '150 tokens/sec'],
        diagramSpec: {
            nodes: [
                { id: 'client', label: '5,000 Active Clients', subtext: 'Interactive Chat & API', type: 'client', x: 15, y: 50, appearsAtSec: 0 },
                { id: 'gateway', label: 'Inference Gateway', subtext: 'TTFT < 50ms | SSE Stream', type: 'gateway', x: 45, y: 50, appearsAtSec: 4 },
                { id: 'cluster', label: '8x H100 GPU Cluster', subtext: '640GB HBM3 | 150 tok/s', type: 'gpu', x: 80, y: 50, appearsAtSec: 8 },
            ],
            edges: [
                { from: 'client', to: 'gateway', label: 'HTTP / SSE (5,000 QPS)', appearsAtSec: 4 },
                { from: 'gateway', to: 'cluster', label: 'PCIe Gen5 / 128 GB/s', appearsAtSec: 8 },
            ],
        },
    },
    {
        id: 'beat-3-naive-approach',
        beatNumber: 3,
        name: 'NAIVE APPROACH',
        renderer: 'DIAGRAM',
        title: { en: 'Naive Static KV Cache Allocation', zh: '朴素静态 KV 缓存预分配架构' },
        narration: {
            en: 'In naive auto-regressive generation, the model allocates a contiguous memory block for the maximum context window of 8,192 tokens per request. For a 70B FP16 model, each request reserves 1.2 gigabytes of KV cache memory upfront, regardless of whether the user prompts 10 tokens or 8,000 tokens.',
            zh: '在朴素自回归生成中，推理系统会为每个请求按最大上下文 8,192 Tokens 预先分配连续显存块。对于 FP16 精度下的 70B 模型，无论用户提示词是 10 个 Token 还是 8,000 个 Token，单次请求都会直接锁定 1.2GB 的 KV 缓存显存。',
        },
        metrics: ['8,192 max context window', '70B FP16 model', '1.2GB KV cache per request', '10 tokens vs 8,000 tokens'],
        diagramSpec: {
            nodes: [
                { id: 'req_1', label: 'User Request A', subtext: 'Prompt: 20 tokens', type: 'client', x: 15, y: 30, appearsAtSec: 0 },
                { id: 'req_2', label: 'User Request B', subtext: 'Prompt: 50 tokens', type: 'client', x: 15, y: 70, appearsAtSec: 3 },
                { id: 'vram_static', label: 'Static GPU VRAM Allocator', subtext: 'Locked 1.2GB per request (8,192 max)', type: 'vram', x: 60, y: 50, appearsAtSec: 6 },
            ],
            edges: [
                { from: 'req_1', to: 'vram_static', label: 'Reserves 1.2GB Contiguous', appearsAtSec: 6 },
                { from: 'req_2', to: 'vram_static', label: 'Reserves 1.2GB Contiguous', appearsAtSec: 9 },
            ],
        },
    },
    {
        id: 'beat-4-why-it-breaks',
        beatNumber: 4,
        name: 'WHY IT BREAKS',
        renderer: 'DIAGRAM',
        title: { en: 'Internal Fragmentation & Out-Of-Memory Crashes', zh: '内存碎片化与 Out-Of-Memory 崩溃' },
        narration: {
            en: 'This naive design breaks under real traffic. Over 60 to 80 percent of allocated VRAM sits completely idle due to internal fragmentation! When concurrent requests spike to 500 sessions, GPU memory fills up, causing catastrophic Out-Of-Memory crashes and forcing request batch sizes down to just 16.',
            zh: '这种朴素架构在高并发下必然崩盘。由于严重的内部内存碎片化，高达 60% 至 80% 的已分配显存完全处于闲置状态！当并发请求达到 500 个时，GPU 显存瞬间被打满崩溃，逼迫批次大小 (Batch Size) 断崖式下跌至仅 16。',
        },
        metrics: ['60% to 80% idle VRAM', '500 concurrent sessions', 'OOM crashes', 'Batch size dropped to 16'],
        diagramSpec: {
            nodes: [
                { id: 'vram_block', label: 'VRAM Allocation Map', subtext: '80% Internal Fragmentation', type: 'vram', x: 25, y: 50, appearsAtSec: 0 },
                { id: 'oom_error', label: 'CUDA OOM Crash', subtext: 'Batch Size drops from 256 -> 16', type: 'gpu', x: 70, y: 50, appearsAtSec: 7 },
            ],
            edges: [
                { from: 'vram_block', to: 'oom_error', label: 'Spike to 500 Sessions (OOM!)', appearsAtSec: 7 },
            ],
        },
    },
    {
        id: 'beat-5-core-architecture',
        beatNumber: 5,
        name: 'CORE ARCHITECTURE',
        renderer: 'DIAGRAM',
        title: { en: 'PagedAttention & Virtual Memory Management', zh: 'PagedAttention 与虚拟显存分页架构' },
        narration: {
            en: 'To solve memory waste, modern engines implement PagedAttention! Inspired by OS virtual memory, PagedAttention partitions the KV cache into fixed-size physical blocks of 16 tokens. A central Page Table maps logical token positions to non-contiguous physical VRAM blocks, eliminating internal fragmentation and enabling dynamic allocation on demand.',
            zh: '为了根除显存浪费，现代推理引擎引入了 PagedAttention！受操作系统虚拟内存启示，PagedAttention 将 KV 缓存切分为大小固定为 16 个 Token 的物理页块。中央页表 (Page Table) 将逻辑 Token 位置透明映射至不连续的物理显存页块中，完全消除了内部碎片并实现按需动态分配。',
        },
        metrics: ['PagedAttention', '16-token physical blocks', 'OS Virtual Memory Page Table', '0% internal fragmentation'],
        diagramSpec: {
            nodes: [
                { id: 'tokens', label: 'Logical Tokens', subtext: 'Tokens 0..63', type: 'client', x: 15, y: 50, appearsAtSec: 0 },
                { id: 'page_table', label: 'PagedAttention Page Table', subtext: 'Logical -> Physical Mapping', type: 'scheduler', x: 50, y: 50, appearsAtSec: 5 },
                { id: 'phys_vram', label: 'Non-Contiguous Physical Blocks', subtext: '16-Token Pages (Block 0, 12, 49)', type: 'vram', x: 85, y: 50, appearsAtSec: 10 },
            ],
            edges: [
                { from: 'tokens', to: 'page_table', label: 'Logical Address (0..15)', appearsAtSec: 5 },
                { from: 'page_table', to: 'phys_vram', label: 'Physical Page Lookup (Block #12)', appearsAtSec: 10 },
            ],
        },
    },
    {
        id: 'beat-6-deep-dive',
        beatNumber: 6,
        name: 'DEEP DIVE',
        renderer: 'DIAGRAM',
        title: { en: 'Continuous Batching & Shared Prompt Prefix (Copy-on-Write)', zh: '连续批处理 (Continuous Batching) 与写时复制' },
        narration: {
            en: 'PagedAttention enables Continuous Batching and Copy-On-Write memory sharing. Instead of waiting for an entire batch to finish, new requests join the iteration loop dynamically at step boundaries! When 1,000 users query the same 4,000-token system prompt, PagedAttention shares physical memory pages across sessions, reducing prompt memory overhead by 95 percent.',
            zh: 'PagedAttention 进一步解锁了连续批处理 (Continuous Batching) 与写时复制 (Copy-On-Write) 内存共享。新请求无需等待整批完成，而是在单 Step 步长边界动态加入推理循环！当 1,000 个用户同时使用相同的 4,000 Token 系统提示词时，物理显存页被完全共享，使 Prompt 显存开销暴降 95%。',
        },
        metrics: ['Continuous Batching', 'Step boundary iteration', '1,000 concurrent sessions', '4,000-token system prompt', '95% memory reduction via Copy-on-Write'],
        diagramSpec: {
            nodes: [
                { id: 'shared_prompt', label: 'System Prompt (4,000 tokens)', subtext: 'Shared Base Physical Pages', type: 'vram', x: 20, y: 50, appearsAtSec: 0 },
                { id: 'batch_engine', label: 'Continuous Batch Scheduler', subtext: 'Step-level Iteration Engine', type: 'scheduler', x: 55, y: 50, appearsAtSec: 6 },
                { id: 'gpu_workers', label: 'Tensor Parallel GPUs', subtext: 'Throughput: 2,400 tokens/s', type: 'gpu', x: 85, y: 50, appearsAtSec: 11 },
            ],
            edges: [
                { from: 'shared_prompt', to: 'batch_engine', label: 'Copy-On-Write Reference (Ref Count: 1000)', appearsAtSec: 6 },
                { from: 'batch_engine', to: 'gpu_workers', label: 'Continuous Iteration (Step Boundary)', appearsAtSec: 11 },
            ],
        },
    },
    {
        id: 'beat-7-tradeoffs',
        beatNumber: 7,
        name: 'TRADEOFFS',
        renderer: 'DIAGRAM',
        title: { en: 'Architectural Tradeoffs · Page Table Overhead vs Throughput', zh: '架构权衡 · 页表开销 vs 吞吐率' },
        narration: {
            en: 'What are the engineering tradeoffs? Small 16-token page blocks eliminate memory waste, but increase CPU Page Table lookup overhead by 5 percent during high-frequency attention kernels. Selecting larger 64-token blocks improves GPU memory bandwidth utilization by 12 percent, but slightly increases fragmentation on short generation tasks.',
            zh: '架构设计的关键权衡在哪里？16 个 Token 的小物理页块能彻底杜绝显存浪费，但在高频 Attention 核函数计算中会增加 5% 的 CPU 页表查找开销；而提升至 64 个 Token 的页块可将 GPU 显存带宽利用率提高 12%，但会在短文本生成任务中带来轻微的页内碎片。',
        },
        metrics: ['16-token vs 64-token block size', '5% CPU lookup overhead', '12% GPU memory bandwidth boost', 'Attention Kernel efficiency'],
        diagramSpec: {
            nodes: [
                { id: 'block_16', label: '16-Token Page Size', subtext: '0% Memory Waste | +5% CPU Overhead', type: 'scheduler', x: 30, y: 50, appearsAtSec: 0 },
                { id: 'block_64', label: '64-Token Page Size', subtext: '+12% HBM Bandwidth | Minor Internal Waste', type: 'gpu', x: 70, y: 50, appearsAtSec: 6 },
            ],
            edges: [
                { from: 'block_16', to: 'block_64', label: 'Tradeoff: Overhead vs HBM Bandwidth', appearsAtSec: 6 },
            ],
        },
    },
    {
        id: 'beat-8-recap-cta',
        beatNumber: 8,
        name: 'RECAP + CTA',
        renderer: 'VEO',
        title: { en: 'Master System Design · CareerVivid Interactive Platform', zh: '掌握系统设计 · CareerVivid 交互平台' },
        narration: {
            en: 'By combining PagedAttention virtual memory, continuous batching, and shared prompt prefixing, modern LLM inference systems achieve 5x throughput improvements on H100 clusters while maintaining sub-50ms latency! If you enjoyed this system design breakdown, make sure to like and subscribe for more. Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid.',
            zh: '通过结合 PagedAttention 虚拟显存、连续批处理与共享 Prompt 前缀，现代 LLM 推理系统在 H100 集群上取得了 5 倍的吞吐提升，同时将 TTFT 维持在 50 毫秒以内！如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战与 300+ 真实大厂面试题库。',
        },
        metrics: ['5x throughput boost', 'H100 clusters', 'sub-50ms TTFT', '300+ interview questions'],
    },
];
