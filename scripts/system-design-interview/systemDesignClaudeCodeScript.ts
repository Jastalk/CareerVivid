/**
 * systemDesignClaudeCodeScript.ts
 *
 * Upgraded High-Knowledge, Ultra-Engaging Script for YouTube:
 *   System Design Interview — How to Design Claude Code (Agentic AI System & Subagent Fleet)
 *
 * Hello Interview & Vox Documentary Style Blueprint:
 *   1. Viral Hook (0-15s): Solving complex 100k-line software tasks without losing memory.
 *   2. Monolith Intuition: Monolithic single-prompt agents vs 100k-line repos.
 *   3. Subagent Fleet Orchestration: Lead Manager delegating to parallel subagents (Researcher, Debugger, Auditor).
 *   4. Sliding Context Window & Markdown Summary Checkpoints: Compressing terminal logs to sub-10k tokens.
 *   5. Sandboxed Permission Hooks: Intercepting destructive commands before terminal execution.
 *   6. Reactive Event Loop: Sleeping peacefully during subagent background work without CPU polling.
 *   7. Failure Modes & Edge Cases: Runaway subagent loops & Liveness Timer guards.
 *   8. Tech Benchmark: Claude Code Subagent Fleet vs AutoGPT Single-Loop Architecture.
 *   9. High-Converting Interactive Platform CTA: CareerVivid System Design Labs.
 */

export interface ClaudeCodeBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
        badOption?: { head: string; body: string };
        goodOption?: { head: string; body: string };
    };
}

