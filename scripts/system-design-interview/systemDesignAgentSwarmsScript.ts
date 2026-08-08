/**
 * systemDesignAgentSwarmsScript.ts
 *
 * Script and Progressive Diagram Specification for:
 *   System Design: How to Design AI Agent Orchestration & Subagent Swarms
 *   (50k Concurrent Swarms, Event-Driven State Machines, Redis Redlock & Sub-45ms Rehydration)
 */

export interface BeatSpec {
    id: string;
    renderer: 'VEO' | 'DIAGRAM';
    title: { en: string };
    narration: { en: string };
    metrics: string[];
    diagramSpec?: {
        nodes: Array<{
            id: string;
            type: 'client' | 'gateway' | 'scheduler' | 'gpu' | 'vram' | 'storage';
            label: string;
            subtext?: string;
            x: number;
            y: number;
            appearsAtSec: number;
        }>;
        edges: Array<{
            from: string;
            to: string;
            label: string;
            appearsAtSec: number;
        }>;
    };
}

export const AGENT_SWARMS_BEATS: BeatSpec[] = [
    {
        id: 'beat-1-hook',
        renderer: 'VEO',
        title: { en: 'The AI Agent Swarm Scale Challenge' },
        narration: {
            en: "Orchestrating thousands of autonomous AI subagents without infinite loops, state corruption, or runaway token costs is a massive system design challenge. Here is how tech giants design production AI agent fleets at 50,000 concurrent swarms!"
        },
        metrics: ['🐝 50k Active Swarms', '⚡ p99 < 45ms State Sync', '🔒 100% Lock Safety', '🛡️ 99.99% Reliability']
    },
    {
        id: 'beat-2-requirements',
        renderer: 'DIAGRAM',
        title: { en: 'Agent Fleet SLA & Core Requirements' },
        narration: {
            en: "Our agent platform must support 50,000 active subagent trees, guarantee sub-50ms state snapshotting across worker nodes, enforce strict per-agent token spending caps, and prevent concurrent tool execution race conditions."
        },
        metrics: ['🐝 50k Concurrent Trees', '⏱️ p99 < 50ms State Sync', '💳 Token Budget Cap', '🔒 Zero Race Conditions'],
        diagramSpec: {
            nodes: [
                { id: 'parent', type: 'client', label: 'Parent Orchestration Agent', subtext: 'Goal Dispatcher', x: 20, y: 35, appearsAtSec: 0.5 },
                { id: 'sla', type: 'gateway', label: 'Agent Gateway SLA', subtext: '50k Active Swarms', x: 50, y: 35, appearsAtSec: 1.5 },
                { id: 'workers', type: 'gpu', label: 'Subagent Worker Fleet', subtext: 'Isolated Tool Execution', x: 80, y: 35, appearsAtSec: 2.8 }
            ],
            edges: [
                { from: 'parent', to: 'sla', label: 'Sub-task Dispatch', appearsAtSec: 2.0 },
                { from: 'sla', to: 'workers', label: '< 50ms State Sync', appearsAtSec: 3.5 }
            ]
        }
    },
    {
        id: 'beat-3-naive',
        renderer: 'DIAGRAM',
        title: { en: 'Naive In-Memory Recursive Loops' },
        narration: {
            en: "In a naive architecture, agent state is stored in memory using recursive in-process async functions. When a subagent calls external APIs or spawns sub-children, state is tied to a single NodeJS or Python process thread."
        },
        metrics: ['🧠 In-Memory Dict State', '⚠️ Monolithic Process', '❌ Zero Replayability', '💥 Thread Crash Vulnerable'],
        diagramSpec: {
            nodes: [
                { id: 'task', type: 'client', label: 'User Goal Prompt', subtext: 'Multi-Step Execution', x: 18, y: 50, appearsAtSec: 0.5 },
                { id: 'monolith', type: 'storage', label: 'Monolithic Agent Loop', subtext: 'In-Memory Recursion Tree', x: 50, y: 50, appearsAtSec: 1.5 },
                { id: 'tool', type: 'gpu', label: 'External API Tool Call', subtext: 'Web Fetch / DB Write', x: 82, y: 50, appearsAtSec: 2.5 }
            ],
            edges: [
                { from: 'task', to: 'monolith', label: 'Direct Call', appearsAtSec: 2.0 },
                { from: 'monolith', to: 'tool', label: 'Synchronous Wait', appearsAtSec: 3.2 }
            ]
        }
    },
    {
        id: 'beat-4-why-breaks',
        renderer: 'DIAGRAM',
        title: { en: 'Cascading Failures & Token Explosions' },
        narration: {
            en: "When network requests fail or subagents enter infinite reasoning loops, the worker process memory leaks and crashes. Millions of tokens burn at $1,200 an hour, duplicate database mutations trigger race conditions, and unpersisted agent progress is lost forever."
        },
        metrics: ['🔥 $1,200 / hr Token Burn', '💥 Cascading OOM Crash', '⚡ Double Execution Bug', '❌ Lost Conversation Context'],
        diagramSpec: {
            nodes: [
                { id: 'loop', type: 'client', label: 'Infinite Reason Loop', subtext: 'Subagent Recursion', x: 18, y: 50, appearsAtSec: 0.5 },
                { id: 'leak', type: 'scheduler', label: 'Process Memory Leak', subtext: 'Thread Pool Exhaustion', x: 50, y: 50, appearsAtSec: 1.5 },
                { id: 'double', type: 'vram', label: 'Duplicate Tool Execution', subtext: 'Data Corruption', x: 82, y: 50, appearsAtSec: 2.5 }
            ],
            edges: [
                { from: 'loop', to: 'leak', label: 'Token Leakage', appearsAtSec: 2.0 },
                { from: 'leak', to: 'double', label: 'Uncontrolled Retries', appearsAtSec: 3.2 }
            ]
        }
    },
    {
        id: 'beat-5-core-architecture',
        renderer: 'DIAGRAM',
        title: { en: 'Event-Driven Agent Swarm Architecture' },
        narration: {
            en: "We decouple state from execution using a Kafka event-driven state machine. Subagent tasks publish events to Kafka, worker nodes execute tool calls asynchronously, state transitions commit to Postgres WAL event logs, and Redis Redlock prevents concurrent tool execution."
        },
        metrics: ['📨 Kafka Event Bus', '📜 WAL Event Sourcing', '🔒 Redis Redlock Mutex', '🛡️ Distributed Sandbox'],
        diagramSpec: {
            nodes: [
                { id: 'gateway', type: 'gateway', label: 'Agent Dispatcher API', subtext: 'Token Rate Limiter', x: 15, y: 50, appearsAtSec: 0.5 },
                { id: 'kafka', type: 'scheduler', label: 'Kafka Event Log', subtext: 'Partitioned Task Streams', x: 45, y: 25, appearsAtSec: 1.5 },
                { id: 'redlock', type: 'vram', label: 'Redis Redlock Mutex', subtext: 'Distributed Tool Locks', x: 45, y: 75, appearsAtSec: 2.5 },
                { id: 'workers', type: 'gpu', label: 'Stateless Agent Workers', subtext: 'Isolated Sandbox Exec', x: 80, y: 50, appearsAtSec: 3.5 }
            ],
            edges: [
                { from: 'gateway', to: 'kafka', label: 'Publish Task Event', appearsAtSec: 2.0 },
                { from: 'kafka', to: 'workers', label: 'Pull Work Item', appearsAtSec: 3.0 },
                { from: 'workers', to: 'redlock', label: 'Acquire Tool Lock', appearsAtSec: 4.2 }
            ]
        }
    },
    {
        id: 'beat-6-deep-dive',
        renderer: 'DIAGRAM',
        title: { en: 'State Rehydration & Token Capping' },
        narration: {
            en: "If a worker node crashes mid-execution, a new node rehydrates the agent context from the WAL event log in just 18 milliseconds. If total token consumption exceeds the assigned budget cap, the orchestrator triggers immediate subagent pruning."
        },
        metrics: ['⚡ 18ms Rehydration', '📜 100% Deterministic Replay', '💳 Automatic Budget Prune', '🛡️ Zero Data Loss'],
        diagramSpec: {
            nodes: [
                { id: 'wal', type: 'storage', label: 'Postgres WAL Event Store', subtext: 'Immutable Execution Log', x: 18, y: 50, appearsAtSec: 0.5 },
                { id: 'rehydrate', type: 'gateway', label: 'State Rehydrator', subtext: 'Fast Replay Engine', x: 50, y: 50, appearsAtSec: 1.5 },
                { id: 'newworker', type: 'gpu', label: 'Fresh Worker Instance', subtext: 'Resumes Step 4 in 18ms', x: 82, y: 50, appearsAtSec: 2.8 }
            ],
            edges: [
                { from: 'wal', to: 'rehydrate', label: 'Stream Event Deltas', appearsAtSec: 2.0 },
                { from: 'rehydrate', to: 'newworker', label: 'Restored State Vector', appearsAtSec: 3.5 }
            ]
        }
    },
    {
        id: 'beat-7-tradeoffs',
        renderer: 'DIAGRAM',
        title: { en: 'Production Metrics & SLA Tradeoffs' },
        narration: {
            en: "Event sourcing adds 12 milliseconds of event persist latency per step, but delivers 100% fault tolerance, zero duplicate tool execution, and slashes runaway token costs by 94% across 50,000 active agent swarms."
        },
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
        id: 'beat-8-recap-cta',
        renderer: 'VEO',
        title: { en: 'Recap & CareerVivid Practice' },
        narration: {
            en: "That is how you design a fault-tolerant AI agent orchestration platform at scale! If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!"
        },
        metrics: ['🎉 50k Agent Swarms', '🚀 Event-Driven Scale', '👍 Like & Subscribe', '💻 CareerVivid.app']
    }
];
