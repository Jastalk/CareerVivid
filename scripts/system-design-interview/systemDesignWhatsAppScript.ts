/**
 * systemDesignWhatsAppScript.ts
 *
 * Upgraded High-Knowledge Script for:
 *   System Design Interview — How to Design WhatsApp & Messenger (WebSockets, Saga Pattern & Signal E2EE)
 *
 * Hello Interview High-Knowledge Blueprint Integration:
 *   1. Monolith Intuition Hook: Single SQL transaction vs 100B daily messages across microservices.
 *   2. Persistent WebSockets: Gateway Fleet maintaining bi-directional connections without battery drain.
 *   3. Outbox Pattern & CDC: Eliminating Dual-Write failures between Chat DB and Kafka Queues.
 *   4. Saga Pattern & Idempotency: Handling network drops and compensating transactions for 100% delivery.
 *   5. End-to-End Encryption: Signal Protocol with Ephemeral Diffie-Hellman Key Exchange.
 *   6. Interactive Call to Action: System Design scenarios on CareerVivid App.
 */

export interface WhatsAppBeat {
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

export const SYSTEM_DESIGN_WHATSAPP_BEATS: WhatsAppBeat[] = [
    // ── Beat 1: The Monolith Intuition Hook & Scalability Trap ───────────────
    {
        id: 'sd-whatsapp-intro',
        title: { en: 'Designing WhatsApp · Single DB to 100B Daily Messages', zh: '设计 WhatsApp · 从单库事务到 1000 亿消息瓶颈' },
        narration: {
            en: 'In a simple monolithic app, sending a message is easy: you wrap user status, chat ledger, and notification in a single SQL ACID transaction. But how does WhatsApp deliver over 100 Billion messages daily across weak cellular networks without ever dropping a single text or corrupting chat history?',
            zh: '在单体应用中发消息很简单：单条 SQL 事务包裹聊天日志与通知即可。但当用户规模爆炸，WhatsApp 到底如何在弱网环境下每天送达 1000 亿条消息，同时保证强一致性且绝不丢消息？',
        },
        visual: {
            badge: 'SYSTEM ARCHITECTURE · HIGH SCALABILITY',
            cardTitle: 'Delivering 100B+ Daily Messages Reliably',
            badOption: {
                head: '❌ Monolithic Database Transactions',
                body: 'Lock contention & database crash under 1B connection QPS',
            },
            goodOption: {
                head: '✅ Distributed Gateway Fleets & Microservices',
                body: 'Stateful connection pools with asynchronous event queues',
            },
        },
    },

    // ── Beat 2: Persistent WebSockets & Gateway Fleets ──────────────────────
    {
        id: 'sd-whatsapp-websockets',
        title: { en: 'WebSocket Gateway Fleets · Bi-Directional Connection Pools', zh: 'WebSocket 网关集群 · 双向长连接池' },
        narration: {
            en: 'Instead of phones constantly polling the server, WhatsApp uses persistent WebSockets! A fleet of Gateway Servers holds millions of lightweight, bi-directional TCP connections open, pushing incoming messages to your device in sub-50 milliseconds without draining your battery.',
            zh: '与让手机不断向服务器轮询不同，WhatsApp 采用常驻 WebSocket 双向长连接！网关集群维持着数百万个轻量 TCP 连接，一旦有新消息，毫秒级主动推送到你的手机，且极度省电。',
        },
        visual: {
            badge: 'NETWORK PROTOCOLS · WEBSOCKET FLEETS',
            cardTitle: 'Stateful WebSocket Connection Pools',
            badOption: {
                head: '❌ HTTP Short Polling Loop',
                body: 'Heavy header latency, battery drain, and memory exhaustion',
            },
            goodOption: {
                head: '✅ Stateful Connection Gateway Fleets',
                body: 'Sub-50ms push delivery with minimal TCP socket RAM overhead',
            },
        },
    },

    // ── Beat 3: Dual-Write Avoidance (Transactional Outbox & CDC) ───────────
    {
        id: 'sd-whatsapp-outbox-pattern',
        title: { en: 'Dual-Write Prevention · Transactional Outbox & CDC', zh: '解决双写不一致 · 事务发件箱与 CDC 捕获' },
        narration: {
            en: 'What happens if a message is saved to the database, but the network crashes before pushing to Kafka? The Dual-Write Problem! WhatsApp uses the Transactional Outbox Pattern: messages are committed atomically to a local Outbox table, and Change Data Capture tailing the database WAL guarantees zero message loss.',
            zh: '如果消息存入数据库后，还没推送到 Kafka 消息队列网络就断了怎么办？双写不一致！WhatsApp 引入“事务发件箱 (Outbox) 模式”：消息与发件箱原子写入本地库，配合 CDC (Debezium) 扫描数据库日志，确保 100% 消息零丢失。',
        },
        visual: {
            badge: 'CONSISTENCY PATTERNS · OUTBOX & CDC',
            cardTitle: 'Transactional Outbox & Change Data Capture',
            badOption: {
                head: '❌ Dual-Write to DB and Event Bus',
                body: 'Network drop leaves DB and Kafka queue out of sync',
            },
            goodOption: {
                head: '✅ Outbox Table + CDC WAL Tailing',
                body: 'Atomic database write + guaranteed event queue publication',
            },
        },
    },

    // ── Beat 4: Saga Pattern & Idempotent Message Delivery ───────────────────
    {
        id: 'sd-whatsapp-saga-delivery',
        title: { en: 'Saga Pattern & Idempotency · Compensating Delivery Queues', zh: 'Saga 事务模式 · 幂等去重与补偿队列' },
        narration: {
            en: 'To handle offline devices and group chat fan-out across 200 members, WhatsApp employs the Saga Orchestration Pattern. If a recipient is offline, compensating retry queues hold the encrypted payload with Client Idempotency Keys, guaranteeing exactly-once delivery without duplicate texts.',
            zh: '针对离线接收者与 200 人大群的群发，WhatsApp 采用 Saga 事务编排模式！若部分接收者离线，补偿重试队列会结合客户端“幂等去重 Key”，实现精准的“有且仅有一次 (Exactly-Once)”可靠投递。',
        },
        visual: {
            badge: 'DISTRIBUTED TRANSACTIONS · SAGA PATTERN',
            cardTitle: 'Saga Orchestration & Idempotent Queues',
            badOption: {
                head: '❌ Synchronous Blocking Group Delivery',
                body: 'Sender hangs waiting for all 200 offline device ACKs',
            },
            goodOption: {
                head: '✅ Saga Orchestrator + Idempotency Keys',
                body: 'Instant sender ACK + asynchronous resilient retry queues',
            },
        },
    },

    // ── Beat 5: End-to-End Encryption (Signal Protocol) ─────────────────────
    {
        id: 'sd-whatsapp-encryption',
        title: { en: 'Signal Protocol E2EE · Double Ratchet Key Exchange', zh: 'Signal 端到端加密 · 双棘轮密钥交换' },
        narration: {
            en: 'How does WhatsApp ensure even cloud engineers cannot read your private messages? End-to-End Encryption! Using the Signal Protocol\'s Double Ratchet Algorithm, temporary Ephemeral Keys encrypt every single message on your phone, so only the recipient\'s private key can decrypt it.',
            zh: '如何保证即使是云端工程师也无法偷看你的隐私聊天？答案是 Signal 端到端加密！基于“双棘轮算法 (Double Ratchet)”，手机上每一条消息都由动态临时密钥加密，唯有接收者的私钥才能解密！',
        },
        visual: {
            badge: 'CRYPTOGRAPHY · SIGNAL PROTOCOL',
            cardTitle: 'End-to-End Double Ratchet Encryption',
            badOption: {
                head: '❌ Server-Side Decryption Keys',
                body: 'Database breaches expose unencrypted chat logs',
            },
            goodOption: {
                head: '✅ Zero-Trust Ephemeral Key Exchange',
                body: 'Client-side encryption with forward secrecy and zero server access',
            },
        },
    },

    // ── Beat 6: High-Value Interactive Call to Action ───────────────────────
    {
        id: 'sd-whatsapp-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'Want to design high-throughput distributed systems and pass your senior tech interview loops? Practice interactive System Design scenarios, trade-off calculators, and 300+ real tech company interview questions today on CareerVivid!',
            zh: '想掌握高并发分布式系统设计、轻松通关大厂 Tech Interview？立即访问 CareerVivid 开启系统 design 交互实战、架构计算器与 300+ 真实大厂面试题库！',
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