export const SYSTEM_DESIGN_CLAUDE_CODE_BEATS: ClaudeCodeBeat[] = [
    // ── Beat 1: The Viral Hook & Monolith Intuition ───────────────────────────
    {
        id: 'sd-claudecode-intro',
        title: { en: 'Designing Claude Code · Monolithic Prompt to 100k-Line Apps', zh: '设计 Claude Code · 从单提示词到 10 万行复杂工程' },
        narration: {
            en: 'In a basic AI tool, solving code issues means stuffing 100,000 lines into one prompt. Within 5 minutes, context windows overflow and the model hallucinates! How does Claude Code solve complex autonomous software engineering tasks without losing memory?',
            zh: '在基础 AI 工具中解决代码问题意味着把 10 万行代码塞进一个 Prompt。不出 5 分钟，上下文即溢出且模型开始胡言乱语！Claude Code 到底如何在处理复杂工程时保持内存清晰？',
        },
        visual: {
            badge: 'AGENTIC ARCHITECTURE · COMPLEX CODEBASES',
            cardTitle: 'Solving Autonomous Software Engineering Tasks',
            badOption: {
                head: '❌ Monolithic Single-Prompt Context Stuffing',
                body: 'Context window overflow ➔ Hallucinations and forgotten code',
            },
            goodOption: {
                head: '✅ Subagent Fleet & Context Summarization',
                body: 'Delegating work to isolated specialized subagent conversations',
            },
        },
    },

    // ── Beat 2: Subagent Fleet Orchestration ──────────────────────────────────
    {
        id: 'sd-claudecode-subagent-fleet',
        title: { en: 'Subagent Fleet Orchestration (Manager & Specialized Workers)', zh: 'Subagent 专家集群 (主控总经理与分工专家)' },
        narration: {
            en: 'Trying to perform research, refactoring, and testing in one serial loop causes severe token pollution! Claude Code uses Subagent Fleet Orchestration: a Lead Manager Agent delegates subtasks to parallel workers (Researcher, Debugger, Security Auditor).',
            zh: '在单线程串行循环中同时进行研究、重构与测试会导致严重 Token 污染！Claude Code 引入“Subagent 专家集群”：主控 Agent 像总经理一样，将子任务并发派发给研究员、调试器与安全审计员！',
        },
        visual: {
            badge: 'MULTI-AGENT ORCHESTRATION · SUBAGENT FLEET',
            cardTitle: 'Manager Agent Delegating to Specialist Workers',
            badOption: {
                head: '❌ Serial Single-Threaded Context Execution',
                body: 'Slow linear progress with cluttered conversation logs',
            },
            goodOption: {
                head: '✅ Concurrent Subagent Fleet Dispatch',
                body: 'Parallel research, refactoring, and automated testing',
            },
        },
    },

    // ── Beat 3: Sliding Context Window & Markdown Summary Checkpoints ─────────
    {
        id: 'sd-claudecode-context-window',
        title: { en: 'Sliding Context Window & Markdown Summary Checkpoints', zh: '滑动上下文窗口与 Markdown 摘要检查点' },
        narration: {
            en: 'How does Claude Code process 1,000-page terminal outputs without overflowing token limits? Sliding Context Window Compression! As raw logs stream in, earlier history is summarized into compact markdown checkpoints while full transcripts are saved to disk.',
            zh: 'Claude Code 如何处理上千页终端日志而不爆 Token？“滑动上下文压缩 (Context Compression)”！随着新日志涌入，旧步骤自动压缩成精炼 Markdown 检查点，而全量日志存入磁盘。',
        },
        visual: {
            badge: 'MEMORY MANAGEMENT · CONTEXT SLIDING',
            cardTitle: 'Sliding Context Window & Summary Checkpoints',
            badOption: {
                head: '❌ Raw Un-truncated Log Injection',
                body: 'Exceeding token limits and losing original system instructions',
            },
            goodOption: {
                head: '✅ Compact Markdown Summary Checkpoints',
                body: 'Preserving core task memory with sub-10k token footprint',
            },
        },
    },

    // ── Beat 4: Sandboxed Permission Hooks & Interactive Approval Guards ──────
    {
        id: 'sd-claudecode-safety-guards',
        title: { en: 'Sandboxed Permission Hooks & Interactive Approval Guards', zh: '沙箱权限钩子与用户交互确认防线' },
        narration: {
            en: 'What stops an AI agent from running dangerous commands by mistake? Sandboxed Permission Hooks! Destructive actions like dropping production tables or running un-sandboxed shell scripts trigger interactive approval prompts before execution.',
            zh: '如何防止 AI Agent 误执行危险命令？沙箱权限钩子 (Permission Hooks)！误删数据库或运行未隔离 Shell 脚本等破坏性操作，在执行前会强制触发用户交互确认！',
        },
        visual: {
            badge: 'SECURITY & GOVERNANCE · SANDBOX HOOKS',
            cardTitle: 'Sandboxed Permission Hooks & Approval Prompts',
            badOption: {
                head: '❌ Unsanitised Arbitrary Terminal Execution',
                body: 'Accidental production data loss & runaway recursive credit spend',
            },
            goodOption: {
                head: '✅ Sandboxed Hooks + Interactive User Approval',
                body: 'Interactive permission approval + strict workspace scope bounds',
            },
        },
    },

    // ── Beat 5: Reactive Event Loop & Zero-CPU Polling Architecture ───────────
    {
        id: 'sd-claudecode-reactive-loop',
        title: { en: 'Reactive Event Loop & Zero-CPU Polling Architecture', zh: '响应式事件循环与零 CPU 轮询架构' },
        narration: {
            en: 'When a subagent runs a long background build, the parent agent doesn\'t waste tokens polling in a tight loop. It enters a sleep state, reactively waking up only when background IPC events or system notifications arrive!',
            zh: '当 Subagent 运行长耗时构建时，主 Agent 绝不会在死循环里轮询浪费 Token。它会优雅进入休眠状态，仅在后台 IPC 事件或系统通知到达时被响应式唤醒！',
        },
        visual: {
            badge: 'EVENT-DRIVEN ARCHITECTURE · REACTIVE DISPATCH',
            cardTitle: 'Zero-CPU Polling & Background IPC Callbacks',
            badOption: {
                head: '❌ Busy-Waiting Polling Loop in LLM Context',
                body: 'Wasting thousands of LLM API tokens polling background task status',
            },
            goodOption: {
                head: '✅ Reactive Event Loop + Signal Callbacks',
                body: 'Zero token waste during background task execution',
            },
        },
    },

    // ── Beat 6: Failure Modes — Runaway Subagent Loops & Liveness Timers ─────
    {
        id: 'sd-claudecode-failure-modes',
        title: { en: 'Failure Modes · Runaway Subagent Loops & Liveness Timers', zh: '故障模式 · Subagent 循环死锁与活性定时器' },
        narration: {
            en: 'What happens when a subagent gets stuck in an infinite debugging loop? Liveness Timers! Claude Code attaches configurable timer conditions to subagents, terminating hung background tasks automatically to prevent credit exhaustion.',
            zh: '当 Subagent 陷入无限调试死循环时会发生什么？活性定时器 (Liveness Timers)！Claude Code 为 Subagent 绑定可配置的定时条件，自动掐断卡死的后台任务，防止 Token 耗尽。',
        },
        visual: {
            badge: 'RESILIENCE & TIMERS · LIVENESS GUARDS',
            cardTitle: 'Configurable Liveness Timers & Loop Termination',
            badOption: {
                head: '❌ Unbounded Background Subagent Execution',
                body: 'Runaway subagent loops draining API budget overnight',
            },
            goodOption: {
                head: '✅ Conditional Liveness Timers + Auto Kill',
                body: 'Deterministic subagent lifetime management with automatic cleanup',
            },
        },
    },

    // ── Beat 7: Real-World Tech Benchmarks (Claude Code vs AutoGPT) ───────────
    {
        id: 'sd-claudecode-benchmark',
        title: { en: 'Tech Benchmarks · Claude Code Fleet vs AutoGPT Single Loop', zh: '架构对比 · Claude Code 分离架构 vs AutoGPT 盲目循环' },
        narration: {
            en: 'How does Claude Code compare to early agentic frameworks like AutoGPT? AutoGPT used unconstrained single-loop prompts that rapidly lost focus, whereas Claude Code combines structured subagent IPC with deterministic workspace state tracking.',
            zh: 'Claude Code 与早期的 AutoGPT 有何区别？AutoGPT 依赖无约束的单循环，极易偏离目标；而 Claude Code 将结构化 Subagent 通信与确定性工作区状态跟踪相结合！',
        },
        visual: {
            badge: 'TECH ARCHITECTURE BENCHMARK · CLAUDE CODE VS AUTOGPT',
            cardTitle: 'Real-World Agentic AI Architecture Comparison',
            badOption: {
                head: '❌ Single Infinite Loop Agent (AutoGPT)',
                body: 'Rapid focus loss, token wastage, and uncoordinated state mutation',
            },
            goodOption: {
                head: '✅ Structured Subagent Fleet + IPC (Claude Code)',
                body: 'Deterministic task completion with isolated context boundaries',
            },
        },
    },

    // ── Beat 8: High-Converting Interactive Platform CTA ─────────────────────
    {
        id: 'sd-claudecode-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive subagent fleet scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战、LLM 上下文计算器与 300+ 真实大厂面试题库！',
        },
        visual: {
            badge: 'INTERACTIVE PRACTICE · CAREERVIVID',
            cardTitle: 'Practice Real System Design Scenarios',
            goodOption: {
                head: '🚀 Practice System Design Interactive Drills',
                body: 'https://careervivid.app/learning/system-design-interview',
            },
        },
    },
];
