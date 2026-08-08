/**
 * systemDesignUberSurgeScript.ts
 *
 * Upgraded Script for Today's Video #2:
 *   System Design Interview — How to Design Uber's Dynamic Surge Pricing Engine & Real-Time Heatmaps
 *
 * 6-Section Blueprint:
 *   1. Monolith Intuition Hook: Static fare calculation failing during sudden rainy rush hours.
 *   2. H3 Resolution 8 Spatial Clustering: Aggregating driver supply & rider demand by hexagonal spatial zones.
 *   3. Real-Time Stream Processing: Apache Flink sliding windows calculating supply/demand supply ratios.
 *   4. Consistent Price Quote Engine: Locking 5-minute trip quotes with two-phase commit & distributed caches.
 *   5. Production Failure Modes & Anti-Fraud: Intercepting spoofed GPS locations & driver coordinate manipulation.
 *   6. Tech Benchmarks & Spoken Like & Subscribe CTA + CareerVivid Interactive Platform.
 */

export interface UberSurgeBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
    };
}

export const SYSTEM_DESIGN_UBER_SURGE_BEATS: UberSurgeBeat[] = [
    {
        id: 'sd-ubersurge-intro',
        title: { en: 'Designing Uber Surge Pricing · Real-Time Dynamic Fares', zh: '设计 Uber 动态溢价 · 实时动态调价系统' },
        narration: {
            en: 'When a sudden thunderstorm hits downtown, 50,000 riders open Uber at once while only 500 drivers are available! Static pricing causes instant driver depletion. How does Uber dynamically adjust fares in sub-seconds to balance supply and demand?',
            zh: '当暴风雨突袭市中心，5 万名乘客同时打开 Uber，而附近只有 500 名司机！静态定价会导致司机瞬间被抢光。Uber 到底如何在亚秒内动态调价以平衡供需？',
        },
        visual: {
            badge: 'DYNAMIC PRICING · RUSH HOUR DEMAND',
            cardTitle: 'Balancing Real-Time Driver Supply & Rider Demand',
        },
    },
    {
        id: 'sd-ubersurge-h3-hexagons',
        title: { en: 'H3 Resolution 8 Spatial Clustering & Heatmaps', zh: 'H3 Resolution 8 六边形空间聚类与热力图' },
        narration: {
            en: 'Instead of arbitrary city boundaries, Uber uses H3 Hexagonal Hierarchical Spatial Indexing! At Resolution 8, the globe is partitioned into compact 0.7-square-kilometer hexagons, allowing Uber to aggregate driver pings and ride requests in uniform spatial buckets.',
            zh: 'Uber 放弃了粗暴的城市边界，采用 H3 六边形分层空间索引！在 Res 8 精度下，全球被划分为 0.7 平方公里的均匀六边形，将司机 GPS 坐标与乘车请求完美进行空间分桶！',
        },
        visual: {
            badge: 'GEOSPATIAL INDEXING · UBER H3 RES 8',
            cardTitle: 'Partitioning Cities into Uniform Hexagonal Spatial Buckets',
        },
    },
    {
        id: 'sd-ubersurge-flink-stream',
        title: { en: 'Apache Flink Real-Time Stream Processing', zh: 'Apache Flink 实时流式处理引擎' },
        narration: {
            en: 'Driver location pings stream into Kafka at 1 Million events per second! Apache Flink processes these pings using 10-second sliding windows, continuously computing the exact ratio of unfulfilled ride requests to active drivers in every single hexagon.',
            zh: '司机位置 Ping 以每秒 100 万条事件流入 Kafka！Apache Flink 采用 10 秒滑动窗口实时计算，持续得出每个六边形单元内未满足请求与可用司机的精确供需比！',
        },
        visual: {
            badge: 'STREAM PROCESSING · KAFKA & FLINK',
            cardTitle: 'Sliding Event-Time Windows for Supply-Demand Ratios',
        },
    },
    {
        id: 'sd-ubersurge-price-quote',
        title: { en: '2-Phase Price Commitment & Quote Locking', zh: '两阶段价格锁定与分布式报价' },
        narration: {
            en: 'What stops surge pricing from fluctuating while a rider reviews their fare? The Quote Locking Engine! Uber generates a cryptographically signed fare quote valid for 5 minutes, backed by Redis distributed cache locks.',
            zh: '如何防止乘客看价格时溢价突然剧烈跳动？报价锁定引擎！Uber 生成一份经过签名、有效期为 5 分钟的固定车费报价，并由 Redis 分布式锁严格背书。',
        },
        visual: {
            badge: 'CONSISTENCY & CACHING · QUOTE LOCKING',
            cardTitle: '5-Minute Cryptographically Signed Guaranteed Fare Quotes',
        },
    },
    {
        id: 'sd-ubersurge-anti-fraud',
        title: { en: 'Production Failure Modes · Anti-Spoofing & GPS Manipulation', zh: '生产故障模式 · GPS 伪造与虚假供需防御' },
        narration: {
            en: 'What happens if a group of drivers turn off their phones simultaneously to artificially inflate surge pricing? Uber Fraud Engine uses Map Matching and Anomaly Detection to filter out sudden coordinate manipulation before updating pricing multipliers!',
            zh: '如果有司机群体联合关机企图人为炒高溢价会怎样？Uber 反作弊引擎利用地图匹配与异常检测算法，在更新倍率前瞬间过滤虚假坐标操纵！',
        },
        visual: {
            badge: 'RESILIENCE & SECURITY · ANTI-SPOOFING',
            cardTitle: 'Detecting Artificial Supply Shortages & GPS Manipulation',
        },
    },
    {
        id: 'sd-ubersurge-benchmark',
        title: { en: 'Tech Benchmark · Uber H3 Hexagons vs Google S2 Quadtrees', zh: '架构对比 · Uber H3 六边形 vs Google S2 4叉树' },
        narration: {
            en: 'How does Uber H3 compare to Google S2 Quadtrees? While S2 Quadtrees distort shapes near earth\'s poles, H3 Hexagons guarantee equal distance between all neighboring centroids, drastically simplifying spatial smoothing algorithms!',
            zh: 'Uber H3 与 Google S2 有何区别？S2 四叉树在两极形状失真，而 H3 六边形保证所有相邻中心点距离完全相等，极大简化了空间平滑算法！',
        },
        visual: {
            badge: 'TECH BENCHMARK · H3 VS S2 QUADTREE',
            cardTitle: 'Comparing Spatial Distortion & Centroid Distance Properties',
        },
    },
    {
        id: 'sd-ubersurge-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive spatial indexing scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战与 300+ 真实大厂面试题库！',
        },
        visual: {
            badge: 'INTERACTIVE PRACTICE · CAREERVIVID',
            cardTitle: 'Practice Real System Design Scenarios',
        },
    },
];
