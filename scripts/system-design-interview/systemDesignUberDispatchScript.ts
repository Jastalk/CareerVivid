/**
 * systemDesignUberDispatchScript.ts
 *
 * System Design Lesson: Uber Driver Dispatch & Real-Time Matching Engine
 */

export const UBER_DISPATCH_SCRIPT = {
    id: 'sd-uber-dispatch',
    title: 'How to Design Uber Driver Dispatch & Real-Time Matching Engine',
    beats: [
        {
            id: 'sd-uber-dispatch-intro',
            renderer: 'VEO',
            title: { en: '2M GPS Pings/sec & The Dispatch Problem' },
            narration: 'How does Uber match millions of riders with nearby drivers in sub-second time while ingesting 2 Million location pings every single second? Let us design Uber real-time dispatch at global scale.',
            conceptTags: ['2M GPS Pings/sec', 'Uber Dispatch Engine', 'Real-Time Matching'],
            metrics: ['📊 2M GPS Pings / sec', '⚡ < 100ms Match Latency', '🚗 5M Active Drivers', '🌐 15M Daily Trips'],
            veoPrompt: 'SHOT: Medium shot, fast 12 FPS stop-motion paper collage. STYLE: Premium paper-collage animation, aged yellow newsprint backdrop, halftone textures, paper cut-out taxi car, map pins, and satellite signals. Dynamic paper sliding motion. NEGATIVE: no text, no pseudo-latin, no letters.'
        },
        {
            id: 'sd-uber-dispatch-naive-vs-hungarian',
            renderer: 'DIAGRAM',
            title: { en: 'Greedy Nearest vs Bilateral Hungarian Matching' },
            narration: 'A naive greedy algorithm assigns the closest driver to the first rider, creating suboptimal global wait times and driver starvation. Uber uses batch windowing paired with the Bilateral Hungarian Algorithm to minimize total wait time across all riders.',
            conceptTags: ['Greedy vs Hungarian', 'Bilateral Optimization', 'Wait Time Minimization'],
            metrics: ['⏱️ 35% Global Wait Reduction', '📊 5s Batch Window', '🎯 99.4% Match Efficiency', '⚡ 22ms Algorithm Execution'],
            diagramSpec: {
                nodes: [
                    { id: 'riders', type: 'client', label: 'Rider Request Pool', subtext: 'Batch Window Ingress (5s)', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'hungarian_eng', type: 'gpu', label: 'Hungarian Bipartite Solver', subtext: 'Cost Matrix Weight Optimization', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'drivers', type: 'gateway', label: 'Candidate Driver Fleet', subtext: 'H3 Hexagonal Spatial Query', x: 82, y: 50, appearsAtSec: 2.5 }
                ],
                edges: [
                    { from: 'riders', to: 'hungarian_eng', label: 'Bipartite Cost Graph Request', appearsAtSec: 1.8 },
                    { from: 'hungarian_eng', to: 'drivers', label: 'Global Minimum Cost Match Pair', appearsAtSec: 3.0 }
                ]
            }
        },
        {
            id: 'sd-uber-dispatch-location-ingestion',
            renderer: 'DIAGRAM',
            title: { en: 'Location Ingestion Fleet & Ringpop Hashing' },
            narration: 'Driver mobile apps push location pings every 4 seconds over persistent WebSockets. The Ingestion Fleet hashes driver IDs across Ringpop consistent hash rings, updating in-memory spatial indexes backed by Redis Cluster shards.',
            conceptTags: ['WebSocket Ingestion', 'Ringpop Hash Ring', 'In-Memory Geo Index'],
            metrics: ['⚡ 2M Pings / sec Ingress', '🔄 4s GPS Update Frequency', '🗄️ Redis Spatial Shards', '⏱️ p99 < 12ms Ingestion'],
            diagramSpec: {
                nodes: [
                    { id: 'driver_apps', type: 'client', label: '5M Active Driver Apps', subtext: '4s GPS Location Pings', x: 15, y: 50, appearsAtSec: 0.5 },
                    { id: 'ringpop', type: 'scheduler', label: 'Ringpop Ingestion Router', subtext: 'Consistent Driver ID Hash Ring', x: 48, y: 50, appearsAtSec: 1.5 },
                    { id: 'redis_geo', type: 'vram', label: 'In-Memory Geo Index', subtext: 'H3 Spatial Sharded Redis', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'driver_apps', to: 'ringpop', label: 'Persistent WebSocket Stream', appearsAtSec: 1.8 },
                    { from: 'ringpop', to: 'redis_geo', label: 'Atomic Location Update (12ms)', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-uber-dispatch-eta-routing',
            renderer: 'DIAGRAM',
            title: { en: 'Dynamic ETA Routing & Contraction Hierarchies' },
            narration: 'Calculating exact driving distance using standard A-star search across complex city road networks is too slow. Uber pre-computes road graphs using Contraction Hierarchies, returning real-time traffic-adjusted ETAs in sub-5 milliseconds.',
            conceptTags: ['Contraction Hierarchies', 'Traffic-Adjusted ETA', 'Sub-5ms Route Search'],
            metrics: ['⏱️ < 5ms ETA Query', '🗺️ Pre-Computed Road Graph', '🚘 Real-Time Speed Adjust', '🎯 98.7% ETA Accuracy'],
            diagramSpec: {
                nodes: [
                    { id: 'match_pair', type: 'storage', label: 'Rider-Driver Match Pair', subtext: 'Raw Coordinates', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'ch_router', type: 'gpu', label: 'Contraction Hierarchy Engine', subtext: 'Shortest Path Graph Acceleration', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'eta_result', type: 'gateway', label: 'Traffic-Adjusted ETA', subtext: 'Exact Pickup Minute Calculation', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'match_pair', to: 'ch_router', label: 'Query Pickup Path', appearsAtSec: 1.8 },
                    { from: 'ch_router', to: 'eta_result', label: 'Sub-5ms Shortcut Evaluation', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-uber-dispatch-failure-modes',
            renderer: 'DIAGRAM',
            title: { en: 'Dual-Booking Race Conditions & Redlock Mutex' },
            narration: 'What breaks at scale? Simultaneous ride requests can offer the same driver to two riders at once. Uber prevents dual-booking race conditions by locking driver states using Redis Redlock distributed mutexes with automatic expiration timeouts.',
            conceptTags: ['Dual-Booking Race Condition', 'Redis Redlock Mutex', 'Distributed Lock'],
            metrics: ['🔒 Redlock Distributed Mutex', '⏱️ 2s Lock Expiration', '🛡️ Zero Double-Bookings', '⚡ 4ms Lock Acquisition'],
            diagramSpec: {
                nodes: [
                    { id: 'rider_a', type: 'client', label: 'Rider Request A', subtext: 'Simultaneous Match Attempt', x: 15, y: 35, appearsAtSec: 0.5 },
                    { id: 'rider_b', type: 'client', label: 'Rider Request B', subtext: 'Simultaneous Match Attempt', x: 15, y: 65, appearsAtSec: 0.5 },
                    { id: 'redlock', type: 'vram', label: 'Redis Redlock Manager', subtext: 'Atomic Mutex Lock Engine', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'driver_state', type: 'gateway', label: 'Driver State Ledger', subtext: 'Status: OFFERED_DISPATCH', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'rider_a', to: 'redlock', label: 'Acquire Lock (SUCCESS)', appearsAtSec: 1.8 },
                    { from: 'rider_b', to: 'redlock', label: 'Acquire Lock (DENIED)', appearsAtSec: 2.2 },
                    { from: 'redlock', to: 'driver_state', label: 'Dispatch Exclusive Offer', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-uber-dispatch-kafka-outbox',
            renderer: 'DIAGRAM',
            title: { en: 'Transactional Outbox & Trip Event Stream' },
            narration: 'Match decisions are written atomically to PostgreSQL trip tables paired with the Transactional Outbox pattern. Debezium CDC tails write-ahead logs to push match events to Kafka, guaranteeing exactly-once billing and trip analytics.',
            conceptTags: ['Transactional Outbox', 'Debezium CDC WAL', 'Kafka Event Stream'],
            metrics: ['💾 Postgres Transactional Outbox', '📨 Debezium WAL CDC', '⚡ Exactly-Once Delivery', '🛡️ 99.999% Financial Auditability'],
            diagramSpec: {
                nodes: [
                    { id: 'match_db', type: 'storage', label: 'Postgres Trip DB', subtext: 'Match Tx + Outbox Table', x: 18, y: 50, appearsAtSec: 0.5 },
                    { id: 'debezium', type: 'scheduler', label: 'Debezium CDC Engine', subtext: 'WAL Log Tailing', x: 50, y: 50, appearsAtSec: 1.5 },
                    { id: 'kafka_events', type: 'vram', label: 'Kafka Dispatch Event Bus', subtext: 'Trip Stream Topic', x: 82, y: 50, appearsAtSec: 2.8 }
                ],
                edges: [
                    { from: 'match_db', to: 'debezium', label: 'Read Write-Ahead Log Bytes', appearsAtSec: 1.8 },
                    { from: 'debezium', to: 'kafka_events', label: 'Publish Trip Dispatched Event', appearsAtSec: 3.2 }
                ]
            }
        },
        {
            id: 'sd-uber-dispatch-benchmark',
            renderer: 'DIAGRAM',
            title: { en: 'Global Scale Benchmarks' },
            narration: 'Uber real-time driver dispatch processes 2 Million GPS pings per second and matches 15 Million daily trips with sub-100 millisecond assignment latency at 99.99% system availability.',
            conceptTags: ['2M GPS Pings/sec', '15M Trips/Day', '<100ms Assignment'],
            metrics: ['📊 2M Location Pings / sec', '⚡ 15M Completed Trips / Day', '⏱️ < 100ms Match Latency', '🛡️ 99.99% Availability'],
            diagramSpec: {
                nodes: [
                    { id: 'bench_in', type: 'client', label: '2M GPS Ingest Fleet', subtext: '5M Drivers + 15M Trips', x: 25, y: 50, appearsAtSec: 0.5 },
                    { id: 'bench_out', type: 'gpu', label: 'Uber Dispatch Engine', subtext: 'Sub-100ms Match @ 99.99%', x: 75, y: 50, appearsAtSec: 2.0 }
                ],
                edges: [
                    { from: 'bench_in', to: 'bench_out', label: 'Hungarian Bipartite Pipeline', appearsAtSec: 2.8 }
                ]
            }
        },
        {
            id: 'sd-uber-dispatch-call-to-action',
            renderer: 'VEO',
            title: { en: 'Recap & CareerVivid Practice' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            conceptTags: ['Like & Subscribe', 'CareerVivid', 'System Design'],
            metrics: ['🎉 Sub-100ms Uber Match', '🚀 2M Pings/sec Scale', '👍 Like & Subscribe', '💻 CareerVivid.app'],
            veoPrompt: 'SHOT: Static wide shot, slow 10% push in. STYLE: Premium paper-collage style, vintage chalkboard newsprint, paper location pin icon and glowing checkmarks. NEGATIVE: no text, no pseudo-latin, no letters.'
        }
    ]
};
