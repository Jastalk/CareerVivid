/**
 * systemDesignYouTubeScript.ts
 *
 * Upgraded High-Knowledge, Ultra-Engaging Script for YouTube:
 *   System Design Interview — How to Design YouTube (Video Transcoding & Global CDN)
 *
 * Hello Interview & Vox Documentary Style Blueprint:
 *   1. Viral Hook (0-15s): Streaming 1 Billion hours of video a day without crashing the internet.
 *   2. Monolith Intuition: Monolithic MP4 downloads vs 4K multi-device video delivery.
 *   3. HLS & DASH Chunking Engine: Slicing 4K video into 2-second .ts segments.
 *   4. Multi-Resolution Transcoding Matrix: Parallel encoding into AV1, VP9, and H.264 variants.
 *   5. Adaptive Bitrate Streaming (ABR): Microsecond quality switching during mobile network drops.
 *   6. Global CDN Edge Tiering: Hot edge nodes vs Cold Blob archival storage.
 *   7. Failure Modes & Edge Cases: Origin Shielding preventing thundering herd origin crashes.
 *   8. Tech Benchmark: YouTube Per-Title Encoding vs Netflix Per-Shot Chunking.
 *   9. High-Converting Interactive Platform CTA: CareerVivid System Design Labs.
 */

