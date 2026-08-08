import { buildPrompt } from './paperCollagePromptGrammar.mjs';

export const OPENAI_REALTIME_SCRIPT = {
    id: 'sd-openai-realtime',
    title: 'OpenAI Realtime Voice WebRTC Gateway & Audio Streaming Architecture',
    slug: 'design-openai-realtime',
    beats: [
        {
            id: 'b1_hook',
            renderer: 'VEO',
            title: { en: 'Section 1 · Monolith Intuition Hook' },
            narration: 'Traditional voice AI pipelines process speech sequentially: HTTP audio upload to Speech-to-Text, text generation through an LLM, and final Speech Synthesis download. This cascading HTTP architecture creates over two thousand milliseconds of latency, making real-time human conversation impossible.',
            metrics: ['2,500ms HTTP Latency', 'Half-Duplex Cascade', 'Sequential Pipeline'],
            veoPrompt: buildPrompt({
                shot: 'A paper-collage animation showing three paper blocks representing STT, LLM, and TTS linked sequentially, with slow stopwatches above each block.',
                location: 'Aged newsprint grid background with subtle shadow depth.',
                beats: [
                    '0.0s - A paper microphone card pushes an audio packet into a slow paper STT block.',
                    '3.0s - A red hand-drawn arrow draws slowly toward the LLM text block as a timer ticks up.',
                    '6.0s - The final TTS block produces an audio wave with a large 2,500ms warning tag.'
                ]
            })
        },
        {
            id: 'b2_bottlenecks',
            renderer: 'DIAGRAM',
            title: { en: 'Section 2 · Scalability Bottlenecks & Turn-Taking' },
            narration: 'The core bottleneck is half-duplex turn-taking and context re-processing. If a user interrupts mid-sentence, traditional pipelines fail to truncate generated tokens, burning VRAM on discarded responses while adding audio frame buffer jitter across edge network hops.',
            metrics: ['Half-Duplex Overhead', 'Context Re-Processing', 'VRAM Waste on Interrupts'],
            diagramSpec: {
                nodes: [
                    { id: 'user', label: 'Mobile Audio Stream', type: 'client', x: 20, y: 35, appearsAtSec: 0.2, subtext: 'Opus Codec over UDP' },
                    { id: 'http_gateway', label: 'HTTP REST Cascade', type: 'gateway', x: 50, y: 35, appearsAtSec: 1.0, subtext: 'STT -> LLM -> TTS' },
                    { id: 'latency_wall', label: '2,500ms Latency Bottleneck', type: 'gpu', x: 80, y: 35, appearsAtSec: 2.2, subtext: 'Interruption Rejection & Buffer Jitter' }
                ],
                edges: [
                    { from: 'user', to: 'http_gateway', label: 'Audio Chunks (20ms)', appearsAtSec: 1.2 },
                    { from: 'http_gateway', to: 'latency_wall', label: 'Sequential Execution', appearsAtSec: 2.5 }
                ]
            }
        },
        {
            id: 'b3_protocol_p1',
            renderer: 'DIAGRAM',
            title: { en: 'Section 3 · Mechanical Protocol (WebRTC SFU & Audio Tokenizer)' },
            narration: 'OpenAI Realtime eliminates latency by establishing a full-duplex WebRTC channel via a Media Gateway Fleet. Audio frames pass directly into a neural audio tokenizer that streams continuous multi-modal tokens straight to the LLM inference cluster with FlashAttention 3 and KV-cache prefix reuse.',
            metrics: ['WebRTC SFU Gateway', 'Continuous Neural Tokenizer', 'FlashAttention 3 KV-Cache'],
            diagramSpec: {
                nodes: [
                    { id: 'webrtc', label: 'WebRTC SFU Edge Gateway', type: 'gateway', x: 18, y: 45, appearsAtSec: 0.2, subtext: 'Sub-30ms SRTP Ingestion' },
                    { id: 'tokenizer', label: 'Neural Audio Tokenizer', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Audio-to-Token Frame Embed' },
                    { id: 'llm_cluster', label: 'LLM Multi-Modal Engine', type: 'gpu', x: 82, y: 45, appearsAtSec: 2.0, subtext: 'Prefix Cache & Speculative Decoding' }
                ],
                edges: [
                    { from: 'webrtc', to: 'tokenizer', label: 'Raw Opus PCM Streams', appearsAtSec: 1.2 },
                    { from: 'tokenizer', to: 'llm_cluster', label: 'Continuous Token Stream', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b4_protocol_p2',
            renderer: 'DIAGRAM',
            title: { en: 'Section 4 · VAD Interruption Engine & Audio Streaming' },
            narration: 'For sub-300ms turn-taking, an inline Voice Activity Detection (VAD) neural network monitors the incoming stream. When user speech is detected mid-response, the VAD engine immediately dispatches a hard cancellation signal to the GPU cluster, purging un-synthesized tokens and halting audio frame playback instantly.',
            metrics: ['Inline VAD Network', '< 300ms Interruption', 'Instant KV Token Purge'],
            diagramSpec: {
                nodes: [
                    { id: 'vad', label: 'Inline Neural VAD Engine', type: 'scheduler', x: 18, y: 45, appearsAtSec: 0.2, subtext: 'Continuous Energy Monitoring' },
                    { id: 'cancel_bus', label: 'Hard Cancellation Bus', type: 'gateway', x: 50, y: 30, appearsAtSec: 1.0, subtext: 'Sub-10ms Purge Interrupt' },
                    { id: 'gpu_fleet', label: 'H100 GPU Inference Fleet', type: 'gpu', x: 50, y: 65, appearsAtSec: 1.8, subtext: 'Token Stream Abort & Truncate' },
                    { id: 'client_audio', label: 'Client Speaker Out', type: 'client', x: 82, y: 45, appearsAtSec: 2.5, subtext: 'Smooth Opus Audio Playback' }
                ],
                edges: [
                    { from: 'vad', to: 'cancel_bus', label: 'Speech Speech Detected', appearsAtSec: 1.2 },
                    { from: 'cancel_bus', to: 'gpu_fleet', label: 'Purge Un-sent KV Tokens', appearsAtSec: 2.0 },
                    { from: 'gpu_fleet', to: 'client_audio', label: 'Stream Synthesized Opus (20ms)', appearsAtSec: 2.7 }
                ]
            }
        },
        {
            id: 'b5_failure_modes',
            renderer: 'DIAGRAM',
            title: { en: 'Section 5 · Production Failure Modes ("What Breaks?")' },
            narration: 'What breaks in production? Under high network jitter or packet loss, out-of-order UDP audio packets cause Robotic Voice artifacts. The media layer uses Packet Loss Concealment (PLC) algorithms and dynamic jitter buffer sizing to interpolate missing audio frames without stalling the LLM engine.',
            metrics: ['Packet Loss Concealment', 'Dynamic Jitter Buffer', 'Zero Audio Stutter'],
            diagramSpec: {
                nodes: [
                    { id: 'udp_loss', label: 'UDP Packet Loss & Jitter', type: 'client', x: 20, y: 45, appearsAtSec: 0.2, subtext: '15% Network Frame Drop' },
                    { id: 'plc_engine', label: 'Packet Loss Concealment (PLC)', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Frame Interpolation & Buffer Sizing' },
                    { id: 'clean_stream', label: 'Clean Audio Output', type: 'gpu', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'Glitch-Free Voice Experience' }
                ],
                edges: [
                    { from: 'udp_loss', to: 'plc_engine', label: 'Detect Out-of-Order Frames', appearsAtSec: 1.2 },
                    { from: 'plc_engine', to: 'clean_stream', label: 'Synthesize Missing PCM Frames', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b6_benchmarks',
            renderer: 'DIAGRAM',
            title: { en: 'Section 6 · Real-World Tech Benchmarks' },
            narration: 'Comparing voice AI architectures: OpenAI Realtime uses WebRTC SFU and end-to-end multi-modal tokens for 280ms response latency. ElevenLabs Conversational AI uses WebSocket text streaming with 600ms latency. Standard Speech API cascades hover near 2,500ms.',
            metrics: ['OpenAI: 280ms WebRTC', 'ElevenLabs: 600ms WS', 'Standard Cascade: 2,500ms'],
            diagramSpec: {
                nodes: [
                    { id: 'openai', label: 'OpenAI Realtime WebRTC', type: 'gpu', x: 20, y: 45, appearsAtSec: 0.2, subtext: 'End-to-End Multi-Modal (280ms)' },
                    { id: 'elevenlabs', label: 'ElevenLabs Conversational', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'WebSocket Text Streaming (600ms)' },
                    { id: 'cascade', label: 'Standard STT-LLM Cascade', type: 'storage', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'Sequential REST Pipeline (2500ms)' }
                ],
                edges: [
                    { from: 'openai', to: 'elevenlabs', label: 'Compare Token Latency', appearsAtSec: 1.2 },
                    { from: 'elevenlabs', to: 'cascade', label: 'Compare Protocol Overhead', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b7_summary',
            renderer: 'DIAGRAM',
            title: { en: 'Section 7 · Architecture Summary & Key Tradeoffs' },
            narration: 'In summary: WebRTC gateways deliver sub-30ms audio frame ingestion, neural audio tokenization removes STT text bottlenecks, inline VAD enables instantaneous interruption, and PLC guarantees high-fidelity voice even over unstable mobile networks.',
            metrics: ['WebRTC Audio Ingestion', 'Instant VAD Interrupts', '280ms E2E Latency'],
            diagramSpec: {
                nodes: [
                    { id: 'webrtc_s', label: '1. WebRTC SFU Ingest', type: 'gateway', x: 20, y: 45, appearsAtSec: 0.2, subtext: 'Full-duplex UDP Streaming' },
                    { id: 'vad_s', label: '2. Neural VAD Interrupt', type: 'gpu', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Sub-300ms Truncation' },
                    { id: 'plc_s', label: '3. PLC Audio Output', type: 'vram', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'Low-latency Opus Playback' }
                ],
                edges: [
                    { from: 'webrtc_s', to: 'vad_s', label: 'Realtime Control Loop', appearsAtSec: 1.2 },
                    { from: 'vad_s', to: 'plc_s', label: 'Synthesized Frame Delivery', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b8_outro',
            renderer: 'VEO',
            title: { en: 'Section 8 · Mandatory Outro & Interactive Practice CTA' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            metrics: ['Like & Subscribe', '300+ Real Tech Questions', 'CareerVivid Learning Hub'],
            veoPrompt: buildPrompt({
                shot: 'A paper collage composition displaying a paper headset node glowing with soundwaves, next to a large red subscribe button cut-out.',
                location: 'Off-white textured paper grid backdrop with drop shadow cut-outs.',
                beats: [
                    '0.0s - A red subscribe tag drops cleanly onto a mustard-yellow paper card.',
                    '3.0s - Hand-drawn vector soundwaves pulse outward as a paper thumbs-up icon stamps into view.',
                    '6.0s - The CareerVivid platform seal slides centrally with vibrant gold accent sparks.'
                ]
            })
        }
    ]
};
