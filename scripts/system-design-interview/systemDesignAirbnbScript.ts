/**
 * systemDesignAirbnbScript.ts
 *
 * Upgraded High-Knowledge, Ultra-Engaging Script for YouTube:
 *   System Design Interview — How to Design Airbnb (Distributed Lock & Spatial Search)
 *
 * Hello Interview & Vox Documentary Style Blueprint:
 *   1. Viral Hook (0-15s): Preventing double-booking when 2 users click "Reserve" at the exact same millisecond.
 *   2. Monolith Intuition: Monolithic SQL transactions vs 10M global listings.
 *   3. Distributed Lock Engine (Redis Redlock): 10-minute pessimistic hold preventing double-booking.
 *   4. Spatial Grid Indexing (H3 & Quadtree): Fast lat-long boundary queries for nearby stays.
 *   5. Dynamic Price Elasticity Engine: Machine learning calculation of seasonal pricing demand.
 *   6. Photo Vault & Multi-CDN Optimization: Async image optimization & Blob storage.
 *   7. Failure Modes & Edge Cases: Compensating Saga Transactions resolving split-brain network failures.
 *   8. Tech Benchmark: Airbnb Distributed Lock vs Booking.com Database Row Lock.
 *   9. High-Converting Interactive Platform CTA: CareerVivid System Design Labs.
 */

