/**
 * systemDesignAgentSwarmsScript.ts
 *
 * Script and Progressive Diagram Specification for:
 *   System Design: How to Design AI Agent Orchestration & Subagent Swarms
 *   (50k Concurrent Swarms, Event-Driven State Machines, Redis Redlock & Sub-45ms Rehydration)
 */

export const AGENT_SWARMS_SCRIPT = {
    id: 'sd-agent-swarms',
    title: 'How to Design AI Agent Orchestration & Subagent Swarms',
    beats: [
        {
            id: 'sd-agent-swarms-intro',
            renderer: 'VEO',
            title: { en: '50k Concurrent Swarms & The Agent Problem' },
            narration: 'How do tech giants orchestrate thousands of autonomous AI subagents without infinite loops, state corruption, or runaway token costs? Let us design an event-driven AI agent orchestration platform at 50,000 concurrent swarms!',
            conceptTags: ['50k Active Swarms', 'Agent Swarm Platform', 'Subagent Orchestration'],
            metrics: ['🐝 50k Active Swarms', '⚡ p99 < 45ms State Sync', '🔒 100% Lock Safety', '🛡️ 99.99% Reliability'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged yellow newsprint backdrop, halftone textures, paper cut-out robot hive, glowing circuits, and network nodes. Dynamic paper sliding motion. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-agent-swarms-requirements',
            renderer: 'DIAGRAM',
            title: { en: 'Agent Fleet SLA & Core Requirements' },
            narration: 'Our agent platform must support 50,000 active subagent trees, guarantee sub-50ms state snapshotting across worker nodes, enforce strict per-agent token spending caps, and prevent concurrent tool execution race conditions.',
            conceptTags: ['50k Concurrent Trees', 'Sub-50ms State Sync', 'Token Budget Capping'],
            metrics: ['🐝 50k Concurrent Trees', '⏱️ p99 < 50ms State Sync', '💳 Token Budget Cap', '🔒 Zero Race Conditions'],
            diagramSpec: {
                nodes: [
                    { id: 'parent', type: 'client', label: 'Parent Orchestrator Agent', subtext: 'Goal & Sub-Task Dispatcher', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'sla', type: 'gateway', label: 'Agent Gateway SLA Router', subtext: '50k Concurrent Swarm Fleet', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'workers', type: 'gpu', label: 'Subagent Worker Pool', subtext: 'Isolated Tool Execution Sandbox', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'parent', to: 'sla', label: 'Sub-task Dispatch Tree', appearsAtSec: 1.8 },
                    { from: 'sla', to: 'workers', label: 'Sub-50ms State Sync Stream', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-agent-swarms-naive',
            renderer: 'DIAGRAM',
            title: { en: 'Naive In-Memory Recursive Loops' },
            narration: 'In a naive architecture, agent state is stored in memory using recursive in-process async functions. When a subagent calls external APIs or spawns sub-children, state is tied to a single NodeJS or Python process thread.',
            conceptTags: ['In-Memory Recursion', 'Monolithic Thread Pool', 'Single Process Vulnerability'],
            metrics: ['🧠 In-Memory Dict State', '⚠️ Monolithic Process', '❌ Zero Replayability', '💥 Thread Crash Vulnerable'],
            diagramSpec: {
                nodes: [
                    { id: 'task', type: 'client', label: 'User Goal Prompt', subtext: 'Multi-Step Agent Tree', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'monolith', type: 'storage', label: 'Monolithic Agent Loop', subtext: 'In-Memory Async Recursion', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'tool', type: 'gpu', label: 'External API Tool Call', subtext: 'Web Fetch / DB Mutation', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'task', to: 'monolith', label: 'Direct Function Invocation', appearsAtSec: 1.8 },
                    { from: 'monolith', to: 'tool', label: 'Synchronous Network Wait', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-agent-swarms-why-breaks',
            renderer: 'DIAGRAM',
            title: { en: 'Cascading Failures & Token Explosions' },
            narration: 'When network requests fail or subagents enter infinite reasoning loops, the worker process memory leaks and crashes. Millions of tokens burn at $1,200 an hour, duplicate database mutations trigger race conditions, and unpersisted agent progress is lost forever.',
            conceptTags: ['Infinite Loop Leak', 'Runaway Token Burn', 'Duplicate Tool Mutation'],
            metrics: ['🔥 $1,200 / hr Token Burn', '💥 Cascading OOM Crash', '⚡ Double Execution Bug', '❌ Lost Conversation Context'],
            diagramSpec: {
                nodes: [
                    { id: 'loop', type: 'client', label: 'Infinite Reason Loop', subtext: 'Recursive Agent Failure', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'leak', type: 'scheduler', label: 'Process Memory Leak', subtext: 'Thread Pool Exhaustion', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'double', type: 'vram', label: 'Duplicate Tool Execution', subtext: 'Data Store Corruption', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'loop', to: 'leak', label: 'Unchecked Token Leakage', appearsAtSec: 1.8 },
                    { from: 'leak', to: 'double', label: 'Uncontrolled Retry Storm', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-agent-swarms-core-architecture',
            renderer: 'DIAGRAM',
            title: { en: 'Event-Driven Agent Swarm Architecture' },
            narration: 'We decouple state from execution using a Kafka event-driven state machine. Subagent tasks publish events to Kafka, worker nodes execute tool calls asynchronously, state transitions commit to Postgres WAL event logs, and Redis Redlock prevents concurrent tool execution.',
            conceptTags: ['Kafka Event Bus', 'WAL Event Sourcing', 'Redis Redlock Mutex'],
            metrics: ['📨 Kafka Event Bus', '📜 WAL Event Sourcing', '🔒 Redis Redlock Mutex', '🛡️ Distributed Sandbox'],
            diagramSpec: {
                nodes: [
                    { id: 'gateway', type: 'gateway', label: 'Agent Dispatcher API', subtext: 'Token Rate Limiter', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'kafka', type: 'scheduler', label: 'Kafka Event Stream', subtext: 'Partitioned Swarm Topics', x: 48, y: 30, appearsAtSec: 1.5 },
                    { id: 'redlock', type: 'vram', label: 'Redis Redlock Mutex', subtext: 'Distributed Tool Locks', x: 48, y: 70, appearsAtSec: 2.5 },
                    { id: 'workers', type: 'gpu', label: 'Stateless Agent Workers', subtext: 'Isolated Sandbox Execution', x: 82, y: 50, appearsAtSec: 3.5 }
                ],
                edges: [
                    { from: 'gateway', to: 'kafka', label: 'Publish Swarm Event', appearsAtSec: 1.8 },
                    { from: 'kafka', to: 'workers', label: 'Pull Work Item', appearsAtSec: 2.8 },
                    { from: 'workers', to: 'redlock', label: 'Acquire Mutex Lock (4ms)', appearsAtSec: 4.0 }
                ]
            }
        },
        {
            id: 'sd-agent-swarms-deep-dive',
            renderer: 'DIAGRAM',
            title: { en: 'State Rehydration & Token Capping' },
            narration: 'If a worker node crashes mid-execution, a new node rehydrates the agent context from the WAL event log in just 18 milliseconds. If total token consumption exceeds the assigned budget cap, the orchestrator triggers immediate subagent pruning.',
            conceptTags: ['18ms State Rehydration', 'WAL Deterministic Replay', 'Budget Pruning Engine'],
            metrics: ['⚡ 18ms Rehydration', '📜 100% Deterministic Replay', '💳 Automatic Budget Prune', '🛡️ Zero Data Loss'],
            diagramSpec: {
                nodes: [
                    { id: 'wal', type: 'storage', label: 'Postgres WAL Event Store', subtext: 'Immutable Execution History', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'rehydrate', type: 'gateway', label: 'State Rehydration Engine', subtext: 'Fast Replay Log Parser', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'newworker', type: 'gpu', label: 'Fresh Worker Instance', subtext: 'Resumes Step in 18ms', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'wal', to: 'rehydrate', label: 'Stream Event Log Deltas', appearsAtSec: 1.8 },
                    { from: 'rehydrate', to: 'newworker', label: 'Hydrated State Vector', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-agent-swarms-tradeoffs',
            renderer: 'DIAGRAM',
            title: { en: 'Production Scale Benchmarks' },
            narration: 'Event sourcing adds 12 milliseconds of event persist latency per step, but delivers 100% fault tolerance, zero duplicate tool execution, and slashes runaway token costs by 94% across 50,000 active agent swarms.',
            conceptTags: ['50k Active Swarms', '94% Token Cost Reduction', '99.99% Uptime'],
            metrics: ['⏱️ +12ms Latency Tradeoff', '💰 94% Token Cost Savings', '🛡️ 99.99% Execution Uptime', '🔒 Zero Double-Executions'],
            diagramSpec: {
                nodes: [
                    { id: 'inmemory', type: 'vram', label: 'Unchecked In-Memory Swarm', subtext: 'High Risk / $45k/mo Waste', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'eventsourced', type: 'gpu', label: 'Event-Sourced Architecture', subtext: 'Deterministic / $2.7k/mo Cost', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'inmemory', to: 'eventsourced', label: '94% Cost & Memory Reduction', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-agent-swarms-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 50k Agent Swarms', '🚀 Sub-18ms Rehydration', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper robot icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};

