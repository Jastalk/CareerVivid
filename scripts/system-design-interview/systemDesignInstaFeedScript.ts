/**
 * systemDesignInstaFeedScript.ts
 *
 * System Design Lesson: Instagram Feed Ranking & Recommendation Engine
 */

export interface BeatSpec {
    id: string;
    renderer: 'VEO' | 'DIAGRAM';
    title: { en: string };
    narration: string;
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

export const INSTAGRAM_FEED_SCRIPT: SystemDesignScriptSpec = {
    id: 'sd-insta-feed',
    title: 'How to Design Instagram Feed Ranking & Recommendation Engine',
    beats: [
        {
            id: 'sd-insta-feed-intro',
            renderer: 'VEO',
            title: { en: 'The 500M Daily Feed Ranking Scale' },
            narration: 'How does Instagram rank and deliver a personalized feed of posts and reels for 500 Million daily active users in under 200 milliseconds? Let us design the Feed Ranking Engine at scale.',
            conceptTags: ['500M Daily Active', 'Feed Engine', '<200ms Latency'],
            metrics: ['📊 500M Daily Active Users', '⚡ 2M Ranking QPS', '⏱️ p99 < 180ms', '🎯 99.9% SLA'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged newsprint backdrop, paper smartphone frame with scrolling feed post cut-outs. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-insta-feed-two-stage',
            renderer: 'DIAGRAM',
            title: { en: 'Two-Stage Candidate Recall Pipeline' },
            narration: 'Searching millions of global posts per request is impossible. Instagram uses a Two-Stage Pipeline: First, Candidate Generation retrieves 10,000 relevant posts from followed accounts and vector embeddings, then Heavy Ranking scores the top 500.',
            conceptTags: ['Candidate Retrieval', 'Vector Recall', 'Heavy Ranking'],
            metrics: ['🎯 10,000 Candidates Recalled', '⚡ 15ms Vector Recall', '📊 Top 500 Heavy Rank', '🛡️ Two-Pass Filter'],
            diagramSpec: {
                nodes: [
                    { id: 'user_req', type: 'client', label: 'User Feed Request', subtext: 'User ID + Device Context', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'recall', type: 'gateway', label: 'Candidate Recall Engine', subtext: 'Follower Graph + Vector ANN', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'heavy_rank', type: 'gpu', label: 'Heavy Ranking Cluster', subtext: 'Top 500 Neural Scoring', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'user_req', to: 'recall', label: 'Parallel Retrieval Trigger', appearsAtSec: 1.8 },
                    { from: 'recall', to: 'heavy_rank', label: '10,000 Candidate IDs', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-insta-feed-feature-store',
            renderer: 'DIAGRAM',
            title: { en: 'Real-Time Feature Store' },
            narration: 'To score candidates instantly, a low-latency Real-Time Feature Store powered by Redis and Cassandra serves user engagement histories, creator affinity scores, and post recency metrics in under 5 milliseconds.',
            conceptTags: ['Real-Time Feature Store', 'Redis & Cassandra', '<5ms Feature Fetch'],
            metrics: ['⚡ < 4ms Feature Latency', '🗄️ Redis In-Memory Cache', '💾 Cassandra Long-Term Store', '📊 100+ Feature Dimensions'],
            diagramSpec: {
                nodes: [
                    { id: 'candidates', type: 'storage', label: 'Recalled 10,000 Posts', subtext: 'Post & Author Metadata', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'feature_store', type: 'scheduler', label: 'Real-Time Feature Store', subtext: 'Redis Cluster + Cassandra', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'features_out', type: 'vram', label: 'Feature Tensors', subtext: 'Affinity + Recency + CTR', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'candidates', to: 'feature_store', label: 'Fetch Author & User Features', appearsAtSec: 1.8 },
                    { from: 'feature_store', to: 'features_out', label: '< 4ms Batch Join', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-insta-feed-dlrm-model',
            renderer: 'DIAGRAM',
            title: { en: 'DLRM GPU Scoring Cluster' },
            narration: 'The Heavy Ranker uses Deep Learning Recommendation Models (DLRM) on GPU clusters to predict probabilities of likes, comments, shares, and watch time, combining them into a final ranking score.',
            conceptTags: ['DLRM Neural Model', 'GPU Scoring Cluster', 'p(Like) & p(Watch)'],
            metrics: ['🚀 DLRM Neural Net', '📊 p(Like), p(Comment), p(Watch)', '⚡ 25ms GPU Inference', '🎯 12.4% CTR Lift'],
            diagramSpec: {
                nodes: [
                    { id: 'feature_tensors', type: 'vram', label: 'Joined Feature Tensors', subtext: '100+ Dense & Sparse Features', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'dlrm_gpu', type: 'gpu', label: 'DLRM GPU Cluster', subtext: 'Multi-Task Neural Network', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'final_score', type: 'gateway', label: 'Final Score Evaluator', subtext: 'Weighted Engagement Score', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'feature_tensors', to: 'dlrm_gpu', label: 'Forward Inference Batch', appearsAtSec: 1.8 },
                    { from: 'dlrm_gpu', to: 'final_score', label: 'Engagement Probabilities', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-insta-feed-dedup-cache',
            renderer: 'DIAGRAM',
            title: { en: 'In-Memory Feed Cache & Impression Dedup' },
            narration: 'Ranked post IDs are written to an In-Memory Feed Cache per user. Impression Deduplication ensures users never see duplicate posts within 7 days, maintaining high user retention.',
            conceptTags: ['In-Memory Feed Cache', 'Impression Dedup', '7-Day Window'],
            metrics: ['🗄️ In-Memory Feed Cache', '🛡️ 7-Day Impression Bloom Filter', '⚡ Zero Duplicate Posts', '📈 18% Retention Boost'],
            diagramSpec: {
                nodes: [
                    { id: 'ranked_list', type: 'gateway', label: 'Top 500 Ranked Posts', subtext: 'Sorted by Engagement Score', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'bloom_filter', type: 'scheduler', label: '7-Day Bloom Filter Dedup', subtext: 'Seen Impression History', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'feed_cache', type: 'storage', label: 'User Feed Cache', subtext: 'Redis Cluster Buffer', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'ranked_list', to: 'bloom_filter', label: 'Filter Seen Post IDs', appearsAtSec: 1.8 },
                    { from: 'bloom_filter', to: 'feed_cache', label: 'Write Fresh Unseen Posts', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-insta-feed-failure-modes',
            renderer: 'DIAGRAM',
            title: { en: 'Exploration Slots & Cold-Start Guard' },
            narration: 'What breaks at scale? Cold-start latency for new creators can starve new posts of visibility. Instagram fixes this with an Exploration Slot strategy that injects 5% unranked new posts into feed batches.',
            conceptTags: ['Exploration Slots', 'Cold-Start Fallback', '5% Unranked Inject'],
            metrics: ['🎰 5% Exploration Slot Inject', '🆕 Cold-Start Creator Guard', '⚡ Real-time Feedback Loop', '📊 2.4x New Creator Reach'],
            diagramSpec: {
                nodes: [
                    { id: 'cold_start', type: 'client', label: 'New Creator Upload', subtext: 'Zero Engagement History', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'slot_injector', type: 'scheduler', label: 'Exploration Slot Injector', subtext: 'Injects 5% Random Unranked', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'user_feed', type: 'gateway', label: 'Delivered User Feed', subtext: '95% Ranked + 5% Explore', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'cold_start', to: 'slot_injector', label: 'Bypass Heavy Ranker', appearsAtSec: 1.8 },
                    { from: 'slot_injector', to: 'user_feed', label: 'Blend Exploration Posts', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-insta-feed-benchmark',
            renderer: 'DIAGRAM',
            title: { en: 'Global Scale Benchmarks' },
            narration: 'Instagram Feed Engine serves 2 Million recommendation QPS across global data centers with a 99.9% p99 latency SLA under 180 milliseconds.',
            conceptTags: ['2M QPS', '<180ms p99 Latency', '99.9% SLA'],
            metrics: ['📊 2 Million Ranking QPS', '⚡ p99 Latency < 180ms', '🌐 Global Multi-DC Cluster', '🛡️ 99.9% SLA Availability'],
            diagramSpec: {
                nodes: [
                    { id: 'global_ingress', type: 'vram', label: '500M Users Ingress', subtext: '2M QPS Worldwide', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'feed_cluster', type: 'gpu', label: 'Feed Engine Mesh', subtext: 'Sub-180ms p99 @ 99.9% SLA', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'global_ingress', to: 'feed_cluster', label: 'Global Recommendation Pipeline', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-insta-feed-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 Sub-180ms Feed Engine', '🚀 2M QPS Scale', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper play icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};
