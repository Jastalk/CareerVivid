/**
 * systemDesignVeoPipelineScript.ts
 *
 * System Design Lesson: Generative Video AI Pipelines (DiT, 3D VAE & Ring Attention)
 */

export const VEO_PIPELINE_SCRIPT = {
    id: 'sd-veo-pipeline',
    title: 'How to Design Generative Video AI Pipelines (DiT, 3D VAE & Ring Attention)',
    beats: [
        {
            id: 'sd-veo-pipeline-intro',
            renderer: 'VEO',
            title: { en: 'Generative Video & The DiT Latent Problem' },
            narration: 'How do video AI models like Sora and Veo generate photorealistic 1080p video frames without running out of GPU memory or taking hours to render? Let us design Generative Video Pipelines at scale.',
            conceptTags: ['Video AI Pipeline', 'Diffusion Transformer', 'Veo / Sora Architecture'],
            metrics: ['📊 1080p @ 60 FPS Video', '⚡ 8x H100 GPU Clusters', '🗄️ 3.2 Tokens/sec Throughput', '⏱️ 4x Memory Compression'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged yellow newsprint backdrop, halftone textures, paper cut-out video camera, glowing AI neural nodes, and film strip. Dynamic paper sliding motion. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-veo-pipeline-dit-vs-unet',
            renderer: 'DIAGRAM',
            title: { en: 'U-Net Bottlenecks vs Diffusion Transformers (DiT)' },
            narration: 'Legacy U-Net video models struggle with long-range temporal coherence, leading to flickering frames. Modern video generators convert spatio-temporal video patches into latent visual tokens, using Diffusion Transformers to process entire video clips as sequence blocks.',
            conceptTags: ['U-Net vs DiT', 'Spatio-Temporal Tokens', 'Temporal Coherence'],
            metrics: ['⚡ 16x Sequence Scaling', '🎯 99.1% Temporal Smoothness', '🎛️ 128D Token Embeddings', '⏱️ 45ms Layer Propagation'],
            diagramSpec: {
                nodes: [
                    { id: 'raw_frames', type: 'client', label: 'Raw 1080p Video Clip', subtext: '24 FPS Spatio-Temporal Data', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'tokenizer', type: 'gateway', label: 'Patchifying Tokenizer', subtext: '4x4x2 Spatial-Temporal Blocks', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'dit_block', type: 'gpu', label: 'Diffusion Transformer (DiT)', subtext: 'Multi-Head Self-Attention', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'raw_frames', to: 'tokenizer', label: 'Extract 3D Video Patches', appearsAtSec: 1.8 },
                    { from: 'tokenizer', to: 'dit_block', label: 'Pass Visual Token Sequence', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-veo-pipeline-3d-vae',
            renderer: 'DIAGRAM',
            title: { en: '3D Spatial-Temporal VAE Compression' },
            narration: 'Processing raw pixels directly saturates GPU VRAM instantly. A 3D Spatial-Temporal Variational Autoencoder compresses spatial resolution 8-fold and temporal frames 4-fold into a compact latent space, reducing memory overhead by 96%.',
            conceptTags: ['3D VAE Encoder', 'Latent Space Compression', '96% VRAM Reduction'],
            metrics: ['🗄️ 96% VRAM Reduction', '📊 8x Spatial Compression', '⏱️ 4x Temporal Compression', '⚡ Sub-10ms Decode'],
            diagramSpec: {
                nodes: [
                    { id: 'video_in', type: 'client', label: 'High-Res Pixel Stream', subtext: '1920x1080 @ 60 FPS', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'vae_encoder', type: 'vram', label: '3D Spatial-Temporal VAE', subtext: 'Causal 3D Conv Net', x: 48, y: 50, appearsAtSec: 1.5 },
                    { id: 'latent_space', type: 'storage', label: 'Compressed Latent Grid', subtext: '16-Channel Latent Tensor', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'video_in', to: 'vae_encoder', label: 'Encode Spatial & Time Channels', appearsAtSec: 1.8 },
                    { from: 'vae_encoder', to: 'latent_space', label: '96% Memory Compressed Latent', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-veo-pipeline-ring-attention',
            renderer: 'DIAGRAM',
            title: { en: 'Ring Attention & 3D Sequence Parallelism' },
            narration: 'Long video generation causes quadratic attention memory explosions across GPU clusters. Ring Attention distributes token sequence blocks in a ring communication topology across 64 H100 GPUs, streaming key-value states overlap-free during forward passes.',
            conceptTags: ['Ring Attention', 'Sequence Parallelism', '64 GPU H100 Ring'],
            metrics: ['🚀 64 H100 GPUs Ring', '⚡ Zero Communication Idle', '📊 1M Token Context Window', '⏱️ 14ms Ring Hop'],
            diagramSpec: {
                nodes: [
                    { id: 'gpu_node_1', type: 'gpu', label: 'GPU Rank 0 (H100)', subtext: 'Token Chunk 0..256k', x: 18, y: 35, appearsAtSec: 0.5 },
                    { id: 'gpu_node_2', type: 'gpu', label: 'GPU Rank 1 (H100)', subtext: 'Token Chunk 256k..512k', x: 82, y: 35, appearsAtSec: 0.5 },
                    { id: 'gpu_node_3', type: 'gpu', label: 'GPU Rank 2 (H100)', subtext: 'Token Chunk 512k..768k', x: 82, y: 65, appearsAtSec: 1.5 },
                    { id: 'gpu_node_4', type: 'gpu', label: 'GPU Rank 3 (H100)', subtext: 'Token Chunk 768k..1M', x: 18, y: 65, appearsAtSec: 1.5 }
                ],
                edges: [
                    { from: 'gpu_node_1', to: 'gpu_node_2', label: 'Ring P2P KV Transfer', appearsAtSec: 1.8 },
                    { from: 'gpu_node_2', to: 'gpu_node_3', label: 'Ring P2P KV Transfer', appearsAtSec: 2.2 },
                    { from: 'gpu_node_3', to: 'gpu_node_4', label: 'Ring P2P KV Transfer', appearsAtSec: 2.6 },
                    { from: 'gpu_node_4', to: 'gpu_node_1', label: 'Ring P2P KV Transfer', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-veo-pipeline-failure-modes',
            renderer: 'DIAGRAM',
            title: { en: 'GPU Node Failures & Asynchronous Checkpointing' },
            narration: 'What breaks at scale? A single GPU XID error during a 50-step diffusion run can crash the entire multi-node cluster. Video pipelines solve this with asynchronous NVMe checkpoint bursting, resuming denoising steps in under 3 seconds.',
            conceptTags: ['GPU Node Crash', 'Async NVMe Burst', 'Sub-3s Checkpoint Resume'],
            metrics: ['🛡️ Sub-3s Checkpoint Resume', '⚡ 80GB/s NVMe Burst Speed', '💾 Persistent Denoise Step', '📉 < 0.1% Job Loss'],
            diagramSpec: {
                nodes: [
                    { id: 'gpu_fault', type: 'gpu', label: 'GPU Rank 42 Crash', subtext: 'XID 79 NVLink Error', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'nvme_store', type: 'vram', label: 'Local NVMe Burst Buffer', subtext: 'Denoising Step 34 State', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'hot_spare', type: 'scheduler', label: 'Hot Spare GPU Worker', subtext: 'Instant State Resumption', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'gpu_fault', to: 'nvme_store', label: 'Trigger Failover Event', appearsAtSec: 1.8 },
                    { from: 'nvme_store', to: 'hot_spare', label: 'Sub-3s Checkpoint Hydration', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-veo-pipeline-speculative-sampling',
            renderer: 'DIAGRAM',
            title: { en: 'Speculative Denoising & Fast Sampling' },
            narration: 'To accelerate 50-step ODE sampling, a lightweight draft model predicts coarse noise steps, while the full Diffusion Transformer verifies trajectory correctness in parallel, speeding up generation 3-fold.',
            conceptTags: ['Speculative Denoising', 'Draft Noise Predictor', '3x Generation Speedup'],
            metrics: ['🚀 3x Speedup Acceleration', '⏱️ 15ms Draft Prediction', '🎯 98.9% Acceptance Rate', '📊 50-Step ODE Solver'],
            diagramSpec: {
                nodes: [
                    { id: 'draft_net', type: 'scheduler', label: 'Lightweight Draft Model', subtext: 'Predict Denoise Trajectory', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'dit_verifier', type: 'gpu', label: 'Full DiT Verifier', subtext: 'Parallel Batch Acceptance Test', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'clean_latent', type: 'storage', label: 'Denoised Video Latent', subtext: 'Final 1080p Video Frame Grid', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'draft_net', to: 'dit_verifier', label: 'Submit Draft Noise Step', appearsAtSec: 1.8 },
                    { from: 'dit_verifier', to: 'clean_latent', label: 'Accept Verified Noise Delta', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-veo-pipeline-benchmark',
            renderer: 'DIAGRAM',
            title: { en: 'Global Scale Benchmarks' },
            narration: 'Generative Video AI pipelines powered by Ring Attention and 3D VAE compression deliver photorealistic 1080p 60 FPS video at 3.2 tokens per second with 99.9% cluster training reliability.',
            conceptTags: ['1080p @ 60 FPS', '3.2 Tokens/sec', '99.9% Reliability'],
            metrics: ['📊 1080p @ 60 FPS Output', '⚡ 3.2 Tokens / sec Speed', '🚀 64 H100 Cluster Scaling', '🛡️ 99.9% Job Uptime'],
            diagramSpec: {
                nodes: [
                    { id: 'bench_in', type: 'client', label: 'Text Prompt / Image Input', subtext: 'High-Res Multi-Modal Request', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'bench_out', type: 'gpu', label: 'Generative Video AI Engine', subtext: '1080p @ 60 FPS @ 3.2 Tokens/s', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'bench_in', to: 'bench_out', label: 'Ring Attention DiT Pipeline', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-veo-pipeline-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 1080p Video AI Pipeline', '🚀 64 H100 Ring Attention', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper video frame icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};
