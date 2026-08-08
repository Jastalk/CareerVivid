/**
 * designXScript.ts — the "Design X" series.
 *
 * A different shape from the concept episodes. Those teach one idea in two to
 * three minutes; these walk a whole interview, because that is what someone
 * searching "Design Uber" is trying to watch. Six to eight minutes, and the
 * structure is the interview itself:
 *
 *      SCOPE      what we are and are not building, out loud
 *      NUMBERS    one estimate that actually changes a decision
 *      SHAPE      the boxes, named, in the order you would draw them
 *      HARD PART  the one thing this product is actually about
 *      BREAK IT   where the design fails first, and what you say when asked
 *      CTA        back to the course
 *
 * Two rules carried over from the concept episodes, because they are what made
 * those work:
 *
 * 1. **One world, used repeatedly.** Every beat here is a rider, a driver, a
 *    map, a phone. Not a new metaphor per section.
 *
 * 2. **Same scene twice.** The HARD PART beat sets the naive approach and lets
 *    it fail on screen; the beat after it replays the identical moment with the
 *    real design. That contrast is the whole lesson.
 *
 * On the estimate: exactly one number, and it must decide something. "Ten
 * million users" decides nothing and is forgotten. "A hundred thousand location
 * updates a second" is why the write path cannot be a relational table, and the
 * viewer can feel that.
 *
 * The CTA is identical across every episode in the series — one URL, spoken and
 * shown. Per-video landing pages can come later; for now the funnel is one page.
 */

import type { LocalizedText } from './lessonScripts';

export interface DesignXBeat {
    id: string;
    /** SCOPE | NUMBERS | SHAPE | HARD PART | BREAK IT | CTA */
    section: string;
    narration: LocalizedText;
    /** Paper tags pinned over the footage. Two or three, no more. */
    labels?: { text: string; x: number; y: number }[];
    /** Which generated clip backs this beat. */
    clip: string;
}

export interface DesignXEpisode {
    id: string;
    /** Drives the filename and the YouTube title. */
    title: string;
    /** The one question the whole video answers. */
    question: string;
    /** Existing course modules this maps to — used by the landing copy. */
    modules: string[];
    beats: DesignXBeat[];
}

/** Spoken and shown at the end of every episode in the series. */
export const SERIES_CTA: LocalizedText = {
    en: "If you want to actually practise this — draw it, get it marked, and be asked the follow-ups — the full System Design course is on CareerVivid. Link below.",
    zh: '如果你想真的练一遍 —— 自己画、被批改、被追问 —— 完整的系统设计课程在 CareerVivid，链接在下面。',
};

export const CTA_URL = 'careervivid.app/learning/system-design-interview';

// ── Design Uber ─────────────────────────────────────────────────────────────