export interface YouTubeBeat {
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

export const SYSTEM_DESIGN_YOUTUBE_BEATS: YouTubeBeat[] = [
    // ── Beat 1: The Viral Hook & Monolith Intuition ───────────────────────────
    {
        id: 'sd-youtube-intro',
        title: { en: 'Designing YouTube · Streaming 1B Hours Daily without Crashes', zh: '设计 YouTube · 每日播放 10 亿小时且绝不崩溃' },
        narration: {
            en: 'How does YouTube stream 1 billion hours of video every day to 2 billion devices without breaking the global internet? If YouTube served raw, monolithic 50-gigabyte video files, your phone would freeze for 10 minutes before playing a single frame!',
            zh: 'YouTube 到底如何每天向 20 亿台设备流畅播放 10 亿小时视频而不造成网络瘫痪？如果 YouTube 直接传输 50GB 原始未压缩视频文件，你的手机在播放第一帧画面前就会卡死 10 分钟！',
        },
        visual: {
            badge: 'VIDEO ARCHITECTURE · ULTRA HIGH RETENTION',
            cardTitle: 'Serving 1 Billion Video Hours Daily',
            badOption: {
                head: '❌ Monolithic MP4 File Delivery',
                body: '50GB raw video download causing 10-minute loading spinner & browser freeze',
            },
            goodOption: {
                head: '✅ HLS/DASH 2-Second Segment Chunking',
                body: 'Sub-second playback startup + adaptive bitrate quality switching',
            },
        },
    },

    // ── Beat 2: HLS & DASH Chunking Engine ───────────────────────────────────
    {
        id: 'sd-youtube-transcoding-hls',
        title: { en: 'HLS & DASH Chunking Engine (Slicing 4K to 2s Segments)', zh: 'HLS 与 DASH 切片引擎 (将 4K 视频切为 2 秒分片)' },
        narration: {
            en: 'The secret is HLS and DASH Segment Chunking! When a creator uploads a video, YouTube\'s ingestion pipeline immediately slices the video file into small, independent two-second media chunks, indexed by an M3U8 manifest file!',
            zh: '秘密就是 HLS 与 DASH 媒体切片！当创作者上传视频时，YouTube 入库流水线会立即将其拆解为独立且连续的 2 秒媒体切片 (.ts)，并生成 M3U8 索引清单文件！',
        },
        visual: {
            badge: 'SEGMENTATION PIPELINE · HLS CHUNKING',
            cardTitle: '2-Second Video Chunking & M3U8 Manifest',
            badOption: {
                head: '❌ Continuous Un-segmented Video Stream',
                body: 'Packet loss forces full video re-download from frame zero',
            },
            goodOption: {
                head: '✅ 2-Second Independent .ts Media Chunks',
                body: 'Instant seekability & micro-resume after mobile packet loss',
            },
        },
    },

    // ── Beat 3: Multi-Resolution Transcoding Matrix ─────────────────────────
    {
        id: 'sd-youtube-adaptive-bitrate',
        title: { en: 'Multi-Resolution Transcoding Matrix (AV1 / VP9 / H.264)', zh: '多分辨率转码矩阵 (AV1 / VP9 / H.264 编码转码)' },
        narration: {
            en: 'Different devices need different formats! A background Async Worker Farm encodes every video into dozens of resolution and codec combinations—from 4K AV1 for smart TVs down to 144p H.264 for low-end mobile phones.',
            zh: '不同设备需要不同的视频格式！异步工作节点矩阵将每条视频转码为数十种分辨率与编码组合——从适用于 4K 电视的 AV1，一直到适合低配手机的 144p H.264。',
        },
        visual: {
            badge: 'ENCODING MATRIX · PARALLEL WORKER FARM',
            cardTitle: 'Multi-Resolution Transcoding Engine',
            badOption: {
                head: '❌ Single Codec Monolithic Encoding',
                body: 'Incompatibility with old smart TVs & excessive mobile data billing',
            },
            goodOption: {
                head: '✅ Multi-Codec Matrix (AV1, VP9, H.264)',
                body: 'Optimal visual quality per device type with 50% bandwidth savings',
            },
        },
    },

    // ── Beat 4: Adaptive Bitrate Streaming (ABR) ──────────────────────────────
    {
        id: 'sd-youtube-cdn-edges',
        title: { en: 'Adaptive Bitrate Streaming (ABR) Mobile Switching', zh: '自适应码率流 (ABR) 移动网络无缝切换' },
        narration: {
            en: 'What happens when your phone enters a elevator? Signal drop! YouTube\'s player uses Adaptive Bitrate Streaming, dynamically switching to a lower resolution 2-second chunk without ever pausing playback!',
            zh: '当手机走进电梯信号骤降时会发生什么？YouTube 播放器采用“自适应码率 (ABR)”技术，在零卡顿的前提下自动无缝切换到低分辨率的 2 秒切片！',
        },
        visual: {
            badge: 'CLIENT PLAYBACK · ADAPTIVE BITRATE',
            cardTitle: 'Seamless Resolution Switching under Network Jitter',
            badOption: {
                head: '❌ Hardcoded Static Bitrate Playback',
                body: 'Immediate playback freeze & buffer spinner on network drop',
            },
            goodOption: {
                head: '✅ Dynamic ABR Segment Fetching',
                body: 'Smooth visual degradation from 1080p to 480p without playback pause',
            },
        },
    },

    // ── Beat 5: Global CDN Edge Tiering (Hot Edges vs Cold Archival) ─────────
    {
        id: 'sd-youtube-cold-storage',
        title: { en: 'Global CDN Edge Tiering (Hot Edge Cache vs Cold Storage)', zh: '全球 CDN 边缘分层 (热门边缘节点 vs 冷归档存储)' },
        narration: {
            en: 'Storing petabytes of video at edge nodes is impossible. YouTube uses Tiered CDN Storage! Viral videos live at local edge caches close to users, while older videos are fetched on-demand from cold Blob storage vaults.',
            zh: '在边缘节点存储 PB 级视频成本极高。YouTube 采用“分层 CDN 架构”：热门爆款视频常驻在离用户最近的边缘 Cache，而老旧视频则在播放时按需从冷数据中心拉取！',
        },
        visual: {
            badge: 'STORAGE ARCHITECTURE · TIERED CDN',
            cardTitle: 'Hot Edge Caching vs Cold Storage Tiering',
            badOption: {
                head: '❌ Un-tiered Edge Mirroring',
                body: 'High CDN infrastructure cost storing unwatched 10-year-old videos',
            },
            goodOption: {
                head: '✅ Edge Cache (Hot) + Blob Vault (Cold)',
                body: '95% cache hit ratio for viral content + low-cost archival storage',
            },
        },
    },

    // ── Beat 6: Failure Modes — Origin Shielding & Thundering Herd ────────────
    {
        id: 'sd-youtube-failure-modes',
        title: { en: 'Failure Modes · Origin Shield & Cache Thundering Herd', zh: '故障模式 · Origin Shield 源站屏蔽与防雪崩' },
        narration: {
            en: 'What happens when MrBeast drops a new video and 10 million users request it simultaneously? Origin Shielding! An intermediate cache layer aggregates requests across edge nodes, preventing millions of hits from overwhelming storage clusters.',
            zh: '当大咖发布新视频、1000 万名用户同时点开时会发生什么？源站屏蔽 (Origin Shield)！中间缓存层汇总来自全球边缘节点的请求，保护核心存储集群免遭雪崩冲击！',
        },
        visual: {
            badge: 'RESILIENCE & PROTECTION · ORIGIN SHIELD',
            cardTitle: 'Protecting Storage Origins from Viral Traffic Spikes',
            badOption: {
                head: '❌ Direct Origin Invalidation Pass-Through',
                body: 'Storage cluster collapse under simultaneous thundering herd requests',
            },
            goodOption: {
                head: '✅ Origin Shield Request Collapsing',
                body: '1 consolidated origin fetch serving 10M concurrent edge subscribers',
            },
        },
    },

    // ── Beat 7: Real-World Tech Benchmarks (YouTube vs Netflix) ───────────────
    {
        id: 'sd-youtube-benchmark',
        title: { en: 'Tech Benchmarks · YouTube Per-Title vs Netflix Per-Shot', zh: '架构对比 · YouTube 按标题转码 vs Netflix 按镜头转码' },
        narration: {
            en: 'How does YouTube\'s encoding compare to Netflix? Netflix encodes movies using Per-Shot Chunking for maximum cinematic quality. YouTube uses Per-Title Dynamic Encoding, optimizing for fast upload processing across millions of creators!',
            zh: 'YouTube 的编码架构与 Netflix 有何不同？Netflix 采用“按镜头转码 (Per-Shot)”以追求极致电影级画质；而 YouTube 采用“按标题动态转码”，为海量创作者实现极速上传与转码！',
        },
        visual: {
            badge: 'TECH BENCHMARK · YOUTUBE VS NETFLIX',
            cardTitle: 'Video Processing Architecture Comparison',
            badOption: {
                head: '❌ Heavy Per-Shot Micro-segmentation (Netflix)',
                body: 'Hours of encoding overhead unsuitable for user-generated fast uploads',
            },
            goodOption: {
                head: '✅ Dynamic Per-Title Parallel Encoding (YouTube)',
                body: 'Sub-minute upload-to-play pipeline across millions of daily creators',
            },
        },
    },

    // ── Beat 8: High-Converting Interactive Platform CTA ─────────────────────
    {
        id: 'sd-youtube-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive video streaming scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战、带宽计算器与 300+ 真实大厂面试题库！',
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
