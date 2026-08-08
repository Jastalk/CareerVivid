/**
 * systemDesignNetflixScript.ts
 *
 * Today's Video #2:
 *   System Design Interview — How to Design Netflix (Adaptive Bitrate ABR & Open Connect Edge CDN)
 *
 * 6-Section Blueprint:
 *   1. Monolith Intuition Hook: Central origin server choke & backbone internet freeze.
 *   2. Parallel Video Transcoding: 2-second video chunk slicing & multi-codec workers.
 *   3. Adaptive Bitrate (ABR) Streaming: HLS/DASH manifest quality switching.
 *   4. Open Connect Edge CDN: ISP hardware pre-positioning (-95% origin traffic).
 *   5. Production Resilience: Cache request coalescing & BGP failover routing.
 *   6. Tech Benchmarks & Spoken Like & Subscribe CTA + CareerVivid Interactive Platform.
 */

export interface NetflixBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
    };
}

export const SYSTEM_DESIGN_NETFLIX_BEATS: NetflixBeat[] = [
    {
        id: 'sd-netflix-intro',
        title: { en: 'Designing Netflix · Adaptive Bitrate & Edge CDN', zh: '设计 Netflix · 自适应码率与边缘 CDN' },
        narration: {
            en: 'When 250 Million global subscribers stream 4K movies simultaneously, sending all video traffic back to central cloud servers would freeze global internet backbones! How does Netflix stream 4K video instantly with zero buffering across millions of devices?',
            zh: '当 2.5 亿全球订阅用户同时在线观看 4K 电影时，若将所有视频流量拉回中央云端服务器，必然冻结全球互联网骨干网！Netflix 到底如何在海量设备上实现零卡顿亚秒级 4K 视频播放？',
        },
        visual: {
            badge: 'GLOBAL STREAMING · ZERO BUFFERING',
            cardTitle: 'Scaling 4K Adaptive Bitrate Video Infrastructure',
        },
    },
    {
        id: 'sd-netflix-transcoding',
        title: { en: 'Parallel Video Chunk Transcoding Pipeline', zh: '并行视频切片转码流水线' },
        narration: {
            en: 'When a movie is uploaded, Netflix breaks the file into thousands of 2-second video chunks! A parallel AWS worker fleet transcodes every chunk into hundreds of codecs, resolutions, and bitrates—from 240p mobile up to 4K Dolby Vision.',
            zh: '每当上传一部新影片，Netflix 都会将其切割为数万个 2 秒视频切片！并行 AWS 切片集群将每个切片独立转码为数百种编码格式、分辨率与码率——从 240p 移动端覆盖至 4K 杜比视界。',
        },
        visual: {
            badge: 'TRANSCODING PIPELINE · PARALLEL WORKERS',
            cardTitle: '2-Second Chunk Slicing & Multi-Codec Encoding',
        },
    },
    {
        id: 'sd-netflix-abr',
        title: { en: 'Adaptive Bitrate (ABR) Dynamic Streaming Protocols', zh: '自适应码率 (ABR) 动态流媒体协议' },
        narration: {
            en: 'How does Netflix prevent buffering when your Wi-Fi fluctuates? Dynamic Adaptive Bitrate Streaming! The client video player requests HLS or DASH manifests, continuously measuring network throughput to switch video quality chunks seamlessly on the fly.',
            zh: '网络波动时 Netflix 如何防止卡顿？动态自适应码率 (ABR) 流媒体！客户端播放器解析 HLS 或 DASH 清单文件，实时测算网络吞吐量，在毫秒间无缝切换视频切片画质。',
        },
        visual: {
            badge: 'DYNAMIC STREAMING · ABR HLS / DASH',
            cardTitle: 'Continuous Throughput Measurement & Seamless Bitrate Switching',
        },
    },
    {
        id: 'sd-netflix-open-connect',
        title: { en: 'Netflix Open Connect Edge CDN Appliance Architecture', zh: 'Netflix Open Connect 边缘 CDN 硬件架构' },
        narration: {
            en: '95% of Netflix traffic bypasses cloud origins! Netflix deploys custom Open Connect Edge CDN hardware appliances directly inside Internet Service Provider networks worldwide. Popular video chunks are pre-positioned overnight so viewers stream locally from their ISP!',
            zh: 'Netflix 95% 的流量完全绕过云端源站！Netflix 将定制的 Open Connect 边缘 CDN 硬件直接部署在全球 ISP 运营商网络内部。热门视频切片在夜间预先推送分发，用户直接从本地 ISP 零延迟播放！',
        },
        visual: {
            badge: 'OPEN CONNECT CDN · ISP HARDWARE EDGE',
            cardTitle: 'Custom Hardware Appliances Embedded Inside Local ISPs',
        },
    },
    {
        id: 'sd-netflix-stampede-resilience',
        title: { en: 'Edge Cache Stampedes & BGP Dynamic Failover', zh: '边缘缓存防击穿与 BGP 动态故障转移' },
        narration: {
            en: 'What happens when a new hit show drops and millions request the same chunk simultaneously? Request coalescing at edge caches prevents origin stampedes, while BGP route health checks automatically redirect viewer traffic to adjacent CDN nodes during fiber outages!',
            zh: '爆款剧集上线、数千万人同时请求相同切片时会发生什么？边缘缓存请求合并 (Coalescing) 彻底消除源站击穿；在光缆中断时，BGP 路由健康检查自动将流量无缝重定向至邻近 CDN 节点！',
        },
        visual: {
            badge: 'RESILIENCE & FAILOVER · REQUEST COALESCING',
            cardTitle: 'Stampede Prevention & Automatic BGP ISP Rerouting',
        },
    },
    {
        id: 'sd-netflix-benchmark',
        title: { en: 'Tech Benchmark · Netflix Open Connect CDN vs Cloudflare', zh: '架构对比 · Netflix Open Connect vs 通用云 CDN' },
        narration: {
            en: 'How does Netflix compare to generic cloud CDNs? While general-purpose CDNs handle small API payloads, Netflix\'s custom Open Connect appliances deliver petabytes of throughput with zero transit cost by caching video directly within ISP backbones!',
            zh: 'Netflix 与通用云端 CDN 有何不同？通用 CDN 主要处理小型 API 负载，而 Netflix 的定制 Open Connect 硬件通过直接内嵌 ISP 骨干网，以零骨干网传输成本交付 PB 级视频吞吐！',
        },
        visual: {
            badge: 'TECH BENCHMARK · CUSTOM ISP CDN VS CLOUD',
            cardTitle: 'Petabyte Delivery at Zero Transit Cost',
        },
    },
    {
        id: 'sd-netflix-call-to-action',
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
