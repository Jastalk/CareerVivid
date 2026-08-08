/**
 * systemDesignTikTokScript.ts
 *
 * Upgraded High-Knowledge, Ultra-Engaging Script for YouTube:
 *   System Design Interview — How to Design TikTok (Vector ANN Rec Engine & Zero-Lag HLS Feed)
 *
 * Hello Interview & Vox Documentary Style Blueprint:
 *   1. Viral Hook (0-15s): The 50ms algorithm that hooked 1 Billion humans.
 *   2. Monolith Intuition: Monolithic SQL queries vs 50M daily video uploads.
 *   3. Phase 1 — Candidate Generation (Vector ANN Recall via HNSW): Filtering 50M videos to 100 in 5ms.
 *   4. Phase 2 — Multi-Task Deep Neural Ranking: Predicting Watch Time, Likes & Shares.
 *   5. Phase 3 — High-Concurrency Sharded Counters: 10M Likes/sec using Redis Shards & CRDTs.
 *   6. Phase 4 — Zero-Lag Edge HLS Prefetching: Prefetching initial 2s segments to mobile RAM.
 *   7. Failure Modes & Edge Cases: Cache Stampedes on viral trends & Singleflight request collapsing.
 *   8. Tech Benchmark: TikTok Dense Vectors vs YouTube Collaborative Graph.
 *   9. High-Converting Interactive Platform CTA: CareerVivid System Design Labs.
 */

export interface TikTokBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
        badOption?: { head: head; body: string };
        goodOption?: { head: string; body: string };
    };
}