const DESIGN_UBER: DesignXEpisode = {
    id: 'design-uber',
    title: 'Design Uber',
    question: 'How do you find the nearest driver, out of a million moving cars, in under a second?',
    modules: ['real-time-systems', 'data-at-scale', 'core-building-blocks'],
    beats: [
        {
            id: 'ux-open',
            section: 'SCOPE',
            clip: 'phone-map',
            labels: [{ text: 'RIDER', x: 24, y: 30 }, { text: 'DRIVER', x: 72, y: 32 }],
            narration: {
                en: "You tap a button and a car shows up four minutes later. Between those two things sits the whole interview. So before designing anything, say out loud what you are building: a rider requests, we find nearby drivers, one accepts, both watch each other move on a map. Not payments. Not pricing. Not ratings. Naming what you are leaving out is the first thing a good candidate does, and most people skip it.",
                zh: '你点一个按钮，四分钟后车来了。这两件事之间，就是整场面试。所以在设计任何东西之前，先把要做的说出来：乘客发起请求、我们找到附近的司机、有人接单、双方在地图上看着对方移动。**不做支付。不做定价。不做评分**。把不做的东西点名，是好候选人做的第一件事 —— 而大多数人跳过了它。',
            },
        },
        {
            id: 'ux-numbers',
            section: 'NUMBERS',
            clip: 'counter-tick',
            labels: [{ text: '1M DRIVERS', x: 28, y: 26 }, { text: 'EVERY 4 SECONDS', x: 70, y: 60 }],
            narration: {
                en: "Now one number, and only one that matters. A million drivers on shift, each sending its location every four seconds. That is two hundred and fifty thousand writes a second, forever, whether anyone books a ride or not. Say that number out loud and the design decides itself: this is not a row you update in a relational table. Nothing else in the estimate changes anything. This does.",
                zh: '接下来一个数字 —— 只有一个是真正要紧的。**一百万个在线司机，每四秒上报一次位置**。那就是每秒二十五万次写入，永不停止，不管有没有人叫车。**把这个数字说出口，设计就自己定了**：这不是你在关系表里更新的一行。估算里其他数字都改变不了什么。这个能。',
            },
        },
        {
            id: 'ux-shape',
            section: 'SHAPE',
            clip: 'boxes-assemble',
            labels: [{ text: 'LOCATION SERVICE', x: 30, y: 24 }, { text: 'MATCHING', x: 62, y: 40 }, { text: 'TRIP STATE', x: 78, y: 68 }],
            narration: {
                en: "Three boxes, drawn in the order you would say them. One takes the firehose of driver locations and keeps only the latest one for each — it is a write path, and it never needs history. One answers a single question: who is near this point right now. And one holds the trip itself — requested, accepted, moving, done — which is small, rare, and the only part that must never be wrong. Different jobs, different storage, and separating them is most of the answer.",
                zh: '三个框，按你会说出来的顺序画。**一个接住司机位置的洪流，每个司机只保留最新的一条** —— 它是写路径，永远不需要历史。**一个只回答一个问题：此刻谁在这个点附近**。**还有一个装行程本身** —— 已请求、已接单、行进中、已完成 —— 它很小、很少变，**却是唯一绝对不能出错的部分**。不同的活、不同的存储，把它们分开，答案就有了一大半。',
            },
        },
        {
            id: 'ux-naive',
            section: 'HARD PART',
            clip: 'map-scan',
            labels: [{ text: 'SCAN EVERY DRIVER', x: 50, y: 26 }],
            narration: {
                en: "So: find the nearest driver. The obvious way is to take the rider's position, loop over every driver, compute the distance, and keep the closest. It works perfectly on your laptop with fifty drivers. With a million, you are doing a million distance calculations for every single request, and there are thousands of requests a second. The maths is not hard. There is just far too much of it.",
                zh: '那么：找到最近的司机。**最直觉的做法**是拿乘客的位置，遍历每一个司机，算距离，留下最近的。在你笔记本上、五十个司机的时候，它完美运行。**到一百万个司机时，你在为每一个请求做一百万次距离计算** —— 而每秒有上千个请求。**这个数学一点都不难。只是太多了**。',
            },
        },
        {
            id: 'ux-fix',
            section: 'HARD PART',
            clip: 'grid-cells',
            labels: [{ text: 'GEOHASH', x: 34, y: 24 }, { text: 'NEIGHBOURS ONLY', x: 68, y: 62 }],
            narration: {
                en: "Same rider, same million drivers. This time the map is chopped into small squares, and every driver's location is stored under the square it falls in. The rider is in one square. So you look in that square and the eight around it — nine lookups, a few dozen drivers, done. You did not make the search faster. You made it smaller. That is the trick behind almost every geo system, and it is the answer the interviewer is waiting for.",
                zh: '同一个乘客，同样一百万个司机。**这一次，地图被切成小方格**，每个司机的位置按它落在哪个格子来存。乘客在某一个格子里。**于是你只看那个格子，加上周围八个 —— 九次查找，几十个司机，完事**。你没有让搜索变快。**你让它变小了**。这是几乎所有地理系统背后的那个招，也是面试官在等的那个答案。',
            },
        },
        {
            id: 'ux-break',
            section: 'BREAK IT',
            clip: 'crowd-one-cell',
            labels: [{ text: 'ONE CELL', x: 46, y: 28 }, { text: 'STADIUM', x: 72, y: 58 }],
            narration: {
                en: "And this is where they will push. What happens at a stadium when a match ends? Ten thousand riders and two thousand drivers land in one square, and that square is now a hot partition — one server doing all the work while the rest sit idle. So you say the honest thing: the grid has to be uneven. Dense areas get subdivided further, quiet ones stay coarse. You are not adding a feature. You are admitting the world is not uniform, and that is the answer they are actually scoring.",
                zh: '**接下来他们会往这里追问**。球赛散场的时候会怎样？一万个乘客和两千个司机同时落进同一个格子，**那个格子现在是一个热点分区** —— 一台服务器干所有的活，其余的闲着。所以你就说那句老实话：**网格必须是不均匀的**。密的地方继续细分，静的地方保持粗。你不是在加功能，**你是在承认这个世界本来就不均匀** —— 而这才是他们真正在打分的东西。',
            },
        },
        {
            id: 'ux-cta',
            section: 'CTA',
            clip: 'outro-door',
            narration: SERIES_CTA,
        },
    ],
};

export const DESIGN_X_EPISODES: DesignXEpisode[] = [DESIGN_UBER];

/**
 * The rest of the series, in the order worth making them.
 *
 * Ordered by search volume against production cost, not by difficulty. Each one
 * needs exactly one hard part — if you cannot name it in a sentence, it is not
 * ready to script.
 */
export const SERIES_BACKLOG = [
    { title: 'Design YouTube', hardPart: 'One upload becomes a dozen encodes — how, and who waits for it?' },
    { title: 'Design Instagram', hardPart: 'Fan-out on write or on read, and what a celebrity does to that choice.' },
    { title: 'Design Twitter', hardPart: 'The home timeline: precomputed, or assembled per request?' },
    { title: 'Design WhatsApp', hardPart: 'Delivering to a device that is currently off.' },
    { title: 'Design Airbnb', hardPart: 'Two people booking the last night at the same instant.' },
    { title: 'Design TinyURL', hardPart: 'Generating short ids with no coordination between servers.' },
    { title: 'Design Netflix', hardPart: 'Moving the bytes close to the viewer before they press play.' },
    { title: 'Design OpenAI', hardPart: 'Batching requests onto scarce GPUs without anyone waiting too long.' },
    { title: 'Design Claude Code', hardPart: 'Keeping an agent useful when the context window is the real budget.' },
];
