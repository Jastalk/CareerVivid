/**
 * systemDesignCacheRateScript.ts
 *
 * Beginners-First & Humorous Documentary Script for:
 *   System Design Interview — Caching & Rate Limiting
 *
 * Pedagogical Strategy (Super Beginner Friendly + Everyday Humor):
 *   1. Midnight Sneakerhead Stampede (Relatable panic when 100,000 people rush a single store clerk).
 *   2. Cache Stampede Disaster (100,000 people asking the manager the same question at once).
 *   3. Single-Flight Hero (Picking ONE guy to go ask while everyone else drinks boba tea).
 *   4. Nightclub Bouncer (Token Bucket bouncer slapping sneaky bots with HTTP 429).
 *   5. Sticky Note Eraser (LRU eviction & crossing out old prices instantly).
 *   6. Fun Call to Action (Interactive system design drills on CareerVivid).
 */

export interface CacheRateBeat {
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

export const SYSTEM_DESIGN_CACHE_RATE_BEATS: CacheRateBeat[] = [
    // ── Beat 1: The Midnight Sneakerhead Rush ─────────────────────────────
    {
        id: 'sd-cache-intro',
        title: { en: 'The Midnight Sneaker Rush', zh: '午夜抢鞋狂欢 · 零点 504 崩溃' },
        narration: {
            en: 'Imagine one hundred thousand sneakerheads waiting outside a store at midnight. The clock hits 12:00, the doors open, and everyone rushes in at once to scream at the single cashier: "Are the shoes in stock?!" The cashier faints, and your app throws a 504 Gateway Timeout error! How do we stop this madness?',
            zh: '想象一下，十万名鞋迷在零点排在鞋店门口。时钟敲响 12:00，大门冲开，所有人瞬间涌入朝唯一的收银员大喊：“球鞋有货吗？！”收银员当场晕倒，你的 App 直接弹出 504 崩溃报错！我们该如何阻止这种疯狂？',
        },
        visual: {
            badge: 'FUN BEGINNER SCENARIO · MIDNIGHT SNEAKER RUSH',
            cardTitle: '100,000 Shoppers Trample Single Server',
            badOption: {
                head: '❌ Fainting Single Cashier',
                body: '100,000 shoppers scream at DB ➔ Server 504 Timeout crash',
            },
            goodOption: {
                head: '✅ Chalkboard Cache & VIP Bouncer',
                body: 'Sub-millisecond instant answers + smooth traffic control',
            },
        },
    },

    // ── Beat 2: The Cache Stampede (100,000 People Screaming at the Manager) ─
    {
        id: 'sd-cache-stampede-story',
        title: { en: 'The Cache Stampede Disaster', zh: '缓存雪崩 · 十万人问同一个问题' },
        narration: {
            en: 'Why did the store collapse? Because nobody checked the chalkboard outside—the Cache! The price on the chalkboard expired at midnight. So instead of reading the board, all one hundred thousand people ran straight into the back room to yell at the manager, your Database! This is the infamous Cache Stampede.',
            zh: '店里为什么崩了？因为没人看门外写着价格的黑板——也就是“缓存 (Cache)”！黑板上的价格正好在零点擦掉了。结果十万人全都不看黑板，一股脑冲进后厨去找总经理——你的数据库！这就是传说中的“缓存雪崩”。',
        },
        visual: {
            badge: 'EVERYDAY ANALOGY 1 · THE CACHE STAMPEDE',
            cardTitle: 'Empty Chalkboard Causes Mass Database Panic',
            badOption: {
                head: '❌ Blank Chalkboard (Cache Miss)',
                body: '100,000 people storm back room ➔ Database explodes',
            },
            goodOption: {
                head: '✅ Pick One Representative',
                body: '1 person asks manager ➔ 99,999 people wait outside',
            },
        },
    },

    // ── Beat 3: Single-Flight (Pick ONE Guy to Ask while drinking Boba) ───
    {
        id: 'sd-cache-stampede-solution',
        title: { en: 'Single-Flight Lock (Pick One Rep)', zh: 'Single-Flight 锁 · 派个代表去问' },
        narration: {
            en: 'How do smart engineers fix this chaos? Single-Flight Request Coalescing! The crowd outside agrees: "Hey! Let us pick ONE guy to go into the back room and ask the manager." Everyone else waits outside enjoying boba tea. The manager answers ONCE, and the representative yells the price out to all one hundred thousand people!',
            zh: '聪明的工程师如何解决？使用“Single-Flight 请求合并”！门外的人群商量好：“大家别喊了！咱们派【一个代表】进后厨问经理，其他人留在门外喝奶茶！”经理只回答了 1 次，代表出来大声向十万人喊出答案！问题解决！',
        },
        visual: {
            badge: 'EVERYDAY ANALOGY 2 · SINGLE-FLIGHT LOCK',
            cardTitle: 'Coalescing 100,000 Queries into 1 Single Query',
            badOption: {
                head: '❌ 100,000 People Storming Manager',
                body: 'Redundant SQL joins executed repeatedly for identical keys',
            },
            goodOption: {
                head: '✅ Single Representative Asks DB',
                body: '1 DB query ➔ In-memory broadcast to 99,999 waiting callers',
            },
        },
    },

    // ── Beat 4: Token Bucket (The VIP Nightclub Bouncer) ───────────────────
    {
        id: 'sd-rate-limiting-token-bucket',
        title: { en: 'Token Bucket Rate Limiter', zh: '令牌桶算法 · 夜店 VIP 严苛保安' },
        narration: {
            en: 'Now, what if a sneaky robot tries to enter the store ten thousand times a second to hoard all the shoes? Meet the Token Bucket Rate Limiter—a beefy nightclub bouncer at your door. He hands out ten tokens a second. If a sneaky bot arrives with no token, the bouncer slaps them with an HTTP 429 error and tosses them in the trash!',
            zh: '但是，如果有一个狡猾的机器人试图每秒进店一万次把鞋全抢光怎么办？这就轮到“令牌桶限流器”——门口站着的这位肌肉爆棚的夜店保安！他每秒发放 10 张入场券。如果机器人没拿到券就想硬闯，保安直接甩它一张 HTTP 429 罚单并踢进垃圾桶！',
        },
        visual: {
            badge: 'EVERYDAY ANALOGY 3 · THE NIGHTCLUB BOUNCER',
            cardTitle: 'Token Bucket Bouncer Slaps Bots with HTTP 429',
            badOption: {
                head: '❌ Unthrottled Doorway',
                body: 'Sneaky bots flood store and steal all resources',
            },
            goodOption: {
                head: '✅ Token Bucket VIP Bouncer',
                body: '10 tokens/sec refill rate + instant HTTP 429 bot rejection',
            },
        },
    },

    // ── Beat 5: LRU Eviction & Clean Desk Principle ───────────────────────
    {
        id: 'sd-cache-eviction-lru',
        title: { en: 'LRU Eviction & Clean Desk', zh: 'LRU 淘汰与即时擦除 · 办公桌法则' },
        narration: {
            en: 'Finally, memory is like a small sticky note board. You cannot keep every receipt forever, so throw away the oldest unused ones—that is LRU Eviction! And when a shoe goes on fifty percent discount in the database, grab a big red marker and cross out the old price on the board immediately. Never let customers see yesterday\'s price!',
            zh: '最后，内存就像一块小便利贴板。你不可能把所有收据都挂上去，所以把最久没用的旧便利贴扔掉——这就是 LRU 淘汰！当数据库里的鞋打五折时，立刻拿红色大马克笔把便利贴上的旧价格划掉。绝不能让顾客看到昨天的旧价格！',
        },
        visual: {
            badge: 'EVERYDAY ANALOGY 4 · STICKY NOTE ERASER',
            cardTitle: 'Throw Away Old Notes & Cross Out Stale Prices',
            badOption: {
                head: '❌ Yesterday\'s Stale Price on Board',
                body: 'Customers get angry seeing wrong outdated price',
            },
            goodOption: {
                head: '✅ Cross Out Old Price Immediately',
                body: 'Guarantees read-your-own-write consistency across cluster',
            },
        },
    },

    // ── Beat 6: Fun Practice Call to Action ───────────────────────────────
    {
        id: 'sd-cache-outro',
        title: { en: 'Interactive Practice · Master System Design', zh: '爆笑互动实战 · 秒懂系统设计' },
        narration: {
            en: 'And that is how top tech companies keep their servers alive during crazy midnight sales! Ready to prove you are an architecture wizard? Head to the interactive practice scenarios below and design resilient systems on CareerVivid!',
            zh: '这就是顶尖科技公司在疯狂零点大促中保住服务器命的秘诀！准备好证明你也是架构大师了吗？快去下面的互动练习区，在 CareerVivid 上实战设计高可用系统吧！',
        },
        visual: {
            badge: 'SYSTEM DESIGN PRACTICE DRILL',
            cardTitle: 'Master High-Concurrency System Design',
            badOption: {
                head: '🎓 System Design Secrets Mastered',
                body: 'Single-Flight, Token Bucket Bouncer, & LRU Desk Sweep',
            },
            goodOption: {
                head: '📝 Take Interactive Practice Drill',
                body: 'Complete live architecture scenarios on CareerVivid!',
            },
        },
    },
];
