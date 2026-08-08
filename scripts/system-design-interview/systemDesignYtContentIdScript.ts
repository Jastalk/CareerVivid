/**
 * systemDesignYtContentIdScript.ts
 *
 * System Design Lesson: YouTube Content ID & Automated Copyright Matching
 */

export interface BeatSpec {
    id: string;
    renderer: 'VEO' | 'DIAGRAM';
    title: { en: string };
    narration: string; // Direct string for voiceover synthesis & subtitles
    conceptTags: string[];
    metrics: string[];
    veoPrompt?: string;
    diagramSpec?: {
        nodes: Array<{
            id: string;
            type: 'client' | 'gateway' | 'scheduler' | 'gpu' | 'vram' | 'storage';
            label: string;
            subtext?: string;
            x: number;
            y: number;
            appearsAtSec: number;
        }>;
        edges: Array<{
            from: string;
            to: string;
            label: string;
            appearsAtSec: number;
        }>;
    };
}

export interface SystemDesignScriptSpec {
    id: string;
    title: string;
    beats: BeatSpec[];
}

export const YOUTUBE_CONTENT_ID_SCRIPT: SystemDesignScriptSpec = {
    id: 'sd-ytcontentid',
    title: 'How to Design YouTube Content ID & Automated Copyright Matching',
    beats: [
        {
            id: 'sd-ytcontentid-intro',
            renderer: 'VEO',
            title: { en: 'The 500 Hours/Min Copyright Problem' },
            narration: 'How does YouTube scan 500 hours of uploaded video every single minute to detect copyright infringement instantly? Let us design Content ID at global scale.',
            conceptTags: ['500 Hrs/Min', 'Content ID', 'Copyright Engine'],
            metrics: ['📊 500 Hrs/Min Upload', '⚡ 100B Matches/Day', '⏱️ < 100ms Recall', '💰 $9B+ Creators Paid'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged yellow newsprint backdrop, halftone textures, paper cut-out video film reel and scanner beam. Dynamic paper sliding motion. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-ytcontentid-fingerprinting',
            renderer: 'DIAGRAM',
            title: { en: 'MinHash LSH & Fingerprinting' },
            narration: 'In a naive setup, matching raw 4K video files pixel-by-pixel requires petabytes of comparisons. Instead, audio and video streams are decomposed into compact 128-bit acoustic and visual fingerprints using MinHash Locality-Sensitive Hashing.',
            conceptTags: ['MinHash LSH', '128-bit Fingerprint', 'Spectral Hashing'],
            metrics: ['💾 128-bit Fingerprint', '⚡ 8x MinHash Compression', '⏱️ 12ms Feature Extract', '🎯 99.8% Accuracy'],
            diagramSpec: {
                nodes: [
                    { id: 'video', type: 'client', label: 'Uploaded 4K Video Stream', subtext: '500 Hours Upload / Min', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'extractor', type: 'gateway', label: 'Spectral Audio Extractor', subtext: 'FFt & Waveform Slices', x: 50, y: 30, appearsAtSec: 1.5 },
                    { id: 'minhash', type: 'gpu', label: 'MinHash LSH Generator', subtext: '128-bit Compact Hashes', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'video', to: 'extractor', label: 'Raw PCM Audio Stream', appearsAtSec: 1.8 },
                    { from: 'extractor', to: 'minhash', label: 'Frequency Spectrogram', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-ytcontentid-lsh-index',
            renderer: 'DIAGRAM',
            title: { en: 'LSH Index Sharding & Sub-100ms Recall' },
            narration: 'Fingerprints are stored in a distributed In-Memory LSH Index partitioned across thousands of shards. When a video is uploaded, its hashes query the index in parallel, achieving sub-100 millisecond candidate retrieval across 100 Million reference audio tracks.',
            conceptTags: ['LSH Sharded Index', '100M Tracks', '<100ms Recall'],
            metrics: ['🛡️ 256 LSH Shards', '📚 100M Reference Tracks', '⏱️ p99 < 85ms Recall', '⚡ 50,000 QPS'],
            diagramSpec: {
                nodes: [
                    { id: 'query_hash', type: 'client', label: 'Query Fingerprint', subtext: '128-bit MinHash Vectors', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'router', type: 'scheduler', label: 'LSH Hash Router', subtext: 'Consistent Hash Partitioning', x: 48, y: 50, appearsAtSec: 1.5 },
                    { id: 'shards', type: 'storage', label: '256 In-Memory Shards', subtext: '100M Tracks Index', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'query_hash', to: 'router', label: 'Parallel Fingerprint Stream', appearsAtSec: 1.8 },
                    { from: 'router', to: 'shards', label: 'Scatter-Gather Hash Lookup', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-ytcontentid-matching-pipeline',
            renderer: 'DIAGRAM',
            title: { en: 'Time-Offset Alignment Engine' },
            narration: 'Candidates pass through an Alignment & Scoring Engine. Time-offset histogram matching verifies continuous audio-visual overlaps even if the video was pitched, cropped, or sped up.',
            conceptTags: ['Histogram Alignment', 'Offset Matching', 'Perceptual Invariance'],
            metrics: ['📊 Histogram Peak Score', '🎛️ Pitch & Speed Invariant', '⏱️ 14ms Alignment', '🎯 < 0.01% False Matches'],
            diagramSpec: {
                nodes: [
                    { id: 'candidates', type: 'storage', label: 'Candidate Match Pairs', subtext: 'Top 50 Matched Hashes', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'histogram', type: 'gpu', label: 'Time-Offset Histogram Engine', subtext: 'Cross-Correlation Alignment', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'verifier', type: 'gateway', label: 'Match Confidence Verifier', subtext: 'Perceptual Overlap Score > 0.85', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'candidates', to: 'histogram', label: 'Time-Stamped Hash Tokens', appearsAtSec: 1.8 },
                    { from: 'histogram', to: 'verifier', label: 'Offset Delta Histogram', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-ytcontentid-claim-action',
            renderer: 'DIAGRAM',
            title: { en: 'Automated Claim Router & Event Bus' },
            narration: 'Upon a verified match, the Claim Router applies automated rules: monetize via ad sharing, track viewing statistics, or block global playback, publishing an immutable event to Kafka.',
            conceptTags: ['Claim Router', 'Ad Monetization', 'Kafka Events'],
            metrics: ['⚡ 15ms Claim Execution', '💸 Ad Revenue Sharing', '📨 Kafka Event Log', '🛡️ 99.99% Availability'],
            diagramSpec: {
                nodes: [
                    { id: 'match_event', type: 'gateway', label: 'Verified Match Event', subtext: 'Score: 0.96 Confidence', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'claim_router', type: 'scheduler', label: 'Policy Claim Router', subtext: 'Monetize / Track / Block Rules', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'kafka', type: 'storage', label: 'Kafka Ledger Event Log', subtext: 'Immutable Claim History', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'match_event', to: 'claim_router', label: 'Policy Check Request', appearsAtSec: 1.8 },
                    { from: 'claim_router', to: 'kafka', label: 'Publish Monetization Event', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-ytcontentid-failure-modes',
            renderer: 'DIAGRAM',
            title: { en: 'Dispute Queue & Human-in-Loop Fallback' },
            narration: 'What breaks at scale? False positive claims from short audio loops can block legitimate creators. Content ID prevents this using Dispute Queue async processing and manual review human-in-the-loop fallback.',
            conceptTags: ['Dispute Queue', 'Human-in-Loop', 'False-Positive Guard'],
            metrics: ['⚖️ Dispute Queue Async', '🛡️ False-Positive Guard', '👤 Human Review Fallback', '📉 99.4% Dispute Resolution'],
            diagramSpec: {
                nodes: [
                    { id: 'creator_dispute', type: 'client', label: 'Creator Counter-Notification', subtext: 'Fair Use Appeal', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'queue', type: 'scheduler', label: 'Async Dispute Queue', subtext: 'Postgres CDC + Redis Buffer', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'review', type: 'gateway', label: 'Human Review Portal', subtext: 'Rights Holder Verdict', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'creator_dispute', to: 'queue', label: 'Submit Appeal Claim', appearsAtSec: 1.8 },
                    { from: 'queue', to: 'review', label: 'Escalate Unresolved Matches', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-ytcontentid-benchmark',
            renderer: 'DIAGRAM',
            title: { en: 'Global Scale Benchmarks' },
            narration: 'YouTube Content ID processes 100 Billion matching operations daily with 99.99% system availability, paying over 9 Billion dollars to copyright holders.',
            conceptTags: ['100B Operations/Day', '99.99% Availability', '$9B+ Paid'],
            metrics: ['📊 100B Daily Operations', '🌐 99.99% SLA Availability', '💸 $9 Billion Paid Creators', '⚡ < 90ms Global Latency'],
            diagramSpec: {
                nodes: [
                    { id: 'scale_input', type: 'vram', label: 'Global Video Ingestion', subtext: '500 Hrs/Min Ingress', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'scale_output', type: 'gpu', label: 'Content ID Engine', subtext: '100B Matches / Day @ 99.99%', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'scale_input', to: 'scale_output', label: 'Sub-100ms Match Pipeline', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-ytcontentid-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 Sub-100ms Content ID', '🚀 100B Matches/Day', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper play icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};
