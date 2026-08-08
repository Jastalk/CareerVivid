/**
 * render-llm-inference-diagrams.mjs
 *
 * Programmatic HTML/CSS/SVG progressive diagram renderer for Beats 2-7.
 * Renders 1920x1080 @ 30fps DOM animations using Playwright.
 *
 * Rules:
 *  - ALL text is real DOM typography (Inter / JetBrains Mono).
 *  - Nodes & edges build up progressively in sync with narration timestamps.
 *  - Background: clean dark slate (#0f172a / #1e293b) with paper texture at 12% opacity.
 *  - Every box is labeled with concrete metrics. Every arrow has direction & label.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';
import { LLM_INFERENCE_BEATS } from './systemDesignLlmInferenceScript.ts';
import { karaokeChunks, karaokeHTML, KARAOKE_CSS } from './karaokeSubtitles.mjs';

const FPS = 30;
const OUT_DIR = path.resolve('scratchpad/film_render_llm_inference');
const NARRATION_DIR = path.resolve('public/assets/system-design-narration/sd-llm-inference/en/chirp-fenrir');

fs.mkdirSync(OUT_DIR, { recursive: true });

function getAudioDuration(filePath) {
    if (!fs.existsSync(filePath)) return 8.0;
    try {
        const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf8' });
        return parseFloat(out.trim()) || 8.0;
    } catch {
        return 8.0;
    }
}

function buildDiagramHTML(beat, durationSec, currentTimeMs) {
    const spec = beat.diagramSpec || { nodes: [], edges: [] };
    const currentTimeSec = currentTimeMs / 1000;
    const caps = karaokeHTML(karaokeChunks(beat.narration, durationSec), durationSec);

    const nodeIcons = {
        client: '💻',
        gateway: '⚡',
        scheduler: '🔄',
        gpu: '🚀',
        vram: '🗄️',
        storage: '💾'
    };

    const nodeColors = {
        client: { bg: 'rgba(30, 58, 138, 0.85)', border: '#3b82f6', text: '#93c5fd' },
        gateway: { bg: 'rgba(120, 53, 15, 0.85)', border: '#f59e0b', text: '#fde047' },
        scheduler: { bg: 'rgba(6, 78, 59, 0.85)', border: '#10b981', text: '#6ee7b7' },
        gpu: { bg: 'rgba(131, 24, 67, 0.85)', border: '#ec4899', text: '#f472b6' },
        vram: { bg: 'rgba(88, 28, 135, 0.85)', border: '#a855f7', text: '#e9d5ff' },
        storage: { bg: 'rgba(31, 41, 55, 0.85)', border: '#6b7280', text: '#d1d5db' },
    };

    let nodesHTML = '';
    for (const node of spec.nodes) {
        const isVisible = currentTimeSec >= node.appearsAtSec;
        const opacity = isVisible ? Math.min((currentTimeSec - node.appearsAtSec) / 0.4, 1) : 0;
        const scale = isVisible ? Math.min(0.8 + (currentTimeSec - node.appearsAtSec) * 0.5, 1) : 0.8;
        const style = nodeColors[node.type] || nodeColors.gpu;

        nodesHTML += `
        <div class="node-box" style="
            left: ${node.x}%; top: ${node.y}%;
            opacity: ${opacity}; transform: translate(-50%, -50%) scale(${scale});
            background: ${style.bg}; border: 2px solid ${style.border}; color: ${style.text};
        ">
            <div class="node-header">
                <span class="node-icon">${nodeIcons[node.type] || '📦'}</span>
                <span class="node-title">${node.label}</span>
            </div>
            ${node.subtext ? `<div class="node-subtext">${node.subtext}</div>` : ''}
        </div>
        `;
    }

    let edgesSVG = '';
    for (const edge of spec.edges) {
        const isVisible = currentTimeSec >= edge.appearsAtSec;
        if (!isVisible) continue;

        const fromNode = spec.nodes.find(n => n.id === edge.from);
        const toNode = spec.nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) continue;

        const progress = Math.min((currentTimeSec - edge.appearsAtSec) / 0.5, 1);
        const x1 = (fromNode.x / 100) * 1920;
        const y1 = (fromNode.y / 100) * 1080;
        const targetX = (toNode.x / 100) * 1920;
        const targetY = (toNode.y / 100) * 1080;

        const x2 = x1 + (targetX - x1) * progress;
        const y2 = y1 + (targetY - y1) * progress;
        const midX = (x1 + targetX) / 2;
        const midY = (y1 + targetY) / 2 - 25;

        edgesSVG += `
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#38bdf8" stroke-width="4" stroke-dasharray="8 4"/>
        <circle cx="${x2}" cy="${y2}" r="6" fill="#38bdf8"/>
        ${progress > 0.5 ? `
        <rect x="${midX - 110}" y="${midY - 16}" width="220" height="32" rx="16" fill="rgba(15, 23, 42, 0.95)" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="${midX}" y="${midY + 5}" text-anchor="middle" fill="#7dd3fc" font-size="14" font-weight="700">${edge.label}</text>
        ` : ''}
        `;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8"/>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                width: 1920px; height: 1080px;
                background: #090d16;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", sans-serif;
                color: #ffffff;
                position: relative;
                overflow: hidden;
            }
            .bg-texture {
                position: absolute; inset: 0;
                background-image: radial-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px);
                background-size: 32px 32px;
                opacity: 0.15;
            }
            .top-bar {
                position: absolute; top: 40px; left: 60px; right: 60px;
                display: flex; justify-space-between; align-items: center;
                z-index: 50;
            }
            .beat-title-badge {
                background: rgba(15, 23, 42, 0.92);
                border: 2px solid #38bdf8;
                padding: 12px 28px; border-radius: 30px;
                font-weight: 800; font-size: 24px; color: #38bdf8;
                box-shadow: 0 10px 30px rgba(0,0,0,0.7);
            }
            .brand-badge {
                background: rgba(15, 23, 42, 0.92);
                border: 1px solid #334155;
                padding: 10px 24px; border-radius: 20px;
                font-size: 18px; font-weight: 700; color: #94a3b8;
            }
            .metrics-rail {
                position: absolute; bottom: 120px; left: 60px; right: 60px;
                display: flex; gap: 16px; flex-wrap: wrap;
                z-index: 50;
            }
            .metric-pill {
                background: rgba(15, 23, 42, 0.90);
                border: 1.5px solid #10b981;
                padding: 8px 18px; border-radius: 12px;
                font-size: 16px; font-weight: 700; color: #34d399;
                box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            }
            .diagram-container {
                position: absolute; inset: 0;
                z-index: 20;
            }
            .node-box {
                position: absolute;
                min-width: 260px; padding: 20px 24px;
                border-radius: 20px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.6);
                backdrop-filter: blur(12px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .node-header {
                display: flex; align-items: center; gap: 12px;
                margin-bottom: 8px;
            }
            .node-icon { font-size: 24px; }
            .node-title { font-size: 20px; font-weight: 800; letter-spacing: -0.2px; }
            .node-subtext { font-size: 15px; font-weight: 600; opacity: 0.9; font-family: "JetBrains Mono", monospace; }

            svg.edge-canvas {
                position: absolute; inset: 0;
                width: 1920px; height: 1080px;
                z-index: 10; pointer-events: none;
            }
        ${KARAOKE_CSS}
        ${caps.css}
        </style>
    </head>
    <body>
        <div class="bg-texture"></div>
        <div class="top-bar">
            <div class="beat-title-badge">${beat.title.en}</div>
            <div class="brand-badge">CareerVivid System Design · Programmatic Diagram</div>
        </div>

        <svg class="edge-canvas">
            ${edgesSVG}
        </svg>

        <div class="diagram-container">
            ${nodesHTML}
        </div>

        <div class="metrics-rail">
            ${beat.metrics.map(m => `<div class="metric-pill">📊 ${m}</div>`).join('')}
        </div>

        <div class="caps">${caps.html}</div>
    </body>
    </html>
    `;
}

async function renderDiagrams() {
    console.log('🎨 Programmatic Diagram Renderer starting for Beats 2-7...\n');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    for (const beat of LLM_INFERENCE_BEATS) {
        if (beat.renderer !== 'DIAGRAM') continue;

        const audioPath = path.join(NARRATION_DIR, `${beat.id}.wav`);
        const durationSec = getAudioDuration(audioPath);
        const frameCount = Math.ceil(durationSec * FPS);
        const beatFramesDir = path.join(OUT_DIR, `frames_${beat.id}`);

        console.log(`🎬 Rendering Progressive Diagram for ${beat.id} (${durationSec.toFixed(1)}s, ${frameCount} frames)...`);
        fs.rmSync(beatFramesDir, { recursive: true, force: true });
        fs.mkdirSync(beatFramesDir, { recursive: true });

        for (let f = 0; f < frameCount; f++) {
            const currentTimeMs = (f / FPS) * 1000;
            const html = buildDiagramHTML(beat, durationSec, currentTimeMs);
            await page.setContent(html, { waitUntil: 'load' });

            const framePath = path.join(beatFramesDir, `f${String(f).padStart(5, '0')}.png`);
            await page.screenshot({ path: framePath, type: 'png', timeout: 0 });
        }

        console.log(`   ✅ Rendered ${frameCount} frames for ${beat.id}`);
    }

    await browser.close();
    console.log('\n🎉 Programmatic Diagram Rendering Complete!');
}

renderDiagrams().catch(console.error);