export const SYSTEM_DESIGN_TIKTOK_BEATS = [
    // ── Beat 1: The Viral Hook & Monolith Intuition ───────────────────────────
    {
        id: 'sd-tiktok-intro',
        title: { en: 'Designing TikTok · The 50ms Algorithm That Hooked 1B Users', zh: '设计 TikTok · 勾住 10 亿人的 50 毫秒算法' },
        narration: {
            en: 'How does TikTok know what you want to watch before you even finish swiping? At 100,000 requests per second, querying a database for recommended videos would crash traditional SQL servers instantly. How does TikTok process 50 million candidate videos in under 50 milliseconds?',
            zh: 'TikTok 到底如何在你的手指滑屏结束前，就知道你想看什么？在每秒 10 万次请求的高峰期，传统数据库查询会瞬间奔溃。TikTok 到底如何在不到 50 毫秒内，从 5000 万候选视频中找到你的专属推荐？',
        },
        visual: {
            badge: 'RECOMMENDATION ARCHITECTURE · ULTRA HIGH THROUGHPUT',
            cardTitle: 'Serving 1 Billion Users in Under 50ms',
            badOption: {
                head: '❌ Relational Database SQL JOIN Query',
                body: 'O(N*M) full table scans causing 10-second latency & server lockup',
            },
            goodOption: {
                head: '✅ Two-Stage Candidate Retrieval Funnel',
                body: 'HNSW Vector ANN Recall (5ms) + Multi-Task Deep Neural Ranker (20ms)',
            },
        },
    },

    // ── Beat 2: Phase 1 — Candidate Generation (Vector ANN via HNSW Graph) ───
    {
        id: 'sd-tiktok-candidate-ann',
        title: { en: 'Phase 1 · HNSW Vector ANN Recall (50M ➔ 100 Candidates)', zh: '阶段一 · HNSW 向量近似最近邻召回 (5000万 ➔ 100个候选)' },
        narration: {
            en: 'The first stage is Candidate Generation! TikTok converts user interests and video attributes into high-dimensional vector embeddings. Using HNSW—Hierarchical Navigable Small World graphs—TikTok prunes 50 million video candidates down to 100 in just 5 milliseconds!',
            zh: '推荐第一阶段：候选者召回！TikTok 将用户兴趣与视频特征转化为高维向量嵌入。通过 HNSW (层级可导航小世界) 向量索引图，TikTok 在短短 5 毫秒内将 5000 万个视频快速裁剪至 100 个精准候选！',
        },
        visual: {
            badge: 'VECTOR SEARCH · HNSW GRAPH INDEXING',
            cardTitle: '5ms High-Dimensional Vector ANN Search',
            badOption: {
                head: '❌ Brute-Force Vector Distance Computation',
                body: 'Comparing 512-dim embedding against 50M items ➔ Hundreds of seconds',
            },
            goodOption: {
                head: '✅ HNSW Graph ANN Retrieval',
                body: 'Logarithmic O(log N) vector graph traversal in 5ms',
            },
        },
    },

    // ── Beat 3: Phase 2 — Multi-Task Neural Network Ranking ──────────────────
    {
        id: 'sd-tiktok-recommendation',
        title: { en: 'Phase 2 · Deep Neural Ranking & Multi-Task Prediction', zh: '阶段二 · 深度神经网络多目标精排' },
        narration: {
            en: 'Next comes Multi-Task Neural Ranking! A deep learning model scores the 100 candidate videos by predicting probability of watch completion, likes, comments, and shares. The final score is a weighted combination designed to maximize user retention.',
            zh: '紧接着是多目标深度神经网络精排！AI 模型对这 100 个候选视频逐一打分，同时预测用户完播率、点赞率、评论率与分享率，最终融合出能够最大化留存率的得分序列！',
        },
        visual: {
            badge: 'DEEP LEARNING RANKER · MULTI-TASK DNN',
            cardTitle: 'Multi-Objective Prediction Engine',
            badOption: {
                head: '❌ Heuristic Rule-Based Sorting',
                body: 'Static popularity ranking ignoring individual real-time user taste',
            },
            goodOption: {
                head: '✅ Multi-Task Neural Network (MT-DNN)',
                body: 'Predicting P(Watch), P(Like), P(Share) with real-time feedback loops',
            },
        },
    },

    // ── Beat 4: Phase 3 — High-Concurrency Sharded Counters (10M Likes/sec) ─
    {
        id: 'sd-tiktok-counter-sharding',
        title: { en: 'Phase 3 · 10M Likes/sec Counter Sharding & Redis CRDTs', zh: '阶段三 · 每秒 1000 万点赞的分片计数器与 Redis CRDT' },
        narration: {
            en: 'When a video goes viral, millions of users hit "Like" simultaneously! Updating a single counter causes massive write lock bottlenecks. TikTok solves this by splitting like counters across 50 Redis shards, periodically aggregating counts using CRDTs!',
            zh: '当一条视频爆火时，数百万人同时点击点赞！更新单一数据库计数器会导致严重的写入锁瓶颈。TikTok 的解决方案是：将点赞计数器分散到 50 个 Redis 分片中，并通过 CRDT 机制定期汇总！',
        },
        visual: {
            badge: 'HIGH CONCURRENCY · SHARDED COUNTER ENGINE',
            cardTitle: 'Distributed Counter Sharding under 10M QPS',
            badOption: {
                head: '❌ Single Database Row Update Lock',
                body: 'Row-level locking collapses under concurrent write spikes',
            },
            goodOption: {
                head: '✅ 50-Shard Redis Counter + CRDT Aggregation',
                body: 'Zero write lock congestion + asynchronous batch flush to disk',
            },
        },
    },

    // ── Beat 5: Phase 4 — Zero-Lag Edge HLS Prefetching ──────────────────────
    {
        id: 'sd-tiktok-cdn-prefetch',
        title: { en: 'Phase 4 · Zero-Lag Edge HLS Prefetch & Mobile RAM Buffer', zh: '阶段四 · 零卡顿 Edge HLS 预加载与手机 RAM 缓存' },
        narration: {
            en: 'Why is there zero buffering when you swipe to the next video? Edge HLS Prefetching! As you watch video one, the TikTok app silently pre-downloads the first 2 seconds of videos two, three, and four into phone memory via nearby CDN edge nodes!',
            zh: '为什么划到下一个视频时完全零卡顿？因为有“边缘 HLS 预加载”！当你还在看第一个视频时，TikTok 已经悄悄通过最近的 CDN 节点，将后面 3 个视频的前 2 秒切片预先加载进了手机内存中！',
        },
        visual: {
            badge: 'MEDIA DELIVERY · EDGE CDN PREFETCHING',
            cardTitle: 'Sub-100ms Playback Startup Architecture',
            badOption: {
                head: '❌ On-Demand Stream Fetch after Swipe',
                body: 'Noticeable 1-2 second video loading spinner on every swipe',
            },
            goodOption: {
                head: '✅ Predictive 2-Second Edge HLS Prefetching',
                body: 'Instantaneous video start directly from device RAM cache',
            },
        },
    },

    // ── Beat 6: Failure Modes — Cache Stampedes & Singleflight Collapsing ────
    {
        id: 'sd-tiktok-transcoding',
        title: { en: 'Failure Modes · Cache Stampede Shield & Singleflight', zh: '故障模式 · 缓存雪崩防护与 Singleflight 请求合并' },
        narration: {
            en: 'What happens if a viral video cache key expires right when 100,000 users swipe to it? Cache Stampede! Millions of requests hit backend servers simultaneously. TikTok uses Singleflight Request Collapsing, ensuring only one request fetches from origin while 99,999 wait.',
            zh: '如果热门视频的缓存刚好失效，10 万名用户同时滑到它会发生什么？缓存雪崩！TikTok 采用“Singleflight 请求合并机制”，确保只有一个请求去穿透回源，其余 99,999 个请求共享同一份结果！',
        },
        visual: {
            badge: 'SYSTEM RESILIENCE · SINGLEFLIGHT REQUEST SHIELD',
            cardTitle: 'Mitigating Cache Stampedes on Viral Content',
            badOption: {
                head: '❌ Unchecked Cache Invalidation Pass-Through',
                body: 'Origin database crash under simultaneous thundering herd requests',
            },
            goodOption: {
                head: '✅ Singleflight Request Mutex Collapsing',
                body: '1 origin fetch shared across 100k incoming client requests',
            },
        },
    },

    // ── Beat 7: Real-World Tech Benchmarks (TikTok HNSW vs YouTube Graph) ─────
    {
        id: 'sd-tiktok-storage-hybrid',
        title: { en: 'Tech Benchmarks · TikTok Dense Vectors vs YouTube Graph', zh: '架构对比 · TikTok 稠密向量 vs YouTube 协同图' },
        narration: {
            en: 'How does TikTok\'s recommendation architecture compare to YouTube? YouTube historically relied on Collaborative Filtering Graph networks, optimized for long-form content search. TikTok uses Dense Vector Embeddings and real-time micro-feedback loops to personalize short-form feeds instantly.',
            zh: 'TikTok 的推荐架构与 YouTube 有何区别？YouTube 传统上依赖协同过滤图网络，适合长视频搜索；而 TikTok 采用稠密向量嵌入与秒级微反馈闭环，专门为短视频极速推荐而生！',
        },
        visual: {
            badge: 'TECH BENCHMARK · TIKTOK VS YOUTUBE',
            cardTitle: 'Recommendation Engine Comparison',
            badOption: {
                head: '❌ Slow Collaborative Filtering Graph Update',
                body: 'Hours of latency before new user interactions reflect in recommendations',
            },
            goodOption: {
                head: '✅ Dense Vector Real-Time Feedback Loop (TikTok)',
                body: 'Sub-second real-time model updates adapting to instant swipes',
            },
        },
    },

    // ── Beat 8: High-Converting Interactive Platform CTA ─────────────────────
    {
        id: 'sd-tiktok-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'Want to master vector search engines, high-concurrency sharding, and system design interviews? Practice interactive scenarios, capacity planning tools, and 300+ real tech company interview questions today on CareerVivid!',
            zh: '想掌握向量搜索引擎、高并发分片与大厂系统设计面试吗？立即访问 CareerVivid 开启交互式实战、容量计算器与 300+ 真实大厂面试题库！',
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
