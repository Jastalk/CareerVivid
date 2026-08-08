/**
 * systemDesignUberScript.ts
 *
 * Upgraded High-Knowledge, Ultra-Engaging Script for YouTube:
 *   System Design Interview — How to Design Uber (Real-Time Spatial Indexing & Ride Matching)
 *
 * Hello Interview & Vox Documentary Style Blueprint:
 *   1. Viral Hook (0-15s): The 1-second matching engine handling 20 Million rides a day.
 *   2. Monolith Intuition: Monolithic SQL spatial queries vs 20M active drivers.
 *   3. Spatial Grid Indexing (Uber H3 Hexagons): Dividing Earth into H3 cells to turn O(N) search into O(1).
 *   4. Driver GPS Stream Avalanche: Ingesting 1M location updates/sec via Kafka & Ring Buffers.
 *   5. Distributed Ride Matching Lock: Redlock Mutex preventing double-dispatch on peak rides.
 *   6. Real-Time Surge Pricing Engine: Apache Flink stream calculation of demand-to-supply ratio.
 *   7. Failure Modes & Edge Cases: Split-Brain cell partitions & GPS signal jitter filtering.
 *   8. Tech Benchmark: Uber H3 Hexagons vs Google S2 Quadtrees.
 *   9. High-Converting Interactive Platform CTA: CareerVivid System Design Labs.
 */

