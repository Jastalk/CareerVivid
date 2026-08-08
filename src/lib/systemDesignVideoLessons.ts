/**
 * src/lib/systemDesignVideoLessons.ts
 *
 * Dedicated video registry for System Design Interview course (`learning/system-design-interview`).
 * Keeps CCAF videos (`learning/ccaf-quest`) cleanly separated.
 *
 * Video files are served under `public/system-design-lessons/<src>`.
 */

import type { LocalizedText } from './ccafMissions';

export interface SystemDesignVideo {
    id: string;
    chapterOrder: number;
    /** Path under public/system-design-lessons/. */
    src: string;
    /** Optional poster still shown before playback starts. */
    poster?: string;
    title: LocalizedText;
}

export const SYSTEM_DESIGN_VIDEOS: SystemDesignVideo[] = [
    {
        id: 'sd-apis-and-data-models',
        chapterOrder: 3,
        src: 'system-design-apis-and-data-models-omni.mp4',
        title: {
            en: 'System Design · Core Design: APIs & Data Models',
            zh: '系统设计 · 核心设计：APIs 与数据模型 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-caching-and-rate-limiting',
        chapterOrder: 5,
        src: 'system-design-caching-and-rate-limiting-omni.mp4',
        title: {
            en: 'System Design · Caching & Rate Limiting (Single-Flight & Token Bucket)',
            zh: '系统设计 · 缓存与限流：Single-Flight 与令牌桶算法 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-uber',
        chapterOrder: 6,
        src: 'design-uber.mp4',
        title: {
            en: 'System Design · How to Design Uber (Geospatial Matching & H3 Grid)',
            zh: '系统设计 · 如何设计 Uber：实时地理位置匹配与 H3 蜂巢网格 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-youtube',
        chapterOrder: 7,
        src: 'design-youtube.mp4',
        title: {
            en: 'System Design · How to Design YouTube (Video Transcoding & HLS CDN)',
            zh: '系统设计 · 如何设计 YouTube：视频转码切片与全球 CDN 边缘节点 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-instagram',
        chapterOrder: 8,
        src: 'design-instagram.mp4',
        title: {
            en: 'System Design · How to Design Instagram (Hybrid Fan-Out & Feed Caches)',
            zh: '系统设计 · 如何设计 Instagram：明星大喇叭与分片动态缓存 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-airbnb',
        chapterOrder: 9,
        src: 'design-airbnb.mp4',
        title: {
            en: 'System Design · How to Design Airbnb (Booking Engine & Redlock Mutex)',
            zh: '系统设计 · 如何设计 Airbnb：预订引擎与前台主钥匙防重订锁 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-openai',
        chapterOrder: 10,
        src: 'design-openai.mp4',
        title: {
            en: 'System Design · How to Design OpenAI / ChatGPT (SSE Streaming & KV Cache)',
            zh: '系统设计 · 如何设计 OpenAI / ChatGPT：逐字流式打字与 KV 显存缓存 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-claude-code',
        chapterOrder: 11,
        src: 'design-claude-code.mp4',
        title: {
            en: 'System Design · How to Design Claude Code (Agentic AI & Subagents)',
            zh: '系统设计 · 如何设计 Claude Code：多 Agent 分工协作与智能上下文压缩 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-tiktok',
        chapterOrder: 12,
        src: 'design-tiktok.mp4',
        title: {
            en: 'System Design · How to Design TikTok (Vector Recommendation & Sharded Counters)',
            zh: '系统设计 · 如何设计 TikTok：双阶段向量推荐引擎与高并发分片点赞计数器 (Gemini Omni 视频)',
        },
    },
    {
        id: 'sd-design-whatsapp',
        chapterOrder: 13,
        src: 'design-whatsapp.mp4',
        title: {
            en: 'System Design · How to Design WhatsApp (Real-Time WebSockets & Signal E2EE)',
            zh: '系统设计 · 如何设计 WhatsApp / 微信：WebSocket 长连接池与端到端加密 (Gemini Omni / Veo 3.1 Lite 视频)',
        },
    },
];

export const systemDesignVideoForChapter = (chapterOrder: number): SystemDesignVideo | undefined =>
    SYSTEM_DESIGN_VIDEOS.find(video => video.chapterOrder === chapterOrder);

/** Public URL for a System Design course video. */
export const systemDesignVideoSrc = (video: SystemDesignVideo): string =>
    `/system-design-lessons/${video.src}`;
