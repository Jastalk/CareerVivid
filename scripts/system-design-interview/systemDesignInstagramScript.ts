/**
 * systemDesignInstagramScript.ts
 *
 * Upgraded High-Knowledge, Ultra-Engaging Script for YouTube:
 *   System Design Interview — How to Design Instagram (Global News Feed & Image Pipeline)
 *
 * Hello Interview & Vox Documentary Style Blueprint:
 *   1. Viral Hook (0-15s): Delivering newsfeeds to 2 Billion users during Taylor Swift posts.
 *   2. Monolith Intuition: Monolithic SQL JOINs vs 2B active users.
 *   3. Write Amplification Bottleneck: 300M write operations per celebrity post.
 *   4. Hybrid Fan-Out Engine: Fan-Out on Write (Normal users) + Fan-Out on Read (Celebrities).
 *   5. Async Image Processing Pipeline: Transcoding raw photos to WebP variants via Worker Queues.
 *   6. Timeline Memory Truncation: Capping Redis ZSET timelines to 800 items per user.
 *   7. Failure Modes & Edge Cases: Thundering Herd feed rebuilds & Probabilistic Expiration.
 *   8. Tech Benchmark: Instagram Hybrid Feed vs Twitter Early Push Architecture.
 *   9. High-Converting Interactive Platform CTA: CareerVivid System Design Labs.
 */

