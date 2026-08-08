/**
 * systemDesignDropboxScript.ts
 *
 * Today's Video #3:
 *   System Design Interview — How to Design Dropbox (Block Storage, CDC Chunking & Metadata Sync)
 *
 * 6-Section Blueprint:
 *   1. Monolith Intuition Hook: Full file re-upload bandwidth choke & sync lag.
 *   2. Content-Defined Chunking: Rabin Fingerprinting & 4MB chunking.
 *   3. SHA-256 Block Deduplication: Zero-byte uploads & Magic Pocket / S3 block storage.
 *   4. Delta Sync & Notification Queues: Persistent long-polling & metadata commits.
 *   5. Conflict Resolution & Resilience: Vector clocks, conflict copies & resumable multipart uploads.
 *   6. Tech Benchmarks & Spoken Like & Subscribe CTA + CareerVivid Interactive Platform.
 */

export interface DropboxBeat {
    id: string;
    title: { en: string; zh: string };
    narration: { en: string; zh: string };
    visual: {
        badge: string;
        cardTitle: string;
    };
}

export const SYSTEM_DESIGN_DROPBOX_BEATS: DropboxBeat[] = [
    {
        id: 'sd-dropbox-intro',
        title: { en: 'Designing Dropbox · Block Storage & Distributed Sync', zh: '设计 Dropbox · 块存储与分布式同步' },
        narration: {
            en: 'When 700 Million users sync multi-gigabyte files across laptop and phone devices, uploading entire files on every tiny edit burns bandwidth and chokes storage! How does Dropbox sync file edits in milliseconds using minimal data transfer?',
            zh: '当 7 亿用户在电脑和手机间同步数 GB 大小的文件时，每次微小修改都重新上传整份文件会严重浪费带宽并撑爆存储！Dropbox 到底如何在最小数据传输下实现毫秒级文件同步？',
        },
        visual: {
            badge: 'DISTRIBUTED SYNC · BLOCK STORAGE',
            cardTitle: 'Scaling Exabyte File Synchronization Engine',
        },
    },
    {
        id: 'sd-dropbox-cdc',
        title: { en: 'Content-Defined Chunking & Rabin Fingerprinting', zh: '内容定义切片 (CDC) 与 Rabin 指纹算法' },
        narration: {
            en: 'To sync efficiently, Dropbox splits files into 4-megabyte chunks using Content-Defined Chunking with Rabin Fingerprinting! If you edit one sentence in a 1-gigabyte document, only the modified 4MB block is re-uploaded!',
            zh: '为了高效同步，Dropbox 采用结合 Rabin 指纹算法的内容定义切片 (CDC) 将文件切割为 4MB 块！即使在一份 1GB 的文档中修改了一个句子，也只需重新上传受影响的 4MB 数据块！',
        },
        visual: {
            badge: 'CONTENT CHUNKING · RABIN FINGERPRINTING',
            cardTitle: '4MB Rolling Window Slicing for Incremental Edits',
        },
    },
    {
        id: 'sd-dropbox-dedup',
        title: { en: 'SHA-256 Block Deduplication & Magic Pocket Storage', zh: 'SHA-256 数据块重删与 Magic Pocket 存储' },
        narration: {
            en: 'How does Dropbox save petabytes of storage? SHA-256 Deduplication! Before uploading a chunk, the client computes its hash. If the chunk already exists in Magic Pocket storage, the file metadata links to it without uploading a single byte!',
            zh: 'Dropbox 如何节省 PB 级存储空间？SHA-256 块去重！上传切片前客户端先计算哈希。若切片已存在于 Magic Pocket 块存储中，元数据直接关联该块，无需上传任何一个字节！',
        },
        visual: {
            badge: 'BLOCK DEDUPLICATION · MAGIC POCKET',
            cardTitle: 'Zero-Byte Uploads via SHA-256 Hash Matching',
        },
    },
    {
        id: 'sd-dropbox-sync-engine',
        title: { en: 'Delta Sync Engine & Long-Polling Notification Queue', zh: '增量同步引擎与长轮询通知队列' },
        narration: {
            en: 'How do changes reflect across your devices instantly? The Sync Engine! When a chunk finishes uploading, a Metadata Service commits the file version and pushes a delta notification over a persistent HTTP long-polling queue to all connected devices.',
            zh: '文件变更如何瞬间同步至所有设备？增量同步引擎！切片上传完毕后，元数据服务提交版本号，并通过持久 HTTP 长轮询队列将增量通知实时推送至关联设备。',
        },
        visual: {
            badge: 'DELTA SYNC · LONG-POLLING QUEUE',
            cardTitle: 'Atomic Metadata Version Commits & Instant Push',
        },
    },
    {
        id: 'sd-dropbox-conflict-resolution',
        title: { en: 'Conflict Resolution & S3 Multipart Upload Resilience', zh: '冲突解决机制与 S3 分段上传容灾' },
        narration: {
            en: 'What happens when two devices edit the same file offline? Dropbox uses Vector Clocks to detect concurrent modifications, creating a conflict copy file! For large chunks, S3 multipart uploads resume automatically after network drops.',
            zh: '当两台设备离线修改同一个文件时会发生什么？Dropbox 使用向量时钟 (Vector Clocks) 检测并发修改并生成冲突副本！在网络中断时，大文件分段上传支持自动断点续传。',
        },
        visual: {
            badge: 'RESILIENCE & CONFLICTS · VECTOR CLOCKS',
            cardTitle: 'Concurrent Edit Copying & Resumable Chunk Uploads',
        },
    },
    {
        id: 'sd-dropbox-benchmark',
        title: { en: 'Tech Benchmark · Dropbox Magic Pocket vs Cloud Storage', zh: '架构对比 · Dropbox Magic Pocket vs 通用 S3' },
        narration: {
            en: 'How does Dropbox compare to standard S3 cloud storage? By migrating to custom Magic Pocket block storage servers, Dropbox reduced storage infrastructure overhead while achieving 99.999999999% durability across exabytes of user data!',
            zh: 'Dropbox 与通用 S3 云存储相比如何？通过迁移自研的 Magic Pocket 块存储服务器，Dropbox 在海量 Exabyte 数据上实现了 11 个 9 的持久性，同时大幅降低了基础设施开销！',
        },
        visual: {
            badge: 'TECH BENCHMARK · MAGIC POCKET EXABYTE STORAGE',
            cardTitle: '11-Nines Durability & Reduced Storage Overhead',
        },
    },
    {
        id: 'sd-dropbox-call-to-action',
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
