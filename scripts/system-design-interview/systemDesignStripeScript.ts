/**
 * systemDesignStripeScript.ts
 *
 * Today's Video #1:
 *   System Design Interview — How to Design Stripe (Idempotency, 2PC vs Saga & Outbox CDC)
 *
 * 6-Section Blueprint:
 *   1. Monolith Intuition Hook: Network timeouts causing accidental double-charges.
 *   2. Idempotency Layer: Redis Redlock mutex & atomic key deduplication.
 *   3. 2PC vs Saga Pattern: Orchestrating distributed multi-bank transactions.
 *   4. Production Failure Modes: Transactional Outbox & Debezium WAL tailer.
 *   5. Double-Entry Accounting: Immutable append-only ledger balances.
 *   6. Tech Benchmarks & Spoken Like & Subscribe CTA + CareerVivid Interactive Platform.
 */

export interface StripeBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
    };
}

export const SYSTEM_DESIGN_STRIPE_BEATS: StripeBeat[] = [
    {
        id: 'sd-stripe-intro',
        title: { en: 'Designing Stripe · Idempotent Financial Processing', zh: '设计 Stripe · 幂等金融支付系统' },
        narration: {
            en: 'When millions of credit card transactions flood a global payment gateway, network timeouts can cause double-charging or lost money! How does Stripe process billions of dollars with zero financial data loss and strict zero double-charge guarantees?',
            zh: '当数百万信用卡交易涌入全球支付网关时，网络超时极易导致重复扣款或资金丢失！Stripe 到底如何在零资金损失与严格零重复扣款保证下处理数千亿美元交易？',
        },
        visual: {
            badge: 'PAYMENT GATEWAY · ZERO DATA LOSS',
            cardTitle: 'Scaling High-Availability Idempotent Payment Systems',
        },
    },
    {
        id: 'sd-stripe-idempotency',
        title: { en: 'Idempotency Layer & Redis Redlock Mutex', zh: '幂等层与 Redis Redlock 分布式锁' },
        narration: {
            en: 'To prevent double-charging during network retries, Stripe generates a unique client-side Idempotency Key! An atomic Redis Redlock mutex locks the key instantly, caching the initial payment response so duplicate API requests return the exact same result safely.',
            zh: '为防止网络重试导致重复扣款，Stripe 在客户端生成唯一的幂等 Key！Redis Redlock 原子互斥锁瞬间锁定 Key，并缓存初始支付响应，确保重复 API 请求安全返回完全相同的结果。',
        },
        visual: {
            badge: 'IDEMPOTENCY ENGINE · REDIS REDLOCK',
            cardTitle: 'Atomic Idempotency Key Locking & Response Caching',
        },
    },
    {
        id: 'sd-stripe-saga',
        title: { en: '2PC vs Saga Pattern for Multi-Service Transactions', zh: '2PC 与 Saga 模式 · 多服务事务编排' },
        narration: {
            en: 'Why not traditional Two-Phase Commit SQL locks across banks? 2PC blocks network threads and causes cascading outages! Stripe uses the Saga Orchestration Pattern, executing local transactions sequentially and firing compensating rollbacks if fraud or bank authorization fails.',
            zh: '为什么不用传统跨行二阶段提交 (2PC) 锁？2PC 会阻塞网络线程并引发级联宕机！Stripe 采用 Saga 编排模式，顺序执行本地事务，若风控或银行授权失败则触发补偿性回滚。',
        },
        visual: {
            badge: 'DISTRIBUTED TRANSACTIONS · SAGA PATTERN',
            cardTitle: 'Saga Orchestration & Compensating Rollbacks vs 2PC',
        },
    },
    {
        id: 'sd-stripe-outbox-cdc',
        title: { en: 'Transactional Outbox Pattern & Debezium WAL Tailer', zh: '事务外件箱模式与 Debezium WAL 追尾' },
        narration: {
            en: 'Dual-writing to payment databases and message queues causes split-brain data corruption when queues drop! Stripe writes payment records and Outbox event logs in a single atomic SQL transaction. Debezium WAL tailers asynchronously stream event logs to Kafka with guaranteed at-least-once delivery!',
            zh: '同时向支付数据库和消息队列进行双写会在队列中断时引发数据分裂腐化！Stripe 在单个 SQL 原子事务中写入支付记录与 Outbox 事件日志，Debezium WAL 追尾器异步将日志流式传输至 Kafka，确保至少一次投递！',
        },
        visual: {
            badge: 'RESILIENCE & CDC · TRANSACTIONAL OUTBOX',
            cardTitle: 'Outbox Event Logging & WAL Tailing Prevents Dual-Write Fails',
        },
    },
    {
        id: 'sd-stripe-double-entry-ledger',
        title: { en: 'Double-Entry Financial Ledger & Append-Only Storage', zh: '双式记账金融账本与追加存储' },
        narration: {
            en: 'How does Stripe maintain immutable financial accounting? Double-Entry Bookkeeping! Every debit to a customer balance must match an exact credit to a merchant balance in append-only storage, guaranteeing zero balance drift even during datacenter failovers!',
            zh: 'Stripe 如何保持不可篡改的金融会计账目？双式记账法！对客户余额的每一笔借记都必须在追加存储中精确匹配商户余额的贷记，即使数据中心灾备切换也确保零余额偏差！',
        },
        visual: {
            badge: 'FINANCIAL LEDGER · DOUBLE-ENTRY BOOKKEEPING',
            cardTitle: 'Immutable Append-Only Debit/Credit Ledger Entries',
        },
    },
    {
        id: 'sd-stripe-benchmark',
        title: { en: 'Tech Benchmark · Stripe Idempotency Layer vs PayPal Ledger', zh: '架构对比 · Stripe 幂等引擎 vs 传统银行 2PC' },
        narration: {
            en: 'How does Stripe compare to legacy banking processors? While traditional banks rely on heavy two-phase locking that chokes under holiday shopping peaks, Stripe\'s distributed idempotency layer and Saga rollbacks process 10,000 transactions per second with sub-50ms latency!',
            zh: 'Stripe 与传统银行支付引擎相比如何？传统银行依赖高昂的二阶段锁，在节日购物高峰下严重卡顿，而 Stripe 的分布式幂等层与 Saga 回滚以低于 50ms 的延迟掌控着每秒 10,000 笔交易！',
        },
        visual: {
            badge: 'TECH BENCHMARK · IDEMPOTENT SAGA VS 2PC',
            cardTitle: 'High-Throughput Sub-50ms Payment Orchestration',
        },
    },
    {
        id: 'sd-stripe-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战与 300+ 真实大厂面试题库！',
        },
        visual: {
            badge: 'INTERACTIVE PRACTICE · CAREERVIVID',
            cardTitle: 'Practice Real System Design Scenarios',
        },
    },
];