export interface AirbnbBeat {
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

export const SYSTEM_DESIGN_AIRBNB_BEATS: AirbnbBeat[] = [
    // ── Beat 1: The Viral Hook & Monolith Intuition ───────────────────────────
    {
        id: 'sd-airbnb-intro',
        title: { en: 'Designing Airbnb · Preventing Double Bookings (10M Listings)', zh: '设计 Airbnb · 彻底杜绝 1000 万房源的重复预订' },
        narration: {
            en: 'What happens when two travelers click "Reserve" on the exact same cozy cabin at the exact same millisecond? If Airbnb relied on basic SQL database transactions, both guests would show up with keys to the same front door!',
            zh: '当两名游客在同一毫秒点击预订同一间雪山小屋时会发生什么？如果 Airbnb 依赖简单的数据库事务，两家客人最后会同时拿着钥匙出现在同一扇大门前！',
        },
        visual: {
            badge: 'BOOKING ARCHITECTURE · ULTRA CONSISTENCY',
            cardTitle: 'Preventing Double-Booking Across 10M Listings',
            badOption: {
                head: '❌ Unlocked Relational Database Update',
                body: 'Race condition causing 2 confirmed bookings for 1 room',
            },
            goodOption: {
                head: '✅ Redis Redlock Mutex + 10-Minute Hold Lease',
                body: 'Guaranteed atomic single-guest reservation window',
            },
        },
    },

    // ── Beat 2: Distributed Lock Engine (Redis Redlock) ──────────────────────
    {
        id: 'sd-airbnb-redlock-mutex',
        title: { en: 'Distributed Mutex Lock (Redis Redlock 10-Minute Lease)', zh: '分布式互斥锁 (Redis Redlock 10 分钟锁租约)' },
        narration: {
            en: 'Airbnb solves double-booking with Redis Redlock distributed mutexes! When you enter checkout, a Redlock places a 10-minute lease on the property calendar across independent Redis clusters, granting exclusive booking rights before payment.',
            zh: 'Airbnb 采用 Redis Redlock 分布式锁解决重复预订！当你进入支付页面时，Redlock 会在独立 Redis 集群中对该房间日历加锁 10 分钟，确保你在付款前独占预订权！',
        },
        visual: {
            badge: 'DISTRIBUTED SYSTEMS · ATOMIC LOCKING',
            cardTitle: '10-Minute Reservation Lease Engine',
            badOption: {
                head: '❌ DB Row Locking during Checkout',
                body: 'Long-held database transaction locks freezing read queries for other users',
            },
            goodOption: {
                head: '✅ Redis Redlock Lease (Independent Memory Master)',
                body: 'Sub-millisecond lock acquisition with automatic TTL expiration fallback',
            },
        },
    },

    // ── Beat 3: Spatial Grid Indexing (H3 & Quadtree Search) ──────────────────
    {
        id: 'sd-airbnb-spatial-search',
        title: { en: 'Spatial Indexing Grid (Bounding Box & H3 Cell Filtering)', zh: '空间索引网格 (矩形边框与 H3 蜂窝筛选)' },
        narration: {
            en: 'How does Airbnb filter 10 million listings on an interactive map instantly? Spatial Indexing! Using H3 spatial grids and Quadtrees, Airbnb maps listing coordinates into geohashes, loading only stays within your visible map bounding box.',
            zh: 'Airbnb 如何在地图上秒级筛选 1000 万个房源？空间索引！利用 H3 空间网格与四叉树，Airbnb 将房源坐标转换为 GeoHash，仅加载当前可视地图区域内的房源！',
        },
        visual: {
            badge: 'SPATIAL SEARCH · MAP BOUNDING BOX',
            cardTitle: 'Geohash & Quadtree Spatial Search',
            badOption: {
                head: '❌ Raw Lat-Long Boundary SQL Queries',
                body: 'Unindexed 2D coordinate search choking relational database CPU',
            },
            goodOption: {
                head: '✅ Spatial Geohash Indexing + Memory Cache',
                body: 'Sub-10ms bounding box room retrieval during map drag & zoom',
            },
        },
    },

    // ── Beat 4: Dynamic Seasonal Pricing Engine ──────────────────────────────
    {
        id: 'sd-airbnb-dynamic-pricing',
        title: { en: 'Dynamic Seasonal Pricing Engine & ML Demand Elasticity', zh: '动态季节定价引擎与机器学习需求弹性' },
        narration: {
            en: 'Prices change dynamically based on season, holidays, and local events! Airbnb\'s Dynamic Pricing Pipeline uses machine learning model workers to calculate demand elasticity, updating host price recommendations in real-time.',
            zh: '房价会根据季节、节假日与当地热门活动动态调整！Airbnb 的动态定价流水线利用机器学习模型计算需求弹性，实时更新房东的最佳推荐房价。',
        },
        visual: {
            badge: 'MACHINE LEARNING · DYNAMIC PRICING',
            cardTitle: 'Real-Time Price Elasticity Computation',
            badOption: {
                head: '❌ Static Manual Price Tables',
                body: 'Missed revenue for hosts during unexpected high-demand local events',
            },
            goodOption: {
                head: '✅ ML Demand Elasticity Predictor Worker',
                body: 'Automated daily price updates maximizing host occupancy & revenue',
            },
        },
    },

    // ── Beat 5: Photo Vault & Multi-CDN Image Transcoding ────────────────────
    {
        id: 'sd-airbnb-photo-vault',
        title: { en: 'Photo Vault Storage & Async Multi-CDN Image Transcoding', zh: '照片金库存储与异步多 CDN 图片转码' },
        narration: {
            en: 'A single listing contains dozens of high-res photos. Uploading 20-megabyte images directly would slow down search. Async worker pipelines transcode photos into WebP variants, serving them through multi-region CDN edge nodes.',
            zh: '一个房源通常包含几十张高清大图。直接上传 20MB 原图会严重拖慢搜索。异步节点流水线将照片转码为 WebP 缩略图，并由全球多 CDN 边缘节点交付。',
        },
        visual: {
            badge: 'MEDIA OPTIMIZATION · ASYNC IMAGE WORKERS',
            cardTitle: 'Multi-Resolution WebP Image Delivery',
            badOption: {
                head: '❌ Synchronous High-Res Photo Ingestion',
                body: 'Slow gallery rendering causing user bounce on mobile networks',
            },
            goodOption: {
                head: '✅ Async Image Transcoding + CDN Edge Vault',
                body: 'Sub-second gallery load times with 80% image size reduction',
            },
        },
    },

    // ── Beat 6: Failure Modes — Compensating Saga Transactions ────────────────
    {
        id: 'sd-airbnb-failure-modes',
        title: { en: 'Failure Modes · Compensating Saga Transactions', zh: '故障模式 · 补偿 Saga 事务解耦防雪崩' },
        narration: {
            en: 'What happens when payment succeeds but property reservation fails midway? Distributed Saga Pattern! If any step crashes, compensating rollback transactions execute automatically to refund payment and release room holds safely.',
            zh: '当扣款成功但房间锁卡在中途失效时会发生什么？分布式 Saga 模式！如果任何步骤崩溃，补偿撤销事务将自动触发退款并安全释放房间锁！',
        },
        visual: {
            badge: 'RESILIENCE & RECOVERY · SAGA PATTERN',
            cardTitle: 'Compensating Rollback Transactions',
            badOption: {
                head: '❌ 2PC Distributed Transactions across Cloud Services',
                body: 'Blocking database locks under network partition service outages',
            },
            goodOption: {
                head: '✅ Event-Driven Saga Orchestration',
                body: 'Automatic compensating rollbacks guaranteeing eventual consistency',
            },
        },
    },

    // ── Beat 7: Real-World Tech Benchmarks (Airbnb vs Booking.com) ────────────
    {
        id: 'sd-airbnb-benchmark',
        title: { en: 'Tech Benchmarks · Airbnb Redlock vs Booking.com Database Locks', zh: '架构对比 · Airbnb Redlock vs Booking.com 数据库排他锁' },
        narration: {
            en: 'How does Airbnb compare to Booking.com? Booking.com historically used pessimistic relational database locks. Airbnb uses in-memory Redlock distributed mutexes and Saga pattern orchestration, scaling seamlessly across millions of independent hosts.',
            zh: 'Airbnb 与 Booking.com 架构有何区别？Booking.com 传统上使用关系数据库悲观锁；而 Airbnb 采用内存分布式 Redlock 锁与 Saga 模式协调，完美支撑全球数百万独立房东！',
        },
        visual: {
            badge: 'TECH BENCHMARK · AIRBNB VS BOOKING.COM',
            cardTitle: 'Reservation Architecture Comparison',
            badOption: {
                head: '❌ Pessimistic Database Row Locking (Booking.com)',
                body: 'High database IOPS bottleneck during peak holiday booking rushes',
            },
            goodOption: {
                head: '✅ Redis Redlock Mutex + Saga Orchestration (Airbnb)',
                body: 'Sub-millisecond lock acquisition with zero database IOPS bottleneck',
            },
        },
    },

    // ── Beat 8: High-Converting Interactive Platform CTA ─────────────────────
    {
        id: 'sd-airbnb-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive reservation locking scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战、锁模式计算器与 300+ 真实大厂面试题库！',
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
