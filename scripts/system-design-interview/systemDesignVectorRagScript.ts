/**
 * systemDesignVectorRagScript.ts
 *
 * Script and Progressive Diagram Specification for:
 *   System Design: How to Design Vector DB Index Sharding & Hybrid RAG at Scale
 *   (10B Vectors, HNSW Graph Indexing, IVF-PQ 8x Compression & Sub-10ms Search)
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

export const VECTOR_RAG_SCRIPT: SystemDesignScriptSpec = {
    id: 'sd-vector-rag',
    title: 'How to Design Vector DB Index Sharding & Hybrid RAG at Scale',
    beats: [
        {
            id: 'sd-vector-rag-intro',
            renderer: 'VEO',
            title: { en: 'The 10 Billion Vector Problem' },
            narration: 'Searching 10 billion high-dimensional embeddings in under 10 milliseconds is the core bottleneck of modern enterprise AI. Here is how engineers build sharded vector databases that deliver sub-10ms hybrid retrieval at 50,000 queries per second!',
            conceptTags: ['10B Vectors', '50,000 QPS', 'Hybrid RAG'],
            metrics: ['📊 10B Vectors', '⚡ 50,000 QPS', '⏱️ < 10ms Latency', '🎯 98.4% Recall'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged newsprint backdrop, paper vector cube and glowing search beam. Dynamic paper sliding motion. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-vector-rag-requirements',
            renderer: 'DIAGRAM',
            title: { en: 'System Requirements & SLA' },
            narration: 'Our architecture must index 10 billion 1536-dimensional vectors, support dense vector similarity alongside sparse BM25 keyword matching, guarantee p99 latency under 8 milliseconds, and achieve 98% recall accuracy while keeping memory overhead under 16 gigabytes per shard.',
            conceptTags: ['1536 Dims', 'p99 < 8ms SLA', 'Hybrid Dense+Sparse'],
            metrics: ['💾 1536 Dims', '⏱️ p99 < 8ms', '🎯 98.4% Recall', '📦 <= 16GB / Shard'],
            diagramSpec: {
                nodes: [
                    { id: 'client', type: 'client', label: 'User RAG Query', subtext: 'Dense + Sparse Query', x: 20, y: 35, appearsAtSec: 0.5 },
                    { id: 'sla', type: 'gateway', label: 'System SLA Target', subtext: '10B Vectors @ 50k QPS', x: 50, y: 35, appearsAtSec: 1.5 },
                    { id: 'target', type: 'gpu', label: 'Hybrid Vector Engine', subtext: 'HNSW + BM25 Fusion', x: 80, y: 35, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'client', to: 'sla', label: 'Dense Embed + Tokens', appearsAtSec: 2.0 },
                    { from: 'sla', to: 'target', label: '< 8ms p99 SLA', appearsAtSec: 3.5 }
                ]
            }
        },
        {
            id: 'sd-vector-rag-naive',
            renderer: 'DIAGRAM',
            title: { en: 'Naive Single-Node Flat Search' },
            narration: 'In a naive setup, we store 10 billion float32 vectors in raw uncompressed arrays. Performing an exact brute-force cosine distance comparison requires scanning 60 gigabytes of data per query, melting single-node CPU memory bandwidth instantly.',
            conceptTags: ['Flat Vector Array', 'Exact Cosine Scan', 'RAM Bus Lockup'],
            metrics: ['💥 60 GB Scan / Query', '⏳ 4,500ms Latency', '❌ 100% CPU Saturation', '💸 600 GB VRAM Waste'],
            diagramSpec: {
                nodes: [
                    { id: 'query', type: 'client', label: 'Query Vector', subtext: '1536 Float32 Numbers', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'flat', type: 'storage', label: 'Flat Vector Array', subtext: '10B Vectors Uncompressed', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'cpu', type: 'gpu', label: 'Single CPU Core', subtext: 'Exact Cosine Distance', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'query', to: 'flat', label: 'Full Table Scan', appearsAtSec: 2.0 },
                    { from: 'flat', to: 'cpu', label: '60 GB Memory Transfer', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-vector-rag-why-breaks',
            renderer: 'DIAGRAM',
            title: { en: 'Why Naive Vector Search Fails' },
            narration: 'Under 50,000 QPS, brute-force search crashes with out-of-memory errors. Latency explodes past 4,500 milliseconds, memory bus contention locks all CPU cores, and pure vector cosine search fails to match exact keyword product IDs or serial numbers.',
            conceptTags: ['50k QPS Spike', 'Memory Bus Bottleneck', 'OOM Crash'],
            metrics: ['🔥 4,500ms p99 Spike', '💥 OOM Crash', '⚠️ Zero Keyword Match', '📉 0.2% Throughput'],
            diagramSpec: {
                nodes: [
                    { id: 'traffic', type: 'client', label: '50,000 Concurrent QPS', subtext: 'High Spike Burst', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'bus', type: 'scheduler', label: 'RAM Bus Bottleneck', subtext: 'Memory Bandwidth Exhausted', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'crash', type: 'vram', label: 'Process OOM Failure', subtext: 'System Crash & Outage', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'traffic', to: 'bus', label: 'Overwhelmed Queues', appearsAtSec: 2.0 },
                    { from: 'bus', to: 'crash', label: 'Memory Bus Lockup', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-vector-rag-core-architecture',
            renderer: 'DIAGRAM',
            title: { en: 'Sharded HNSW + IVF-PQ + BM25 Architecture' },
            narration: 'To solve this, we shard the 10 billion vectors across 256 index nodes. Each node runs Product Quantization to compress 1536-dimensional vectors by 8 times, combined with an HNSW graph index for sub-millisecond graph traversal and a BM25 inverted index for exact lexical matching.',
            conceptTags: ['HNSW Graph Index', 'IVF-PQ 8x Compression', 'BM25 Sparse Match'],
            metrics: ['⚡ 8x IVF-PQ Compression', '🌲 HNSW Graph M=16', '🔤 BM25 Inverted Index', '🛡️ 256 Index Shards'],
            diagramSpec: {
                nodes: [
                    { id: 'router', type: 'gateway', label: 'Scatter-Gather Router', subtext: 'Consistent Hashing Partition', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'hnsw', type: 'scheduler', label: 'HNSW Graph Index', subtext: 'Sub-ms Graph Traversal', x: 45, y: 25, appearsAtSec: 1.5 },
                    { id: 'pq', type: 'gpu', label: 'IVF-PQ Quantizer', subtext: '8x Compressed Centroids', x: 45, y: 75, appearsAtSec: 2.5 },
                    { id: 'bm25', type: 'storage', label: 'BM25 Sparse Index', subtext: 'Exact Lexical Match', x: 80, y: 50, appearsAtSec: 3.5 }
                ],
                edges: [
                    { from: 'router', to: 'hnsw', label: 'Dense Embedding Query', appearsAtSec: 2.0 },
                    { from: 'router', to: 'pq', label: 'Quantized Centroid Lookup', appearsAtSec: 3.0 },
                    { from: 'router', to: 'bm25', label: 'Sparse Token Match', appearsAtSec: 4.2 }
                ]
            }
        },
        {
            id: 'sd-vector-rag-deep-dive',
            renderer: 'DIAGRAM',
            title: { en: 'Reciprocal Rank Fusion & Reranking' },
            narration: 'When candidate results return from all 256 shards, a GPU-accelerated Scatter-Gather coordinator executes Reciprocal Rank Fusion to combine dense cosine scores and sparse BM25 scores. A lightweight cross-encoder reranker then scores the top 100 candidates in 2.5 milliseconds.',
            conceptTags: ['Reciprocal Rank Fusion', 'Top 100 Candidates', 'Cross-Encoder Rerank'],
            metrics: ['🔀 Reciprocal Rank Fusion', '🚀 Top 100 Reranked', '⏱️ 2.5ms Rerank Latency', '📊 98.4% Recall'],
            diagramSpec: {
                nodes: [
                    { id: 'shards', type: 'storage', label: '256 Vector Shards', subtext: 'Top 500 Candidates Each', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'rrf', type: 'gateway', label: 'RRF Fusion Engine', subtext: 'Dense + Sparse Rank Score', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'reranker', type: 'gpu', label: 'Cross-Encoder GPU', subtext: 'Final 10 Context Passages', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'shards', to: 'rrf', label: 'Parallel Shard Results', appearsAtSec: 2.0 },
                    { from: 'rrf', to: 'reranker', label: 'Top 100 Candidates', appearsAtSec: 3.5 }
                ]
            }
        },
        {
            id: 'sd-vector-rag-tradeoffs',
            renderer: 'DIAGRAM',
            title: { en: 'Production Tradeoffs & Memory Footprint' },
            narration: 'By adopting IVF-PQ with HNSW, we slash overall cluster RAM from 600 gigabytes down to just 75 gigabytes, reducing infrastructure costs by 87% while maintaining a 98.4% recall rate and sub-8ms P99 latency.',
            conceptTags: ['87% Cost Slash', '75GB RAM Cluster', 'p99 < 7.8ms'],
            metrics: ['📉 RAM: 600GB -> 75GB', '💰 87% Cost Reduction', '⚡ p99 < 7.8ms', '🎯 98.4% Recall'],
            diagramSpec: {
                nodes: [
                    { id: 'uncompressed', type: 'vram', label: 'Raw Uncompressed Index', subtext: '600 GB RAM / $12,000/mo', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'compressed', type: 'gpu', label: 'IVF-PQ + HNSW Index', subtext: '75 GB RAM / $1,500/mo', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'uncompressed', to: 'compressed', label: '87% RAM Reduction', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-vector-rag-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 Sub-10ms Hybrid RAG', '🚀 50k QPS Scale', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper play icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};

