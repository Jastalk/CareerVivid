import { buildPrompt } from './paperCollagePromptGrammar.mjs';

export const UBER_H3_SCRIPT = {
    id: 'sd-uber-h3',
    title: 'Uber H3 Hexagonal Geospatial Indexing & Dynamic Fleet Pricing',
    slug: 'design-uber-h3',
    beats: [
        {
            id: 'b1_hook',
            renderer: 'VEO',
            title: { en: 'Section 1 · Monolith Intuition Hook' },
            narration: 'Finding nearby drivers in a ride-sharing app starts with location queries. A naive PostGIS database setup uses spatial ST_DWithin radius queries over latitude and longitude. When one million drivers update their GPS coordinates every 4 seconds, spatial index locks collapse and search latency explodes past 15 seconds.',
            metrics: ['1M GPS Pings / 4s', 'PostGIS ST_DWithin Lock', '15s Spatial Latency'],
            veoPrompt: buildPrompt({
                shot: 'A paper collage animation of a paper map with tiny car cut-outs and a growing circular red radar ring locking up over a paper database node.',
                location: 'Grid-paper background with torn edges and halftone shadows.',
                beats: [
                    '0.0s - A paper map grid appears with small car cut-outs shifting position slightly.',
                    '3.0s - A red radius circle expands slowly and locks onto a database card.',
                    '6.0s - Red warning ink squiggles draw across the map as a 15-second latency tag drops.'
                ]
            })
        },
        {
            id: 'b2_bottlenecks',
            renderer: 'DIAGRAM',
            title: { en: 'Section 2 · Scalability Bottlenecks & Distortion' },
            narration: 'Square grid indexes and S2 quadtrees suffer from edge distortion and irregular neighbor distances. Traversing diagonal neighbors in square grids covers 41% more distance than orthogonal neighbors. Uber needed a uniform discrete global grid system where every neighbor is equidistant.',
            metrics: ['Square Grid Distortion', '41% Diagonal Overhead', 'Irregular Neighbor Radius'],
            diagramSpec: {
                nodes: [
                    { id: 'driver_gps', label: '1M Driver GPS Streams', type: 'client', x: 20, y: 35, appearsAtSec: 0.2, subtext: '250,000 Updates / Sec' },
                    { id: 'postgis', label: 'PostGIS Spatial R-Tree DB', type: 'gateway', x: 50, y: 35, appearsAtSec: 1.0, subtext: 'ST_DWithin Radius Search' },
                    { id: 'lock_bottleneck', label: 'Spatial Lock Bottleneck', type: 'gpu', x: 80, y: 35, appearsAtSec: 2.2, subtext: 'Distortion & 15s Latency Spike' }
                ],
                edges: [
                    { from: 'driver_gps', to: 'postgis', label: 'Raw Lat/Lon Pings', appearsAtSec: 1.2 },
                    { from: 'postgis', to: 'lock_bottleneck', label: 'Heavy Radius Computation', appearsAtSec: 2.5 }
                ]
            }
        },
        {
            id: 'b3_protocol_p1',
            renderer: 'DIAGRAM',
            title: { en: 'Section 3 · Mechanical Protocol (Uber H3 64-bit Hexagons)' },
            narration: 'Uber solved this by creating H3, an open-source hexagonal hierarchical spatial index. Latitude and longitude are converted into a single 64-bit uint integer representing a hexagonal cell. At resolution 8, each hexagon covers 0.7 square kilometers, making neighbor traversal a simple bitwise ring offset.',
            metrics: ['Uber H3 Hexagonal Grid', '64-bit Integer Index', 'Resolution 8 (0.7 km²)'],
            diagramSpec: {
                nodes: [
                    { id: 'gps_ingest', label: 'GPS Ingestion Gateway', type: 'gateway', x: 18, y: 45, appearsAtSec: 0.2, subtext: 'High-throughput Kafka Ingest' },
                    { id: 'h3_encoder', label: 'H3 Hexagonal Encoder', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Lat/Lon -> uint64 H3 Index' },
                    { id: 'redis_spatial', label: 'Redis Sharded Spatial Store', type: 'gpu', x: 82, y: 45, appearsAtSec: 2.0, subtext: 'HSET Key = H3_Cell_ID' }
                ],
                edges: [
                    { from: 'gps_ingest', to: 'h3_encoder', label: 'Point Stream', appearsAtSec: 1.2 },
                    { from: 'h3_encoder', to: 'redis_spatial', label: 'Bitwise Ring Store', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b4_protocol_p2',
            renderer: 'DIAGRAM',
            title: { en: 'Section 4 · Dynamic Surge Pricing & Heatmap Engine' },
            narration: 'For dynamic surge pricing, spatial aggregators compute rider demand versus driver supply per H3 cell every 10 seconds. When rider requests outpace driver count in a hexagonal cell, the surge engine increments the price multiplier and propagates spatial heatmaps to nearby ring neighbors instantly.',
            metrics: ['H3 Cell Aggregator', 'Dynamic Surge Multiplier', 'k-Ring Neighbor Propagate'],
            diagramSpec: {
                nodes: [
                    { id: 'redis_spatial', label: 'Redis Spatial Cells', type: 'gpu', x: 18, y: 45, appearsAtSec: 0.2, subtext: 'Supply & Demand Counters' },
                    { id: 'surge_engine', label: 'Dynamic Surge Engine', type: 'scheduler', x: 50, y: 30, appearsAtSec: 1.0, subtext: 'Demand / Supply Ratio Calculation' },
                    { id: 'k_ring', label: 'k-Ring Neighbor Propagator', type: 'gateway', x: 50, y: 65, appearsAtSec: 1.8, subtext: 'Smooth Price Transition' },
                    { id: 'rider_app', label: 'Rider & Driver App Fleet', type: 'client', x: 82, y: 45, appearsAtSec: 2.5, subtext: 'Sub-10ms Heatmap & ETA Render' }
                ],
                edges: [
                    { from: 'redis_spatial', to: 'surge_engine', label: '10s Micro-Batch Stream', appearsAtSec: 1.2 },
                    { from: 'surge_engine', to: 'k_ring', label: 'Compute Multiplier Delta', appearsAtSec: 2.0 },
                    { from: 'k_ring', to: 'rider_app', label: 'Push H3 Heatmap Layers', appearsAtSec: 2.7 }
                ]
            }
        },
        {
            id: 'b5_failure_modes',
            renderer: 'DIAGRAM',
            title: { en: 'Section 5 · Production Failure Modes ("What Breaks?")' },
            narration: 'What breaks in production? During massive stadium events, extreme localized surge causes boundary cell thrashing, where drivers near cell edges trigger rapid price oscillations. Uber fixes this using multi-resolution H3 parent aggregation (Resolution 6/7) to smooth surge gradients across boundary zones.',
            metrics: ['Multi-Resolution H3 Aggregation', 'Res 6/7 Parent Smoothing', 'Zero Price Oscillation'],
            diagramSpec: {
                nodes: [
                    { id: 'thrash', label: 'Cell Edge Price Oscillation', type: 'client', x: 20, y: 45, appearsAtSec: 0.2, subtext: 'Stadium Event Hotspot Thrashing' },
                    { id: 'multi_res', label: 'Multi-Res H3 Parent Aggregator', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Resolution 6 & 7 Spatial Smoothing' },
                    { id: 'smooth_surge', label: 'Stable Surge Gradient', type: 'gpu', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'Fair Pricing & Driver Retention' }
                ],
                edges: [
                    { from: 'thrash', to: 'multi_res', label: 'Detect Gradient Spike', appearsAtSec: 1.2 },
                    { from: 'multi_res', to: 'smooth_surge', label: 'Apply Parent Cell Weighting', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b6_benchmarks',
            renderer: 'DIAGRAM',
            title: { en: 'Section 6 · Real-World Tech Benchmarks' },
            narration: 'Comparing spatial indexing models: Uber H3 uses 64-bit Hexagonal Indexing for uniform distance and fast k-ring neighbors. Google uses S2 Quadtrees with square cell distortion. PostgreSQL uses PostGIS Geohash strings, which require expensive string pattern matching.',
            metrics: ['Uber: H3 Hexagons (Equidistant)', 'Google: S2 Quadtrees (Square)', 'PostgreSQL: Geohash (String)'],
            diagramSpec: {
                nodes: [
                    { id: 'h3_ub', label: 'Uber H3 Hexagons', type: 'gpu', x: 20, y: 45, appearsAtSec: 0.2, subtext: 'Equidistant 64-bit uint (Sub-5ms)' },
                    { id: 's2_goog', label: 'Google S2 Quadtree', type: 'scheduler', x: 50, y: 45, appearsAtSec: 1.0, subtext: 'Hierarchical Hilbert Curves' },
                    { id: 'geohash', label: 'PostGIS Geohash String', type: 'storage', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'String Prefix Matching (High CPU)' }
                ],
                edges: [
                    { from: 'h3_ub', to: 's2_goog', label: 'Compare Distortion', appearsAtSec: 1.2 },
                    { from: 's2_goog', to: 'geohash', label: 'Compare Memory Overhead', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b7_summary',
            renderer: 'DIAGRAM',
            title: { en: 'Section 7 · Architecture Summary & Key Tradeoffs' },
            narration: 'In summary: Uber H3 converts complex geospatial math into fast 64-bit integer operations, Redis spatial sharding supports millions of location pings, and multi-resolution parent aggregation delivers smooth real-time surge pricing at global scale.',
            metrics: ['H3 64-bit Spatial Math', 'Redis Sharded Ingestion', 'Global Dynamic Surge'],
            diagramSpec: {
                nodes: [
                    { id: 'h3_s', label: '1. H3 64-bit Indexing', type: 'gateway', x: 20, y: 45, appearsAtSec: 0.2, subtext: 'Equidistant Hex Cells' },
                    { id: 'surge_s', label: '2. Real-Time Surge Engine', type: 'gpu', x: 50, y: 45, appearsAtSec: 1.0, subtext: '10s Microbatch Multipliers' },
                    { id: 'parent_s', label: '3. Multi-Res Parent Smooth', type: 'vram', x: 80, y: 45, appearsAtSec: 2.0, subtext: 'Boundary Oscillation Fix' }
                ],
                edges: [
                    { from: 'h3_s', to: 'surge_s', label: 'Bitwise Neighbor Lookup', appearsAtSec: 1.2 },
                    { from: 'surge_s', to: 'parent_s', label: 'Propagate Heatmaps', appearsAtSec: 2.2 }
                ]
            }
        },
        {
            id: 'b8_outro',
            renderer: 'VEO',
            title: { en: 'Section 8 · Mandatory Outro & Interactive Practice CTA' },
            narration: 'If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!',
            metrics: ['Like & Subscribe', '300+ Real Tech Scenarios', 'CareerVivid Interview Studio'],
            veoPrompt: buildPrompt({
                shot: 'A paper collage showing a hexagonal map grid glowing with amber surge highlights next to a crisp red subscribe paper tag.',
                location: 'Yellowed newsprint paper grid backdrop with drop shadow paper elements.',
                beats: [
                    '0.0s - A red subscribe tag drops cleanly onto a mustard paper map background.',
                    '3.0s - Paper hexagon tiles light up in sequence as hand-drawn vector arrows point toward them.',
                    '6.0s - The CareerVivid platform seal snaps into the center with yellow accent sparks.'
                ]
            })
        }
    ]
};