export interface InstagramBeat {
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

export const SYSTEM_DESIGN_INSTAGRAM_BEATS: InstagramBeat[] = [
    // ── Beat 1: The Viral Hook & Monolith Intuition ───────────────────────────
    {
        id: 'sd-instagram-intro',
        title: { en: 'Designing Instagram · Monolith JOIN to 2B Newsfeeds', zh: '设计 Instagram · 从单表 JOIN 到 20 亿动态流' },
        narration: {
            en: 'When Taylor Swift posts a photo to 300 million followers, how does Instagram deliver feeds to 2 Billion users in under 10 milliseconds? A naive SQL JOIN across users and photos would lock up database servers under 100,000 requests per second!',
            zh: '当泰勒·斯威夫特向 3 亿粉丝发布照片，Instagram 到底如何在 10 毫秒内向 20 亿用户推送动态？如果采用跨用户与照片的 SQL JOIN，数据库会在每秒 10 万次请求下直接崩溃锁死！',
        },
        visual: {
            badge: 'NEWSFEED ARCHITECTURE · ULTRA HIGH CONCURRENCY',
            cardTitle: 'Serving 2 Billion Users During Viral Posts',
            badOption: {
                head: '❌ Relational Database SQL JOIN Query',
                body: 'O(N*M) full table scan causing database lockup under high QPS',
            },
            goodOption: {
                head: '✅ Hybrid Fan-Out Engine & Sharded Feed Cache',
                body: 'Fan-Out on Write for normal users + Fan-Out on Read for celebrities',
            },
        },
    },

    // ── Beat 2: Write Amplification Bottleneck ───────────────────────────────
    {
        id: 'sd-instagram-fanout-hybrid',
        title: { en: 'Write Amplification Storm (300M Inboxes per Post)', zh: '写放大风暴 (明星发帖触发表级 3 亿次写入)' },
        narration: {
            en: 'If Instagram used Fan-Out on Write for every user, a single celebrity post would trigger 300 MILLION database inserts simultaneously, backing up message queues for hours! Instagram solves this with a Hybrid Fan-Out Architecture.',
            zh: '如果 Instagram 对所有人都采用“写时推送”，明星发一条动态就会瞬间触发 3 亿次数据库插入，阻塞消息队列数小时！Instagram 引入“混合 Fan-Out 架构”彻底破解写放大风暴。',
        },
        visual: {
            badge: 'FEED ARCHITECTURE · WRITE AMPLIFICATION SHIELD',
            cardTitle: 'Balancing Write Spikes vs Read Latency',
            badOption: {
                head: '❌ Pure Fan-Out on Write Pipeline',
                body: '300M write operations per post crashing message queue workers',
            },
            goodOption: {
                head: '✅ Megaphone Fan-Out on Read for Celebrities',
                body: 'Zero write amplification on celebrity posts + sub-10ms timeline pull',
            },
        },
    },

    // ── Beat 3: Hybrid Push / Pull Newsfeed Engine ───────────────────────────
    {
        id: 'sd-instagram-push-pull',
        title: { en: 'Hybrid Push / Pull Engine (Redis ZSET Timeline Lists)', zh: '推拉结合引擎 (Redis ZSET 时间线列表)' },
        narration: {
            en: 'For regular users, posts are pushed asynchronously to followers\' Redis timeline lists. For high-follower celebrities, posts are pulled on-demand when a user opens the app, combining cached lists with celebrity post feeds seamlessly!',
            zh: '对于普通用户，动态会被异步推送到粉丝的 Redis 时间线列表中；对于大 V 明星，动态则在用户打开 App 时按需拉取，将缓存列表与大 V 动态完美无缝融合！',
        },
        visual: {
            badge: 'HYBRID ENGINE · PUSH VS PULL DISPATCH',
            cardTitle: 'Hybrid Fan-Out Push/Pull Architecture',
            badOption: {
                head: '❌ Pure Pull Architecture for All Users',
                body: 'Massive database query load on every feed refresh',
            },
            goodOption: {
                head: '✅ Hybrid Push (Normal) + Pull (Celebrity)',
                body: 'Sub-10ms newsfeed assembly with zero queue backlog',
            },
        },
    },

    // ── Beat 4: Async Image Processing Pipeline ──────────────────────────────
    {
        id: 'sd-instagram-image-pipeline',
        title: { en: 'Async Image Processing Pipeline (WebP / AVIF Encoding)', zh: '异步图片处理流水线 (WebP / AVIF 多尺寸编码)' },
        narration: {
            en: 'Meanwhile, raw 20-megabyte user photos are ingested into an Async Worker Queue. The pipeline crops and encodes photos into WebP and AVIF format variants, delivering them instantly via global CDN edge nodes.',
            zh: '与此同时，用户上传的 20MB 原始照片被送入异步工作队列。流水线对照片进行裁剪并转码为 WebP 与 AVIF 多尺寸版本，由全球 CDN 边缘节点极速交付。',
        },
        visual: {
            badge: 'MEDIA PROCESSING · ASYNC IMAGE WORKERS',
            cardTitle: 'Parallel Image Resizing & Format Optimization',
            badOption: {
                head: '❌ Synchronous Heavy Image Encoding',
                body: 'API holds connection open while encoding heavy high-res image',
            },
            goodOption: {
                head: '✅ Async Worker Queue (WebP / AVIF)',
                body: 'Instant upload ack + background multi-resolution generation',
            },
        },
    },

    // ── Beat 5: Timeline Memory Truncation & Redis ZSET Capping ──────────────
    {
        id: 'sd-instagram-redis-feed',
        title: { en: 'Timeline Memory Truncation (800 Post ID ZSET Capping)', zh: '时间线内存截断 (800 条 Post ID ZSET 缓存上限)' },
        narration: {
            en: 'What happens if a user follows 5,000 active creators? Timeline memory bloat! Instagram caps Redis ZSET feeds to 800 recent post IDs per user, evicting older posts to disk databases while serving active feeds at microsecond speed.',
            zh: '如果用户关注了 5000 个活跃创作者会怎样？时间线内存暴涨！Instagram 将 Redis ZSET 缓存限制为每人最新 800 条 Post ID，旧动态归档至落盘数据库，微秒级响应活跃动态。',
        },
        visual: {
            badge: 'CACHE RESILIENCE · REDIS ZSET MEMORY CAP',
            cardTitle: 'Sharded Redis Feed Cache & Truncation Policy',
            badOption: {
                head: '❌ Unbounded Timeline Storage in RAM',
                body: 'Memory exhaustion across billions of active user feeds',
            },
            goodOption: {
                head: '✅ 800-Item ZSET Capping + LRU Eviction',
                body: 'Bounded memory footprint + microsecond timeline retrieval',
            },
        },
    },

    // ── Beat 6: Failure Modes — Thundering Herd & Probabilistic Expiration ────
    {
        id: 'sd-instagram-failure-modes',
        title: { en: 'Failure Modes · Thundering Herd & Probabilistic Expiration', zh: '故障模式 · 缓存击穿与概率提前过期' },
        narration: {
            en: 'What happens when a viral feed cache expires right during peak hours? Thundering Herd! Instagram uses Probabilistic Early Expiration, refreshing cache keys in the background before they expire, ensuring 99.99% cache hit stability.',
            zh: '当热门动态缓存刚好在高峰期过期时会发生什么？缓存击穿！Instagram 采用“概率提前过期 (Probabilistic Early Expiration)”，在缓存完全失效前自动在后台刷新，确保 99.99% 的缓存命中率！',
        },
        visual: {
            badge: 'SYSTEM STABILITY · EARLY CACHE REFRESH',
            cardTitle: 'Mitigating Feed Cache Thundering Herds',
            badOption: {
                head: '❌ Hard Key Expiration Timeouts',
                body: 'Simultaneous database queries when popular feed cache expires',
            },
            goodOption: {
                head: '✅ Probabilistic Early Background Refresh',
                body: 'Zero cache misses on active user newsfeeds',
            },
        },
    },

    // ── Beat 7: Real-World Tech Benchmarks (Instagram vs Twitter) ────────────
    {
        id: 'sd-instagram-hot-cdn',
        title: { en: 'Tech Benchmarks · Instagram Hybrid vs Twitter Early Push', zh: '架构对比 · Instagram 混合流 vs Twitter 早金推流' },
        narration: {
            en: 'How does Instagram\'s newsfeed compare to Twitter\'s early architecture? Twitter originally used pure Push Fan-Out, which famously caused outages during peak events! Instagram\'s Hybrid Push-Pull architecture handles high-fanout celebrities with zero write bottlenecks.',
            zh: 'Instagram 的动态流与 Twitter 早期架构有何不同？Twitter 早期采用纯推流 (Push Fan-Out)，在热点事件中频繁引起故障；而 Instagram 的混合推拉架构完全消除了高粉丝量账号的写瓶颈！',
        },
        visual: {
            badge: 'TECH ARCHITECTURE BENCHMARK · INSTAGRAM VS TWITTER',
            cardTitle: 'Real-World Newsfeed Architecture Comparison',
            badOption: {
                head: '❌ Pure Push Fan-Out Architecture (Twitter V1)',
                body: 'Fails under high-follower accounts, creating massive write spikes',
            },
            goodOption: {
                head: '✅ Hybrid Push-Pull Architecture (Instagram)',
                body: 'Optimal balance of write amplification and read latency',
            },
        },
    },

    // ── Beat 8: High-Converting Interactive Platform CTA ─────────────────────
    {
        id: 'sd-instagram-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive newsfeed scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战、缓存计算器与 300+ 真实大厂面试题库！',
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
