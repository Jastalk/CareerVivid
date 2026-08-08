/**
 * systemDesignApiDataScript.ts
 *
 * Documentary Explainer Script for:
 *   System Design Interview — Core Design: APIs & Data Models
 *
 * Pedagogical Strategy (Domain 1 Human-First Storytelling):
 *   1. Real-world human scenario (Buying concert tickets / network timeout double charge)
 *   2. Idempotency Key mechanism (Unique client request token)
 *   3. Zero-Downtime Live Schema Migrations (Expand/Contract pattern)
 *   4. Read vs Write Separation (Primary Store vs Derived Read Models)
 *   5. Smooth transition to interactive practice exercises
 */

export interface SystemDesignBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
        badOption?: { head: string; body: string };
        goodOption?: { head: string; body: string };
        steps?: string[];
    };
}

export const SYSTEM_DESIGN_API_BEATS: SystemDesignBeat[] = [
    // ── Prologue ────────────────────────────────────────────────────────────
    {
        id: 'sd-intro',
        title: { en: 'Core Design · APIs & Data Models', zh: '核心设计 · API 与数据模型' },
        narration: {
            en: 'System design interviews often feel abstract and intimidating. But at its core, every massive system—from Uber to Stripe—comes down to two fundamental decisions: how apps talk to each other through APIs, and how data is safely stored in databases.',
            zh: '系统设计面试常常让人感觉抽象又复杂。但归根结底，从 Uber 到 Stripe，每个庞大系统的核心都取决于两大根本决策：应用之间如何通过 API 对话，以及数据如何安全地存入数据库。',
        },
        visual: {
            badge: 'SYSTEM DESIGN INTERVIEW · CORE DESIGN',
            cardTitle: 'APIs & Data Models: The Foundation',
            badOption: {
                head: '❌ Hasty Table Design',
                body: 'Creates race conditions, duplicate writes & system downtime',
            },
            goodOption: {
                head: '✅ Contract-First Architecture',
                body: 'Guarantees idempotency, clear ownership & zero-downtime evolution',
            },
        },
    },

    // ── Problem: The Double-Charge Disaster ─────────────────────────────────
    {
        id: 'sd-idempotency-story',
        title: { en: 'The Double-Charge Problem', zh: '扣款难题 · 两次点击的尴尬' },
        narration: {
            en: 'Picture this: you are buying a hundred dollar concert ticket on your phone. You tap "Pay Now", but the subway tunnel cuts your connection. Did the payment go through? You hit "Pay Now" again out of panic. Without a safe API design, you just bought two tickets for one seat!',
            zh: '设想这个场景：你正在用手机抢一张 100 美元的演唱会门票。你点击了“立即支付”，但地铁隧道让网络断开了一秒。扣款成功了吗？恐慌中你又点了一次“立即支付”。如果没有安全的 API 设计，你刚刚为一张座位付了两次钱！',
        },
        visual: {
            badge: 'CRITICAL FAILURE MODE · RETRY TIMEOUT',
            cardTitle: 'Network Dropout Creates Duplicate Side Effects',
            badOption: {
                head: '❌ Blind Retry Without Identity',
                body: 'Client retries payment API ➔ Server creates 2 distinct charges ($200)',
            },
            goodOption: {
                head: '✅ Safe Idempotent Mutation',
                body: 'Client attaches unique request key ➔ Server deduplicates identical retries',
            },
        },
    },

    // ── Solution: Idempotency Keys ──────────────────────────────────────────
    {
        id: 'sd-idempotency-solution',
        title: { en: 'Idempotency Keys', zh: '幂等性设计 · 唯一请求令牌' },
        narration: {
            en: 'The solution is Idempotency. Before sending the request, your app generates a unique Idempotency Key—like a receipt number attached upfront. If the network drops and you retry, the server checks the key, sees it already processed that exact payment, and safely returns the original receipt without charging you twice!',
            zh: '解决方案叫做“幂等性 (Idempotency)”。在发包前，客户端生成一个唯一的幂等 Key——就像预先附带一张小票编号。即使网络中断重新发送，服务器查到该 Key 已被处理过，就会直接安全地返回第一次的收据，绝不会重复扣款！',
        },
        visual: {
            badge: 'ARCHITECTURE PATTERN 1 · IDEMPOTENCY KEY',
            cardTitle: 'How Idempotency Guarantees Exact-Once Processing',
            badOption: {
                head: '❌ Without Idempotency Key',
                body: 'Every HTTP POST creates a new DB record & external API side effect',
            },
            goodOption: {
                head: '✅ With Idempotency Record Store',
                body: 'First write stores result by key ➔ Retries return cached response instantly',
            },
        },
    },

    // ── Live Schema Migrations: Expand / Contract ───────────────────────────
    {
        id: 'sd-expand-contract',
        title: { en: 'Zero-Downtime Schema Evolution', zh: '零停机数据库迁移 · Expand / Contract 模式' },
        narration: {
            en: 'Now, what happens when you need to change a live database table handling millions of users? You cannot just delete a column! Senior engineers use the Expand and Contract pattern: first add new columns, dual-write to both, backfill old data, switch reads, and finally remove the old column. Five smooth steps with zero downtime.',
            zh: '那么，当你要修改一个正承载数百万用户的在线数据库表时会怎样？你绝不能直接删掉旧字段！资深工程师使用 Expand / Contract 模式：先新增新字段，双写新旧字段，补全历史数据，切读到新字段，最后收缩移除旧字段。5步平滑演进，零停机！',
        },
        visual: {
            badge: 'ARCHITECTURE PATTERN 2 · EXPAND & CONTRACT',
            cardTitle: '5 Steps to Upgrade Live Production Databases',
            steps: [
                '1. Expand: Add new columns alongside old ones',
                '2. Dual-Write: Write to both old and new columns',
                '3. Backfill: Migrate historical rows asynchronously',
                '4. Switch Reads: Point queries to new schema',
                '5. Contract: Drop old column safely',
            ],
            badOption: {
                head: '❌ Alter Table In-Place',
                body: 'Locks table, breaks live API clients & causes production downtime',
            },
            goodOption: {
                head: '✅ Expand / Contract Pattern',
                body: '100% backward-compatible migration with zero downtime',
            },
        },
    },

    // ── Read Models vs Primary Source of Truth ────────────────────────────────
    {
        id: 'sd-read-model',
        title: { en: 'Reads vs Writes (CQRS)', zh: '读写分离 · 事务库与衍生读模型' },
        narration: {
            en: 'Finally, balance speed and safety by separating reads from writes. Use a primary relational database for strict transactional writes, while feeding a derived read model—like Redis or Elasticsearch—for lighting-fast queries. Write safely once, read anywhere at scale.',
            zh: '最后，通过读写分离平衡速度与安全。使用主关系型数据库处理严格的事务写入，同时将数据实时派生到 Redis 或 Elasticsearch 等读模型中。安全写入一次，分布式极速读取！',
        },
        visual: {
            badge: 'ARCHITECTURE PATTERN 3 · DERIVED READ MODELS',
            cardTitle: 'Separating Writes (ACID) from Reads (High Throughput)',
            badOption: {
                head: '❌ Heavy Joins on Primary DB',
                body: 'Complex queries slow down critical payment transactions',
            },
            goodOption: {
                head: '✅ Primary DB ➔ Derived Read Model',
                body: 'Strict ACID writes on primary store + sub-millisecond cached reads',
            },
        },
    },

    // ── Epilogue ────────────────────────────────────────────────────────────
    {
        id: 'sd-outro',
        title: { en: 'Interactive Practice · Ready to Test?', zh: '互动实战 · 准备好测试了吗？' },
        narration: {
            en: 'You now understand the core principles of APIs and Data Models in plain English! Head over to the interactive system design practice exercises below to test your knowledge and master the interview drill!',
            zh: '你现在已经用最通俗易懂的语言掌握了 API 与数据模型的核心原则！快去完成下面的系统设计互动练习，实战巩固你的面试功底吧！',
        },
        visual: {
            badge: 'SYSTEM DESIGN PRACTICE DRILL',
            cardTitle: 'Master System Design Interviews',
            badOption: {
                head: '🎓 Core Design Concepts Mastered',
                body: 'Idempotency, Expand/Contract, & Derived Read Models',
            },
            goodOption: {
                head: '📝 Complete Interactive Exercises',
                body: 'Tap the exercises below to practice live decision scenarios!',
            },
        },
    },
];
