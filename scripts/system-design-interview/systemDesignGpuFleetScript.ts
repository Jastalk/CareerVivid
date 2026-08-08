/**
 * systemDesignGpuFleetScript.ts
 *
 * Script and Progressive Diagram Specification for:
 *   System Design: How to Design GPU Fleet Scheduling & Multi-Tenant Kubernetes Clusters
 *   (16,384 H100 GPUs, Topology-Aware Gang Scheduler, 3.2 Tbps NVLink & < 2s Preemption Recovery)
 */

export interface BeatSpec {
    id: string;
    renderer: 'VEO' | 'DIAGRAM';
    title: { en: string };
    narration: { en: string };
    metrics: string[];
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

export const GPU_FLEET_BEATS: BeatSpec[] = [
    {
        id: 'beat-1-hook',
        renderer: 'VEO',
        title: { en: 'The $500M GPU Cluster Challenge' },
        narration: {
            en: "Scheduling 16,000 H100 GPUs across multi-tenant LLM training jobs without idle fragmentation or interconnect bottlenecks is a half-billion-dollar infrastructure problem. Here is how top cloud providers design GPU fleet schedulers that hit 94% Model Flops Utilization!"
        },
        metrics: ['🚀 16,384 H100 GPUs', '📊 94.2% MFU Efficiency', '⚡ 3.2 Tbps NVLink Mesh', '⏱️ < 2s Preemption Recovery']
    },
    {
        id: 'beat-2-requirements',
        renderer: 'DIAGRAM',
        title: { en: 'GPU Cluster SLA & Technical SLA' },
        narration: {
            en: "Our scheduler must manage 16,384 H100 GPUs, guarantee topology-aware placement across 3.2 Terabit NVLink interconnect switches, provide all-or-nothing gang scheduling for 3D parallelism, and recover preempted spot jobs in under 2 seconds."
        },
        metrics: ['⚡ 16k H100 Cluster', '🌐 3.2 Tbps RoCE Mesh', '🔒 Gang Scheduler SLA', '⏱️ < 2s Spot Recovery'],
        diagramSpec: {
            nodes: [
                { id: 'job', type: 'client', label: '100B Model Pre-training Job', subtext: '2048 GPUs Requested', x: 20, y: 35, appearsAtSec: 0.5 },
                { id: 'sla', type: 'gateway', label: 'GPU Operator SLA Target', subtext: '94% MFU / Zero Bottlenecks', x: 50, y: 35, appearsAtSec: 1.5 },
                { id: 'nodes', type: 'gpu', label: '16k H100 Supercomputer Cluster', subtext: 'Infiniband / NVLink Network', x: 80, y: 35, appearsAtSec: 2.8 }
            ],
            edges: [
                { from: 'job', to: 'sla', label: 'Gang Allocation Request', appearsAtSec: 2.0 },
                { from: 'sla', to: 'nodes', label: '3.2 Tbps Direct Binding', appearsAtSec: 3.5 }
            ]
        }
    },
    {
        id: 'beat-3-naive',
        renderer: 'DIAGRAM',
        title: { en: 'Naive Asynchronous Pod Scheduling' },
        narration: {
            en: "In a standard Kubernetes cluster, the default scheduler binds pods independently across random worker nodes. GPUs are allocated asynchronously without checking physical rack switch locality or NUMA socket alignment."
        },
        metrics: ['⚠️ Asynchronous Allocation', '🌐 Cross-Rack Bottleneck', '📉 42% GPU Idle Time', '💸 $85,000 / Day Wasted'],
        diagramSpec: {
            nodes: [
                { id: 'k8s', type: 'client', label: 'Standard K8s Scheduler', subtext: 'Independent Pod Binds', x: 18, y: 50, appearsAtSec: 0.5 },
                { id: 'random', type: 'storage', label: 'Fragmented GPU Nodes', subtext: 'Separated Across Racks', x: 50, y: 50, appearsAtSec: 1.5 },
                { id: 'slow', type: 'gpu', label: 'Interconnect Bottleneck', subtext: 'Cross-Rack Latency Hikes', x: 82, y: 50, appearsAtSec: 2.5 }
            ],
            edges: [
                { from: 'k8s', to: 'random', label: 'Partial Pod Placement', appearsAtSec: 2.0 },
                { from: 'random', to: 'slow', label: '10 Gbps Ethernet Hop', appearsAtSec: 3.2 }
            ]
        }
    },
    {
        id: 'beat-4-why-breaks',
        renderer: 'DIAGRAM',
        title: { en: 'Deadlocks, NVLink Cross-Talk & Crashes' },
        narration: {
            en: "When 100 out of 1024 requested GPUs are blocked in queue, the partial job sits idle while holding reserved VRAM. Cross-rack gradient synchronization chokes network switches, reducing Model Flops Utilization from 94% down to a dismal 42%."
        },
        metrics: ['🔥 Partial Gang Deadlock', '🌐 900ms Ring AllReduce', '📉 42% MFU Crash', '💥 $85,000 Daily Waste'],
        diagramSpec: {
            nodes: [
                { id: 'partial', type: 'client', label: 'Partial Allocation Deadlock', subtext: '900 of 1024 GPUs Bound', x: 18, y: 50, appearsAtSec: 0.5 },
                { id: 'switch', type: 'scheduler', label: 'Overloaded Top-of-Rack Switch', subtext: 'Packet Drops & Packet Retries', x: 50, y: 50, appearsAtSec: 1.5 },
                { id: 'idle', type: 'vram', label: 'GPU Idle Fragmentation', subtext: 'Zero Gradient Compute', x: 82, y: 50, appearsAtSec: 2.5 }
            ],
            edges: [
                { from: 'partial', to: 'switch', label: 'AllReduce Traffic Congestion', appearsAtSec: 2.0 },
                { from: 'switch', to: 'idle', label: 'Pipeline Stale Wait', appearsAtSec: 3.2 }
            ]
        }
    },
    {
        id: 'beat-5-core-architecture',
        renderer: 'DIAGRAM',
        title: { en: 'Topology-Aware Gang Scheduling Architecture' },
        narration: {
            en: "To maximize efficiency, we engineer a custom Kubernetes GPU Operator with a Topology-Aware Gang Scheduler. It evaluates physical NVLink switch matrix trees, enforcing all-or-nothing allocation within the exact same NVSwitch fabric before binding any container."
        },
        metrics: ['🛡️ All-Or-Nothing Gang Scheduler', '🌳 NVLink Switch Topology Tree', '🚀 3.2 Tbps RoCE Interconnect', '⚡ 94.2% MFU Efficiency'],
        diagramSpec: {
            nodes: [
                { id: 'operator', type: 'gateway', label: 'GPU Operator Controller', subtext: 'Gang Queue & Topology Tree', x: 15, y: 50, appearsAtSec: 0.5 },
                { id: 'nvswitch', type: 'scheduler', label: 'NVLink Switch Matrix', subtext: '3.2 Tbps Non-Blocking Mesh', x: 45, y: 25, appearsAtSec: 1.5 },
                { id: 'gang', type: 'vram', label: 'All-Or-Nothing Reservation', subtext: 'Atomic 2048-GPU Bind', x: 45, y: 75, appearsAtSec: 2.5 },
                { id: 'h100', type: 'gpu', label: '2048 H100 Workers', subtext: 'Synchronized Model Parallel', x: 80, y: 50, appearsAtSec: 3.5 }
            ],
            edges: [
                { from: 'operator', to: 'nvswitch', label: 'Query Topology Graph', appearsAtSec: 2.0 },
                { from: 'operator', to: 'gang', label: 'Verify Atomic Availability', appearsAtSec: 3.0 },
                { from: 'gang', to: 'h100', label: 'Instantaneous Parallel Launch', appearsAtSec: 4.2 }
            ]
        }
    },
    {
        id: 'beat-6-deep-dive',
        renderer: 'DIAGRAM',
        title: { en: 'Sub-2s Preemption & Async Checkpointing' },
        narration: {
            en: "When a spot GPU instance is preempted, host agents stream weights to NVMe-oF distributed storage at 100 Gigabits per second. The gang scheduler instantly migrates state and resumes training on standby nodes in under 1.8 seconds."
        },
        metrics: ['💾 100 Gbps Checkpoint Stream', '⏱️ 1.8s Spot Resume Latency', '🛡️ NVMe-oF Distributed Fabric', '📊 99.8% Job Uptime'],
        diagramSpec: {
            nodes: [
                { id: 'preempt', type: 'vram', label: 'Spot Node Preemption', subtext: 'Hardware Drain Alert', x: 18, y: 50, appearsAtSec: 0.5 },
                { id: 'nvme', type: 'storage', label: 'NVMe-oF Fast Storage', subtext: '100 Gbps Parallel Checkpoint', x: 50, y: 50, appearsAtSec: 1.5 },
                { id: 'standby', type: 'gpu', label: 'Standby H100 Node', subtext: 'Resumes Step 14,200 in 1.8s', x: 82, y: 50, appearsAtSec: 2.8 }
            ],
            edges: [
                { from: 'preempt', to: 'nvme', label: 'Flush VRAM Snapshot', appearsAtSec: 2.0 },
                { from: 'nvme', to: 'standby', label: 'Fast Weights Reload', appearsAtSec: 3.5 }
            ]
        }
    },
    {
        id: 'beat-7-tradeoffs',
        renderer: 'DIAGRAM',
        title: { en: 'Production Efficiency & Cost ROI' },
        narration: {
            en: "Topology-aware gang scheduling increases queue hold times by 4.2 seconds on job startup, but boosts Model Flops Utilization from 42% to 94.2%, saving over 25 million dollars annually across a 16,000 GPU cluster."
        },
        metrics: ['⏱️ +4.2s Queue Wait Tradeoff', '🚀 MFU: 42% -> 94.2%', '💰 $25,000,000 / Year Saved', '🛡️ Zero NVLink Bottlenecks'],
        diagramSpec: {
            nodes: [
                { id: 'standard', type: 'vram', label: 'Standard Pod Scheduler', subtext: '42% MFU / $25M Annual Loss', x: 25, y: 50, appearsAtSec: 0.5 },
                { id: 'gangsched', type: 'gpu', label: 'Topology Gang Scheduler', subtext: '94.2% MFU / Peak Hardware ROI', x: 75, y: 50, appearsAtSec: 2.0 }
            ],
            edges: [
                { from: 'standard', to: 'gangsched', label: '52.2% MFU Efficiency Gain', appearsAtSec: 2.8 }
            ]
        }
    },
    {
        id: 'beat-8-recap-cta',
        renderer: 'VEO',
        title: { en: 'Recap & CareerVivid Practice' },
        narration: {
            en: "That is how you design a multi-tenant GPU fleet scheduler for massive LLM training clusters! If you enjoyed this system design breakdown, make sure to like and subscribe for more! Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid!"
        },
        metrics: ['🎉 16,384 H100 Cluster', '🚀 94.2% MFU Efficiency', '👍 Like & Subscribe', '💻 CareerVivid.app']
    }
];