export interface UberBeat {
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

export const SYSTEM_DESIGN_UBER_BEATS: UberBeat[] = [
    // ── Beat 1: The Viral Hook & Monolith Intuition ───────────────────────────
    {
        id: 'sd-uber-intro',
        title: { en: 'Designing Uber · The 1-Second Ride Engine (20M Daily Rides)', zh: '设计 Uber · 处理 2000 万订单的 1 秒派单引擎' },
        narration: {
            en: 'When you tap "Request Uber" at 1 AM in a rainstorm, how does Uber match you with the nearest driver in under one second? At 1 million GPS updates per second, querying a relational database for driver coordinates would crash servers instantly!',
            zh: '当你凌晨 1 点在暴风雨中点击“呼叫 Uber”，Uber 到底如何在不到 1 秒内将你与最近的司机精准匹配？面对每秒 100 万次 GPS 位置更新，用传统数据库扫描坐标会直接拖垮服务器！',
        },
        visual: {
            badge: 'SPATIAL ARCHITECTURE · ULTRA LOW LATENCY',
            cardTitle: 'Matching 20 Million Daily Rides in Under 1s',
            badOption: {
                head: '❌ Relational Database Haversine Distance Search',
                body: 'Full table scan O(N) distance math causing database lockup',
            },
            goodOption: {
                head: '✅ Uber H3 Hexagonal Grid Indexing + Ring Buffer',
                body: 'Constraining driver search to O(1) hexagonal spatial cell lookup',
            },
        },
    },

    // ── Beat 2: Spatial Grid Indexing (Uber H3 Hexagons) ─────────────────────
    {
        id: 'sd-uber-spatial-grid',
        title: { en: 'Uber H3 Hexagonal Spatial Grid (O(N) ➔ O(1) Cell Lookup)', zh: 'Uber H3 六边形空间网格 (空间搜索 O(N) ➔ O(1))' },
        narration: {
            en: 'Uber solves spatial search with H3—a hexagonal grid system that partitions the entire planet into hierarchical hexagonal cells! Instead of calculating distance against 1 million drivers, Uber instantly maps your lat-long to an H3 cell ID, checking only nearby hexagons in constant O(1) time!',
            zh: 'Uber 的杀手锏是 H3 六边形网格系统：它把整个地球分割成层级化的六边形蜂窝！Uber 无需对 100 万司机进行距离计算，而是直接将你的经纬度映射为 H3 蜂窝 ID，以常数级 O(1) 时间秒级检索邻近网格！',
        },
        visual: {
            badge: 'SPATIAL INDEXING · H3 HEXAGONAL GRID',
            cardTitle: 'Global Hexagonal Partitioning Engine',
            badOption: {
                head: '❌ Global Coordinate Scanning',
                body: 'Calculating geodesic distance against all active drivers worldwide',
            },
            goodOption: {
                head: '✅ H3 Resolution 8 Hexagon Ring Search',
                body: 'Sub-millisecond driver lookup limited to k-ring neighbor cells',
            },
        },
    },

    // ── Beat 3: Driver GPS Stream Avalanche & Ring Buffers ───────────────────
    {
        id: 'sd-uber-gps-avalanche',
        title: { en: 'Ingesting 1M GPS Updates/sec via Kafka & Memory Buffers', zh: 'Kafka 与内存环形缓冲区 (每秒处理 100 万次 GPS 流)' },
        narration: {
            en: 'Every active driver sends a GPS location ping every 4 seconds. How does Uber ingest 1 million location updates per second without bottlenecking? High-throughput Kafka event streams feed location updates directly into in-memory Ring Buffers!',
            zh: '数百万名活跃司机每 4 秒就会发送一次 GPS 定位。Uber 如何在不拥堵的前提下吞吐每秒 100 万次位置更新？高吞吐 Kafka 事件流将位置更新直接写入内存环形缓冲区 (Ring Buffers)！',
        },
        visual: {
            badge: 'STREAM PROCESSING · KAFKA LOCATION ENGINE',
            cardTitle: '1M QPS Location Update Stream Pipeline',
            badOption: {
                head: '❌ Synchronous Database Persistence',
                body: 'Database I/O disk saturation under continuous driver GPS pings',
            },
            goodOption: {
                head: '✅ Kafka Event Stream + Memory Ring Buffer',
                body: 'Sub-10ms driver location updates kept in RAM with background async persistence',
            },
        },
    },

    // ── Beat 4: Distributed Ride Matching Lock & Redlock Mutex ────────────────
    {
        id: 'sd-uber-matching-lock',
        title: { en: 'Distributed Matching Mutex & Two-Phase Accept Lock', zh: '分布式派单互斥锁与两阶段确认机制' },
        narration: {
            en: 'What happens when two nearby riders request a trip at the exact same millisecond? Double dispatch panic! Uber uses Redis Redlock distributed mutexes to lock a driver ID for 10 seconds while waiting for the driver to accept the trip offer.',
            zh: '当两名乘客在同一毫秒呼叫同一辆车时会发生什么？双重派单危机！Uber 采用 Redis Redlock 分布式互斥锁，在派单的 10 秒内锁定司机 ID，防止多名乘客同时抢占同一名司机！',
        },
        visual: {
            badge: 'DISTRIBUTED SYSTEMS · LOCKING & CONSENSUS',
            cardTitle: 'Preventing Double-Booking Race Conditions',
            badOption: {
                head: '❌ Unlocked Optimistic Dispatch',
                body: 'Race conditions leading to multiple drivers dispatched to 1 rider',
            },
            goodOption: {
                head: '✅ Redis Redlock Mutex + 10-Second Lease',
                body: 'Guaranteed single-rider lock during dispatch negotiation window',
            },
        },
    },

    // ── Beat 5: Real-Time Dynamic Surge Pricing Engine ───────────────────────
    {
        id: 'sd-uber-surge-pricing',
        title: { en: 'Real-Time Surge Pricing Engine via Apache Flink', zh: '基于 Apache Flink 的实时动态溢价引擎 (Surge Pricing)' },
        narration: {
            en: 'When a concert ends, 10,000 people request rides at once. How does Uber calculate surge pricing dynamically? Apache Flink calculates real-time rider demand versus driver supply in each H3 hexagon every 10 seconds, boosting prices to attract more drivers!',
            zh: '演唱会散场时，上万人同时打车。Uber 如何动态计算溢价？Apache Flink 实时计算流引擎每 10 秒评估各个 H3 网格内的供需比例，通过动态调价吸引更多司机赶往高需求区域！',
        },
        visual: {
            badge: 'STREAM ANALYTICS · REAL-TIME SURGE PIPELINE',
            cardTitle: 'Dynamic Demand-Supply Ratio Computation',
            badOption: {
                head: '❌ Batch Job Hourly Price Calculation',
                body: 'Outdated prices leading to driver shortages during sudden demand spikes',
            },
            goodOption: {
                head: '✅ Apache Flink Sliding Window Analytics',
                body: 'Sub-second H3 cell surge price adjustment balancing local market supply',
            },
        },
    },

    // ── Beat 6: Failure Modes & Edge Cases (Split-Brain & Signal Jitter) ──────
    {
        id: 'sd-uber-failure-modes',
        title: { en: 'Failure Modes · Split-Brain Cell Partitions & GPS Jitter', zh: '故障模式 · 空间网格脑裂与 GPS 信号抖动' },
        narration: {
            en: 'What happens when tall skyscrapers bounce GPS signals, or a network partition splits spatial nodes? Uber uses Kalman Filter algorithms to smooth erratic GPS telemetry, paired with fallback regional datacenters to prevent split-brain cell outages.',
            zh: '当高楼大厦导致 GPS 信号反弹，或网络分区割裂空间节点时会发生什么？Uber 采用卡尔曼滤波算法平滑跳跃的 GPS 轨迹，配合备用区域数据中心防范空间网格脑裂！',
        },
        visual: {
            badge: 'RESILIENCE & EDGE CASES · KALMAN FILTER & FALLBACKS',
            cardTitle: 'GPS Telemetry Smoothing & Spatial Partition Failover',
            badOption: {
                head: '❌ Raw Unfiltered GPS Coordinate Ingestion',
                body: 'Erratic driver location jumps causing false pickup arrival alerts',
            },
            goodOption: {
                head: '✅ Kalman Filter Telemetry Smoothing + Regional Failover',
                body: 'Accurate trajectory tracking + high-availability spatial grid partition',
            },
        },
    },

    // ── Beat 7: Real-World Tech Benchmarks (Uber H3 vs Google S2) ─────────────
    {
        id: 'sd-uber-benchmark',
        title: { en: 'Tech Benchmarks · Uber H3 Hexagons vs Google S2 Quadtree', zh: '架构对比 · Uber H3 六边形网格 vs Google S2 四叉树' },
        narration: {
            en: 'How does Uber H3 compare to Google S2 geometry? Google S2 uses square Quadtrees, which have distorting neighbor distances at corners. Uber H3\'s hexagonal grid ensures every adjacent neighbor cell shares the exact same centroid distance, making spatial math vastly superior for ride routing!',
            zh: 'Uber H3 与 Google S2 空间索引有何区别？Google S2 基于正方形四叉树，其对角线邻居距离存在失真；而 Uber H3 六边形网格确保所有相邻蜂窝的中心点距离完全相等，派单计算更加精准！',
        },
        visual: {
            badge: 'TECH BENCHMARK · UBER H3 VS GOOGLE S2',
            cardTitle: 'Spatial Indexing Architecture Benchmark',
            badOption: {
                head: '❌ Square Quadtree Grid (Google S2)',
                body: 'Corner neighbor distance distortion leading to inaccurate radius math',
            },
            goodOption: {
                head: '✅ Hexagonal Grid System (Uber H3)',
                body: 'Constant neighbor-centroid distances optimizing dispatch radius calculations',
            },
        },
    },

    // ── Beat 8: High-Converting Interactive Platform CTA ─────────────────────
    {
        id: 'sd-uber-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive spatial indexing scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战、空间计算器与 300+ 真实大厂面试题库！',
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
