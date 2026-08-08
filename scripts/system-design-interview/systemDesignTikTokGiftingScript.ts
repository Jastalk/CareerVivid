import { buildPrompt } from './paperCollagePromptGrammar.mjs';

export interface SystemDesignBeat {
    id: string;
    renderer: 'VEO' | 'DIAGRAM';
    title: { en: string };
    narration: string;
    metrics: string[];
    veoPrompt?: string;
    diagramSpec?: {
        nodes: Array<{
            id: string;
            label: string;
            type: 'client' | 'gateway' | 'scheduler' | 'gpu' | 'vram' | 'storage';
            x: number;
            y: number;
            appearsAtSec: number;
            subtext?: string;
        }>;
        edges: Array<{
            from: string;
            to: string;
            label: string;
            appearsAtSec: number;
        }>;
    };
}

export interface SystemDesignScriptSpec {
    id: string;
    title: string;
    slug: string;
    beats: SystemDesignBeat[];
}

export const TIKTOK_GIFTING_SCRIPT: SystemDesignScriptSpec = {
    id: 'sd-tiktok-gifting',
    title: 'TikTok Live Gifting & Real-Time Leaderboard System Architecture',
    slug: 'design-tiktok-gifting',
    beats: [
        {
            id: 'b1_hook',
            renderer: 'VEO',
            title: { en: 'Section 1 · Monolith Intuition Hook' },
            narration: 'When a TikTok live stream goes viral, millions of viewers send virtual gifts simultaneously. A naive monolith relies on a single relational database transaction: updating user balance and creator earnings in one row lock. At 50,000 gifts per second, database row locking collapses, dropping 99% of gifts and freezing the stream.',
            metrics: ['500K QPS Peak', 'Single DB Row Lock', '99% Gift Drop Rate'],
            veoPrompt: buildPrompt({
                shot: 'A vintage paper cut-out illustration of a digital gift box surrounded by glowing paper coins sliding toward a single database ledger notebook.',
                location: 'Off-white grid paper backdrop with faint yellowed newsprint texture and subtle halftone shadows.',
                beats: [
                    '0.0s - A paper gift box snaps into the center of the frame as paper coins slide in rapidly from both sides.',
                    '3.0s - Red ink scribbles rapidly draw a warning circle around a locked database ledger card.',
                    '6.0s - Paper coins pile up as the ledger card vibrates and slides off frame under row-lock contention.'
                ]
            })
        },
        {
            id: 'b2_bottlenecks',
            renderer: 'DIAGRAM',
            title: { en: 'Section 2 · Scalability Bottlenecks & Hot Keys' },
            narration: 'The core bottleneck is hot-key contention in memory and database locking. If a single top creator receives 100,000 gift transactions per second, mutating a single Redis key or SQL row creates extreme thread contention and socket queue overflow. We must decouple instant event ingestion from durable financial settlement.',
            metrics: ['Hot-Key Contention', '100K QPS / Creator', 'Thread Queue Overflow'],
            diagramSpec: {
                nodes: [
                    { id: 'mobile', label: '10M TikTok App Viewers', type: 'client', x: 18, y: 35, appearsAtSec: 0.2, subtext: '500k HTTP/WebSocket QPS' },
                    { id: 'gateway', label: 'Edge API Gateway Fleet', type: 'gateway', x: 50, y: 35, appearsAtSec: 1.0, subtext: 'Rate Limit & Token Validation' },
                    { id: 'hot_key', label: 'Hot-Key Contention Bottleneck', type: 'gpu', x: 82, y: 35, appearsAtSec: 2.2, subtext: 'DB Row Lock & Redis Saturation' }
                ],
                edges: [
                    { from: 'mobile', to: 'gateway', label: 'Gift Tap Events (500k QPS)', appearsAtSec: 1.2 },
                    { from: 'gateway', to: 'hot_key', label: 'Direct DB Update (Fails)', appearsAtSec: 2.5 }
                ]
            }
        },
        {
            id: 'b3_protocol_p1',
            renderer: 'DIAGRAM',
            title: { en: 'Section 3 · Mechanical Protocol (LMAX Disruptor & Kafka)' },
            narration: 'To process half a million QPS without locks, incoming gift requests land at Edge API Gateways and pass into LMAX Disruptor ring buffers. Ring buffers process micro-batches lock-free in CPU L3 cache before publishing partition-keyed events to Apache Kafka clustered by Live Stream ID.',
            metrics: ['LMAX Ring Buffer', 'Lock-Free In-Memory', 'Kafka Partition by Stream ID'],
            diagramSpec: {
                nodes: [
                    { id: 'gateway', label: 'Edge API Gateway Fleet', type: 'gateway', x: 18, y: 45, appearsAtSec: 0.2, subtext: 'gRPC Ingestion' },
                    { id: 'disruptor', label: 'LMAX Disruptor Ring Buffer', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Lock-free Micro-batching' },
                    { id: 'kafka', label: 'Apache Kafka Event Cluster', type: 'storage', x: 82, y: 45, appearsAtSec: 2.0, subtext: 'Partition Key = Stream_ID' }
                ],
                edges: [
                    { from: 'gateway', to: 'disruptor', label: 'Non-blocking Push', appearsAtSec: 1.2 },
                    { from: 'disruptor', to: 'kafka', label: 'Batch Commit (10ms Window)', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b4_protocol_p2',
            renderer: 'DIAGRAM',
            title: { en: 'Section 4 · Real-Time Leaderboard & Push Fleet' },
            narration: 'Stream consumers consume Kafka events and update Redis Cluster Sorted Sets (ZSET) using atomic ZINCRBY operations for live leaderboards. Simultaneously, a global WebSocket Push Gateway fleet fans out leaderboard rank updates to millions of live stream viewers at sub-50ms latency.',
            metrics: ['Redis ZSET ZINCRBY', 'WebSocket Fan-Out Fleet', '< 50ms Push Latency'],
            diagramSpec: {
                nodes: [
                    { id: 'kafka', label: 'Kafka Stream Consumer', type: 'storage', x: 18, y: 45, appearsAtSec: 0.2, subtext: 'Event Stream' },
                    { id: 'redis', label: 'Redis Cluster (ZSET Leaderboard)', type: 'gpu', x: 50, y: 30, appearsAtSec: 1.0, subtext: 'ZINCRBY Atomic Rank' },
                    { id: 'push', label: 'WebSocket Push Fleet', type: 'scheduler', x: 50, y: 65, appearsAtSec: 1.8, subtext: '10M Persistent Connections' },
                    { id: 'viewer', label: 'Live Stream Audience', type: 'client', x: 82, y: 45, appearsAtSec: 2.5, subtext: 'Sub-50ms Visual Rank Update' }
                ],
                edges: [
                    { from: 'kafka', to: 'redis', label: 'Atomic Score Increment', appearsAtSec: 1.2 },
                    { from: 'kafka', to: 'push', label: 'Trigger Rank Diff Delta', appearsAtSec: 2.0 },
                    { from: 'push', to: 'viewer', label: 'Protobuf Push Stream', appearsAtSec: 2.7 }
                ]
            }
        },
        {
            id: 'b5_failure_modes',
            renderer: 'DIAGRAM',
            title: { en: 'Section 5 · Production Failure Modes ("What Breaks?")' },
            narration: 'What breaks in production? If a Redis master node crashes during a viral gifting spree, slave failover can lose un-persisted in-memory increments. We solve this with Transaction Outbox CDC via Debezium tailing Kafka WAL logs into ClickHouse for audit reconciliation.',
            metrics: ['Debezium CDC WAL Tail', 'ClickHouse Ledger Audit', 'Zero Coin Drift'],
            diagramSpec: {
                nodes: [
                    { id: 'redis_fail', label: 'Redis Master Outage', type: 'gpu', x: 20, y: 45, appearsAtSec: 0.2, subtext: 'Un-persisted Memory Drift' },
                    { id: 'cdc', label: 'Debezium CDC Outbox Engine', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Kafka WAL Log Tailer' },
                    { id: 'clickhouse', label: 'ClickHouse Immutable Ledger', type: 'vram', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'Reconciliation & Settlement' }
                ],
                edges: [
                    { from: 'redis_fail', to: 'cdc', label: 'Failover Trigger', appearsAtSec: 1.2 },
                    { from: 'cdc', to: 'clickhouse', label: 'Replay Exact Log Delta', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b6_benchmarks',
            renderer: 'DIAGRAM',
            title: { en: 'Section 6 · Real-World Tech Benchmarks' },
            narration: 'Comparing architecture choices: TikTok uses LMAX Ring Buffers and Redis ZSETs for 500k QPS live leaderboards. Twitch uses Distributed Elixir Actors and DynamoDB. YouTube Live Super Chat relies on Spanner multi-region transactions with higher latency.',
            metrics: ['TikTok: 500K QPS ZSET', 'Twitch: Elixir & DynamoDB', 'YouTube: Spanner 2PC'],
            diagramSpec: {
                nodes: [
                    { id: 'tiktok', label: 'TikTok Live Gifting', type: 'gpu', x: 20, y: 45, appearsAtSec: 0.2, subtext: 'LMAX + Redis ZSET (Sub-50ms)' },
                    { id: 'twitch', label: 'Twitch Channel Points', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Elixir Actors + DynamoDB' },
                    { id: 'youtube', label: 'YouTube Super Chat', type: 'storage', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'Spanner Multi-Region 2PC' }
                ],
                edges: [
                    { from: 'tiktok', to: 'twitch', label: 'Compare Memory Models', appearsAtSec: 1.2 },
                    { from: 'twitch', to: 'youtube', label: 'Compare Consistency', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b7_summary',
            renderer: 'DIAGRAM',
            title: { en: 'Section 7 · Architecture Summary & Key Tradeoffs' },
            narration: 'In summary: edge micro-batching via LMAX ring buffers prevents hot-key locks, Kafka ensures partition-ordered streaming, Redis ZSET drives sub-50ms live leaderboards, and CDC WAL tailing guarantees 100% financial accuracy for creator payouts.',
            metrics: ['LMAX Micro-Batching', 'Kafka Partition Ordering', 'Zero Coin Loss'],
            diagramSpec: {
                nodes: [
                    { id: 'lmax', label: '1. Lock-free Microbatch', type: 'gateway', x: 20, y: 45, appearsAtSec: 0.2, subtext: '500k QPS Ingest' },
                    { id: 'zset', label: '2. Redis ZSET Push', type: 'gpu', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Sub-50ms Rank Fan-Out' },
                    { id: 'audit', label: '3. Outbox CDC Settlement', type: 'vram', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'ClickHouse Audit Trail' }
                ],
                edges: [
                    { from: 'lmax', to: 'zset', label: 'Real-time Rank Pipeline', appearsAtSec: 1.2 },
                    { from: 'zset', to: 'audit', label: 'Async Financial Sync', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b8_outro',
            renderer: 'VEO',
            title: { en: 'Section 8 · Mandatory Outro & Interactive Practice CTA' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            metrics: ['Like & Subscribe', '300+ Company Scenarios', 'CareerVivid Interactive Studio'],
            veoPrompt: buildPrompt({
                shot: 'A paper-collage montage showing a glowing play icon stamp, a paper smartphone displaying system design diagrams, and a bright red subscribe tag.',
                location: 'Warm yellowed newsprint paper background with crisp paper torn drop shadows and mustard yellow accents.',
                beats: [
                    '0.0s - A red subscribe tag drops into frame with a snappy paper bounce.',
                    '3.0s - Hand-drawn black vector arrows circle around an interactive system design badge.',
                    '6.0s - The CareerVivid brand seal slides cleanly into the center of frame with yellow particle sparkles.'
                ]
            })
        }
    ]
};
