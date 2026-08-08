/**
 * systemDesignYouTubeLiveScript.ts
 *
 * Upgraded Script for Today's Video #1:
 *   System Design Interview — How to Design YouTube Live Streaming at Scale (Low-Latency HLS & CDN Origin Shielding)
 *
 * 6-Section Blueprint:
 *   1. Viral Hook (0-15s): Millions watching a live global broadcast with sub-second latency.
 *   2. Ingestion Gateway: RTMP & SRT live ingest clusters vs transcode fan-out.
 *   3. Low-Latency Protocol Deep-Dive: LL-HLS 200ms partial chunking & WebRTC mesh.
 *   4. CDN Origin Shielding: Hierarchical edge caching preventing origin Thundering Herd.
 *   5. Real-Time Chat Infrastructure: WebSocket Gateway fleets & pub/sub message throttling.
 *   6. Spoken Like & Subscribe CTA + CareerVivid Interactive Platform.
 */

export interface YouTubeLiveBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
    };
}

export const SYSTEM_DESIGN_YOUTUBE_LIVE_BEATS: YouTubeLiveBeat[] = [
    {
        id: 'sd-ytlive-intro',
        title: { en: 'Designing YouTube Live · Low-Latency Global Streaming', zh: '设计 YouTube 直播 · 超低延迟全球流媒体' },
        narration: {
            en: 'When 5 Million sports fans tune into a live stream at the exact same second, standard video-on-demand chunking breaks instantly! How does YouTube deliver sub-second live video globally without blowing up origin servers?',
            zh: '当 500 万体育迷在同一秒涌入直播间时，传统的点播分片架构瞬间崩塌！YouTube 到底如何在不烧毁源站的情况下实现全球亚秒级直播？',
        },
        visual: {
            badge: 'LIVE STREAMING · THUNDERING HERD',
            cardTitle: 'Scaling Real-Time Live Stream Ingestion & Broadcast',
        },
    },
    {
        id: 'sd-ytlive-ingest-gateway',
        title: { en: 'RTMP & SRT Live Ingest Gateways', zh: 'RTMP 与 SRT 高吞吐推流网关' },
        narration: {
            en: 'Broadcasters push raw video streams using RTMP or SRT protocols to localized Edge Ingest Gateways. These gateways immediately segment incoming frames into 200-millisecond chunks and push them directly to real-time transcoding workers!',
            zh: '主播使用 RTMP 或 SRT 协议将原始视频推送到就近的边缘推流网关。网关立即将接收到的视频帧切片为 200 毫秒的微型 Chunk，并直接推向实时转码集群！',
        },
        visual: {
            badge: 'INGEST GATEWAYS · RTMP / SRT PROTOCOLS',
            cardTitle: 'Edge Ingestion & Real-Time Transcoding Matrix',
        },
    },
    {
        id: 'sd-ytlive-llhls-webrtc',
        title: { en: 'Low-Latency HLS (LL-HLS) vs WebRTC Mesh', zh: '超低延迟 HLS (LL-HLS) 与 WebRTC 传输' },
        narration: {
            en: 'Standard HLS introduces 15-second delays! YouTube Live leverages Low-Latency HLS with partial media segment generation, allowing players to fetch video sub-chunks over HTTP/2 push before the full 2-second segment completes!',
            zh: '传统 HLS 有 15 秒高延迟！YouTube Live 采用 Low-Latency HLS 微切片生成技术，允许播放器在完整的 2 秒 Segment 还没切完前，通过 HTTP/2 Push 直接拉取微片！',
        },
        visual: {
            badge: 'LOW-LATENCY PROTOCOLS · LL-HLS',
            cardTitle: '200ms Partial Chunk Generation & HTTP/2 Push',
        },
    },
    {
        id: 'sd-ytlive-cdn-shield',
        title: { en: 'CDN Origin Shielding & Hierarchical Caching', zh: 'CDN 源站屏障与多级分层缓存' },
        narration: {
            en: 'When 1 Million viewers request the exact same 200ms video chunk at once, origin servers face catastrophic Thundering Herd failures. CDN Origin Shielding consolidates millions of edge requests into single origin fetches!',
            zh: '当 100 万观众同时请求同一个 200ms 视频切片时，源站面临灾难性的惊群效应 (Thundering Herd)！CDN 源站屏障 (Origin Shielding) 将上百万边缘请求聚合成单次源站拉取！',
        },
        visual: {
            badge: 'CDN ORIGIN SHIELDING · HIERARCHICAL CACHE',
            cardTitle: 'Consolidating Millions of Edge Requests into 1 Fetch',
        },
    },
    {
        id: 'sd-ytlive-live-chat',
        title: { en: 'Real-Time Live Chat Fan-Out (Redis Pub/Sub & WebSockets)', zh: '实时弹幕消息扇出 (Redis Pub/Sub 与 WebSocket 网关)' },
        narration: {
            en: 'Handling 50,000 chat messages per second requires decoupling! WebSocket Gateway Fleets subscribe to Redis Pub/Sub channels, applying sliding window rate limiters so client screens render clean, non-lagging chat streams.',
            zh: '每秒处理 5 万条弹幕需要解耦！WebSocket 网关集群订阅 Redis Pub/Sub 频道，配合滑动窗口限流器，确保客户端屏幕渲染流畅、零卡顿的弹幕流！',
        },
        visual: {
            badge: 'REAL-TIME CHAT · WEBSOCKET FAN-OUT',
            cardTitle: 'Decoupled Message Queues & Client Render Throttling',
        },
    },
    {
        id: 'sd-ytlive-failure-modes',
        title: { en: 'Production Failure Modes · Packet Loss & Network Jitter', zh: '生产故障模式 · 丢包与网络抖动' },
        narration: {
            en: 'What happens during cellular network drops? Dynamic Adaptive Bitrate Fallback! The video player instantly downshifts to lower resolution sub-chunks without breaking stream sync or triggering buffer spinners.',
            zh: '当蜂窝网络发生丢包时会发生什么？动态自适应码率 (ABR) 降级！视频播放器瞬间无缝下探至低码率微片，绝不中断画面同步或弹出缓冲转圈！',
        },
        visual: {
            badge: 'RESILIENCE & FAILOVER · ABR DEGRADATION',
            cardTitle: 'Seamless Bitrate Fallback Without Buffer Spinners',
        },
    },
    {
        id: 'sd-ytlive-benchmark',
        title: { en: 'Tech Benchmark · YouTube LL-HLS vs Twitch WebRTC', zh: '架构对比 · YouTube LL-HLS vs Twitch WebRTC' },
        narration: {
            en: 'How does YouTube Live compare to Twitch? While Twitch uses WebRTC for interactive sub-second streams at higher infrastructure cost, YouTube LL-HLS achieves sub-2-second latency at massive global scale with standard HTTP CDN caching!',
            zh: 'YouTube Live 与 Twitch 有何不同？Twitch 采用 WebRTC 实现更高成本的亚秒级互动，而 YouTube LL-HLS 以标准 HTTP CDN 缓存架构实现了全球大并发下的 2 秒内极低延迟！',
        },
        visual: {
            badge: 'TECH BENCHMARK · LL-HLS VS WEBRTC',
            cardTitle: 'Comparing Global Scalability vs Transport Overhead',
        },
    },
    {
        id: 'sd-ytlive-call-to-action',
        title: { en: 'Master System Design · CareerVivid Interactive Labs', zh: '掌握系统设计 · CareerVivid 交互实战' },
        narration: {
            en: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive streaming scenarios and 300+ real tech company interview questions today on CareerVivid!',
            zh: '如果你喜欢这个系统设计讲解，请务必点赞和订阅！立即访问 CareerVivid 开启交互式实战与 300+ 真实大厂面试题库！',
        },
        visual: {
            badge: 'INTERACTIVE PRACTICE · CAREERVIVID',
            cardTitle: 'Practice Real System Design Scenarios',
        },
    },
];
