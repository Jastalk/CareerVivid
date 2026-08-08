/**
 * systemDesignDiscordScript.ts
 *
 * Upgraded Script for Today's Video #3:
 *   System Design Interview — How to Design Discord (10M Concurrent Voice & Text Channels)
 *
 * 6-Section Blueprint:
 *   1. Monolith Intuition Hook: Relational DBs failing under millions of concurrent real-time chat servers.
 *   2. Erlang/Elixir Actor Model: Lightweight process-per-channel state handling.
 *   3. ScyllaDB Distributed Storage: Timestamp-sorted clustering keys for instant history scrolling.
 *   4. Voice Channel Architecture: WebRTC Selective Forwarding Units (SFUs) & active speaker routing.
 *   5. Production Failure Modes & Edge Cases: Read pointer CRDTs & hot-partition throttling.
 *   6. Tech Benchmarks & Spoken Like & Subscribe CTA + CareerVivid Interactive Platform.
 */

export interface DiscordBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
    };
}

export const SYSTEM_DESIGN_DISCORD_BEATS: DiscordBeat[] = [
    {
        id: 'sd-discord-intro',
        title: { en: 'Designing Discord · 10M Concurrent Voice & Text Channels', zh: '设计 Discord · 1000 万并发语音与文本频道' },
        narration: {
            en: 'When 200 Million gaming enthusiasts chat and stream voice across millions of servers, traditional relational databases collapse under lock contention! How does Discord deliver sub-millisecond real-time messaging and voice without lagging?',
            zh: '当 2 亿游戏玩家在数百万个服务器中进行文本与语音聊天时，传统关系型数据库在锁争用下瞬间崩溃！Discord 到底如何在零卡顿下实现亚毫秒级实时消息与语音传输？',
        },
        visual: {
            badge: 'REAL-TIME CHAT · MASSIVE SCALE',
            cardTitle: 'Scaling 10M Concurrent Voice & Text Channels',
        },
    },
    {
        id: 'sd-discord-actor-model',
        title: { en: 'Erlang/Elixir BEAM Actor Model Architecture', zh: 'Erlang/Elixir BEAM Actor 模型架构' },
        narration: {
            en: 'Instead of thread-per-connection OS overhead, Discord uses the Erlang BEAM Actor Model! Every single Discord text and voice channel runs as an isolated, lightweight process using only 2 kilobytes of memory, effortlessly handling millions of concurrent WebSockets.',
            zh: '放弃高开销的线程模型，Discord 采用 Erlang BEAM Actor 架构！每一个 Discord 文本与语音频道都运行为独立的轻量级进程，仅占用 2KB 内存，轻松掌控数百万并发 WebSocket 连线！',
        },
        visual: {
            badge: 'ACTOR MODEL · ERLANG / ELIXIR BEAM',
            cardTitle: 'Lightweight Process-Per-Channel Handling Millions of WebSockets',
        },
    },
    {
        id: 'sd-discord-scylladb-store',
        title: { en: 'ScyllaDB / Cassandra Distributed Message Store', zh: 'ScyllaDB / Cassandra 分布式消息存储' },
        narration: {
            en: 'How does Discord store trillions of chat messages? ScyllaDB! Messages are partitioned by Guild and Channel ID, using timestamp Snowflake IDs as clustering keys, allowing instant sequential history reads over SSD storage disks.',
            zh: 'Discord 如何存储数万亿条历史消息？ScyllaDB！消息按 Guild 和 Channel ID 进分片，利用 Snowflake 时间戳 ID 作为聚簇索引，在 SSD 磁盘上实现瞬间顺序历史读取。',
        },
        visual: {
            badge: 'DISTRIBUTED STORAGE · SCYLLADB',
            cardTitle: 'Partitioned Message Storage with Snowflake Clustering Keys',
        },
    },
    {
        id: 'sd-discord-sfu-voice',
        title: { en: 'WebRTC Selective Forwarding Units (SFUs)', zh: 'WebRTC 选择性转发单元 (SFU) 语音架构' },
        narration: {
            en: 'P2P mesh voice fails when 10 users join a voice call! Discord routes voice via Selective Forwarding Units (SFUs). The SFU decrypts incoming Opus audio packets and forwards audio only to active listeners, cutting bandwidth usage by 90%!',
            zh: '当 10 个人加入语音通话时，P2P 点对点网络必然崩溃！Discord 采用 SFU (选择性转发单元) 路由语音。SFU 接收加密 Opus 音频包，仅向活跃听众转发，降低 90% 带宽消耗！',
        },
        visual: {
            badge: 'VOICE ARCHITECTURE · WEBRTC SFU',
            cardTitle: 'Selective Forwarding Units Routing Low-Latency Opus Audio',
        },
    },
    {
        id: 'sd-discord-read-pointers',
        title: { en: 'Read Pointers & Hot-Partition Throttling', zh: '已读指针 CRDT 与热点分片限流' },
        narration: {
            en: 'What happens when a popular streamer posts in a channel with 500,000 members? Discord uses Conflict-Free Replicated Data Types (CRDTs) to track read pointers locally, preventing database write spikes when half a million users scroll through messages!',
            zh: '当大 V 在 50 万人的频道里发消息会发生什么？Discord 利用无冲突复制数据类型 (CRDT) 在本地跟踪已读指针，防止半百万人刷消息时对数据库造成写暴击！',
        },
        visual: {
            badge: 'RESILIENCE & CRDTS · READ POINTERS',
            cardTitle: 'Conflict-Free Read Pointers & Partition Protection',
        },
    },
    {
        id: 'sd-discord-benchmark',
        title: { en: 'Tech Benchmark · Discord Actor Model vs Slack Polling', zh: '架构对比 · Discord Actor 模型 vs Slack HTTP 架构' },
        narration: {
            en: 'How does Discord compare to traditional enterprise chat engines? While legacy architectures struggle with heavy HTTP polling overhead, Discord\'s BEAM Actor Model handles stateful persistent channels at 10 times lower memory per connection!',
            zh: 'Discord 与传统企业聊天引擎有何不同？传统架构受困于高昂的 HTTP 轮询开销，而 Discord 的 BEAM Actor 模型以单连接少 10 倍的内存掌控着长连接实时频道！',
        },
        visual: {
            badge: 'TECH BENCHMARK · ACTOR MODEL VS HTTP',
            cardTitle: 'Stateful Persistent Connections vs Legacy Polling Overhead',
        },
    },
    {
        id: 'sd-discord-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive messaging scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战与 300+ 真实大厂面试题库！',
        },
        visual: {
            badge: 'INTERACTIVE PRACTICE · CAREERVIVID',
            cardTitle: 'Practice Real System Design Scenarios',
        },
    },
];
