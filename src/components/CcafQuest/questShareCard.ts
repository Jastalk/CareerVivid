/**
 * Draws the course-completion card and hands back a PNG.
 *
 * Painted on a plain 2D canvas rather than screenshotting the DOM: no extra
 * dependency, no font-loading race, and the output is a fixed 1200×630 — the
 * size link previews expect, so a shared card actually renders as an image
 * rather than a cropped guess.
 */

export interface ShareCardData {
    title: string;
    seal: string;
    missions: number;
    xp: number;
    perfect: number;
    labels: { missions: string; xp: string; perfect: string };
    domains: { order: number; name: string; weight: number }[];
}

const WIDTH = 1200;
const HEIGHT = 630;

const PALETTE = ['#ffd166', '#7c74e0', '#1d9e75', '#f5871f', '#e5645f'];

/** Deterministic, so the same run always produces the same card. */
const seeded = (n: number) => {
    const x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
};

export const drawShareCard = (data: ShareCardData): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Backdrop
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, '#1a1410');
    bg.addColorStop(0.55, '#0f0d0a');
    bg.addColorStop(1, '#140f1c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // A scatter of embers, so the card is not a flat rectangle.
    for (let i = 0; i < 70; i += 1) {
        const x = seeded(i) * WIDTH;
        const y = seeded(i + 50) * HEIGHT;
        const r = 0.6 + seeded(i + 100) * 1.9;
        ctx.globalAlpha = 0.1 + seeded(i + 150) * 0.35;
        ctx.fillStyle = PALETTE[i % PALETTE.length];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Warm glow behind the headline
    const glow = ctx.createRadialGradient(WIDTH / 2, 210, 10, WIDTH / 2, 210, 420);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.20)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#ffd166';
    ctx.font = '700 22px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('CLAUDE CERTIFIED ARCHITECT · FOUNDATIONS', WIDTH / 2, 96);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 76px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText(data.title, WIDTH / 2, 190);

    // Stats
    const stats = [
        { value: String(data.missions), label: data.labels.missions },
        { value: data.xp.toLocaleString(), label: data.labels.xp },
        { value: `${data.perfect}%`, label: data.labels.perfect },
    ];
    stats.forEach((stat, i) => {
        const x = WIDTH / 2 + (i - 1) * 240;
        ctx.fillStyle = '#ffd166';
        ctx.font = '800 58px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(stat.value, x, 300);
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(stat.label.toUpperCase(), x, 328);
    });

    // Five district chips, evenly spread
    const chipY = 410;
    const chipW = 200;
    const gap = 16;
    const totalW = data.domains.length * chipW + (data.domains.length - 1) * gap;
    let x = (WIDTH - totalW) / 2;
    for (const [i, domain] of data.domains.entries()) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeStyle = `${PALETTE[i % PALETTE.length]}66`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, chipY, chipW, 70, 14);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = PALETTE[i % PALETTE.length];
        ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(`D${domain.order} · ${domain.weight}%`, x + 16, chipY + 27);

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
        // Long district names get clipped rather than spilling out of the chip.
        let name = domain.name;
        while (ctx.measureText(name).width > chipW - 32 && name.length > 4) {
            name = `${name.slice(0, -2)}…`;
        }
        ctx.fillText(name, x + 16, chipY + 50);

        ctx.textAlign = 'center';
        x += chipW + gap;
    }

    // Seal
    ctx.strokeStyle = '#1d9e75';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(WIDTH / 2 - 150, 528, 300, 48, 12);
    ctx.stroke();
    ctx.fillStyle = '#1d9e75';
    ctx.font = '800 19px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(data.seal.toUpperCase(), WIDTH / 2, 559);

    return canvas;
};

/** Triggers a download of the drawn card. */
export const downloadShareCard = (data: ShareCardData, filename = 'ccaf-complete.png') => {
    const canvas = drawShareCard(data);
    canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        // Revoking immediately can cancel the download in some browsers.
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, 'image/png');
};
