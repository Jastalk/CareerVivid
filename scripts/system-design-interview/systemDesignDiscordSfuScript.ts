/**
 * systemDesignDiscordSfuScript.ts
 *
 * System Design Lesson: Discord Real-Time Voice Engine & SFU Media Fleet
 */

export const DISCORD_SFU_SCRIPT = {
    id: 'sd-discord-sfu',
    title: 'How to Design Discord Real-Time Voice Engine & SFU Media Fleet',
    beats: [
        {
            id: 'sd-discord-sfu-intro',
            renderer: 'VEO',
            title: { en: '15M Voice Channels & The SFU Problem' },
            narration: 'How does Discord handle 15 Million concurrent voice channels without frying server CPUs or introducing audio lag? Let us design Discord Selective Forwarding Unit media fleets at scale.',
            conceptTags: ['15M Voice Channels', 'Discord SFU', 'WebRTC Engine'],
            metrics: ['📊 15M Voice Channels', '⚡ < 30ms Audio Latency', '🎛️ Opus 48kHz Codec', '🌐 200+ Media Edge POPs'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged yellow newsprint backdrop, halftone textures, paper cut-out microphone, soundwaves, and router gateway. Dynamic paper sliding motion. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-discord-sfu-mcu-vs-sfu',
            renderer: 'DIAGRAM',
            title: { en: 'MCU vs SFU Architecture Bottlenecks' },
            narration: 'Traditional Multipoint Control Units re-encode and mix audio streams on the server, causing high CPU bottlenecking under scale. Discord instead routes raw Opus encrypted audio packets through a Selective Forwarding Unit, offloading mixing directly to client audio engines.',
            conceptTags: ['MCU vs SFU', 'Zero Server Audio Mixing', 'Opus Packet Forwarding'],
            metrics: ['⚡ 90% CPU Power Savings', '🗄️ 48kHz Opus Codec', '⏱️ 8ms Server Processing', '🎯 100% End-to-End Encryption'],
            diagramSpec: {
                nodes: [
                    { id: 'speaker', type: 'client', label: 'Audio Speaker Client', subtext: 'Opus Encrypted Packets', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'sfu_node', type: 'gateway', label: 'Discord SFU Media Server', subtext: 'Selective Forwarding Routing', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'listeners', type: 'gpu', label: '100+ Channel Listeners', subtext: 'Client-Side Audio Mixing', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'speaker', to: 'sfu_node', label: 'UDP / SRTP Stream', appearsAtSec: 1.8 },
                    { from: 'sfu_node', to: 'listeners', label: 'Zero-Copy Fan-Out Packets', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-discord-sfu-gateway-webrtc',
            renderer: 'DIAGRAM',
            title: { en: 'RTC Gateway & Ring-Buffer Fan-Out' },
            narration: 'When a user joins a voice channel, the RTC Gateway assigns an optimal SFU server via consistent hashing. Audio streams enter a lock-free C++ ring buffer, fanning out packets to thousands of listeners with sub-20 millisecond server propagation.',
            conceptTags: ['RTC Gateway', 'Consistent Hash Ring', 'Lock-Free Ring Buffer'],
            metrics: ['⏱️ < 20ms Propagation', '🔄 Lock-Free C++ Ring Buffer', '🌐 10Gbps Edge Interfaces', '🎯 99.999% Packet Delivery'],
            diagramSpec: {
                nodes: [
                    { id: 'rtc_gw', type: 'scheduler', label: 'RTC Voice Gateway', subtext: 'Elixir Hash Ring Manager', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'ring_buffer', type: 'vram', label: 'C++ Lock-Free Ring Buffer', subtext: 'High-Throughput Packet Queue', x: 48, y: 50, appearsAtSec: 1.5 },
                    { id: 'sfu_fleet', type: 'storage', label: 'SFU Edge Fleet', subtext: 'Distributed UDP Packet Sockets', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'rtc_gw', to: 'ring_buffer', label: 'Session Connection Token', appearsAtSec: 1.8 },
                    { from: 'ring_buffer', to: 'sfu_fleet', label: 'Sub-20ms UDP Fan-Out', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-discord-sfu-jitter-nack',
            renderer: 'DIAGRAM',
            title: { en: 'Dynamic Audio Jitter Buffer & NACK Retries' },
            narration: 'UDP packet loss degrades voice clarity over shaky Wi-Fi networks. Discord SFUs dynamically adjust client jitter buffer depths and deploy selective NACK retries alongside Forward Error Correction to reconstruct lost frames without audio clicks.',
            conceptTags: ['Dynamic Jitter Buffer', 'NACK Packet Retries', 'FEC Error Recovery'],
            metrics: ['📊 15% Packet Loss Recovery', '⏱️ 40ms Jitter Window', '🎛️ Opus In-Band FEC', '📉 < 0.05% Audio Drop Rate'],
            diagramSpec: {
                nodes: [
                    { id: 'lossy_net', type: 'client', label: 'Wi-Fi Client Connection', subtext: '15% Packet Loss Drop Rate', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'fec_engine', type: 'gpu', label: 'Opus FEC & NACK Receiver', subtext: 'Adaptive Jitter Buffer Engine', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'clean_audio', type: 'gateway', label: 'Reconstructed Audio Buffer', subtext: 'Click-Free 48kHz Audio Stream', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'lossy_net', to: 'fec_engine', label: 'Lossy UDP Stream + NACK', appearsAtSec: 1.8 },
                    { from: 'fec_engine', to: 'clean_audio', label: 'Reconstructed Opus Frames', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-discord-sfu-failure-modes',
            renderer: 'DIAGRAM',
            title: { en: 'SFU Crash Failover & Zero-Drop Re-Anchoring' },
            narration: 'What breaks at scale? An SFU server crash disconnects 10,000 voice users simultaneously. Discord solves this by persisting session states in Rust-backed memory stores, allowing RTC Gateways to seamlessly re-anchor streams in under 50 milliseconds.',
            conceptTags: ['SFU Crash Failover', 'Rust Memory State', 'Sub-50ms Re-Anchoring'],
            metrics: ['🛡️ Sub-50ms Re-Anchor', '💾 Rust Shared Memory Store', '⚡ 10k Reconnected Users/sec', '🌐 Zero Audio Call Drop'],
            diagramSpec: {
                nodes: [
                    { id: 'dead_sfu', type: 'storage', label: 'Failed SFU Instance', subtext: 'Process Crash Event', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'rust_store', type: 'vram', label: 'Rust Shared Memory State', subtext: 'Persistent Session Key Vault', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'new_sfu', type: 'scheduler', label: 'Backup SFU Instance', subtext: 'Instant Session Hydration', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'dead_sfu', to: 'rust_store', label: 'Health Check Timeout Alert', appearsAtSec: 1.8 },
                    { from: 'rust_store', to: 'new_sfu', label: 'Sub-50ms Session Failover', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-discord-sfu-edge-routing',
            renderer: 'DIAGRAM',
            title: { en: 'Global Anycast UDP Edge Routing' },
            narration: 'Global voice latency is minimized by routing packets through Anycast UDP BGP nodes. Trans-continental voice traffic travels across private fiber backbones rather than congested public internet routes.',
            conceptTags: ['Anycast BGP UDP', 'Private Fiber Backbone', 'Sub-40ms Global Latency'],
            metrics: ['🌐 200+ Anycast POPs', '⏱️ < 40ms Global RTT', '⚡ 100Gbps Private Fiber', '📊 99.99% Edge Uptime'],
            diagramSpec: {
                nodes: [
                    { id: 'global_client', type: 'client', label: 'Global Voice User', subtext: 'Europe / Asia Client', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'anycast_pop', type: 'gateway', label: 'Anycast Edge POP Node', subtext: 'BGP Routing Acceleration', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'sfu_cluster', type: 'gpu', label: 'Core SFU Server Fleet', subtext: 'Direct Fiber Transit Backbone', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'global_client', to: 'anycast_pop', label: 'Nearest BGP POP Entry', appearsAtSec: 1.8 },
                    { from: 'anycast_pop', to: 'sfu_cluster', label: 'Low-Latency Fiber Tunnel', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-discord-sfu-benchmark',
            renderer: 'DIAGRAM',
            title: { en: 'Production Scale Benchmarks' },
            narration: 'Discord SFU media fleets maintain 15 Million active voice channels with sub-30 millisecond global audio latency, processing over 1 Trillion daily voice packets at 99.999% operational uptime.',
            conceptTags: ['15M Voice Channels', '1T Packets/Day', '<30ms Latency'],
            metrics: ['📊 15M Voice Channels', '⚡ 1 Trillion Packets / Day', '⏱️ < 30ms Audio RTT', '🛡️ 99.999% SLA Uptime'],
            diagramSpec: {
                nodes: [
                    { id: 'bench_in', type: 'client', label: '15M Voice Channels', subtext: '1 Trillion UDP Packets / Day', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'bench_out', type: 'gpu', label: 'Discord SFU Media Fleet', subtext: 'Sub-30ms RTT @ 99.999% Uptime', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'bench_in', to: 'bench_out', label: 'Zero-Copy UDP Routing', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-discord-sfu-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 Sub-30ms Discord SFU', '🚀 15M Voice Channels', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper sound wave icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};
