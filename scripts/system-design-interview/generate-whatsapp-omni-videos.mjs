/**
 * generate-whatsapp-omni-videos.mjs
 *
 * Generates low-cost Veo 3.1 Lite (veo-3.1-lite-generate-001) AI Video clips for:
 *   System Design: How to Design WhatsApp / Discord (Real-Time Messaging & WebSockets)
 *   Using paperCollagePromptGrammar.mjs (veo-3.1-lite-generate-001 @ $0.05/sec).
 *
 * Output: public/system-design-lessons/clips/sd-whatsapp--<beatId>.mp4
 */

import path from 'path';
import { generateClips } from './paperCollagePromptGrammar.mjs';

const OUT_DIR = path.resolve('public/system-design-lessons/clips');

const CLIPS = {
    'sd-whatsapp-intro': {
        shot: 'Locked-off medium shot, square to camera.',
        location: 'A yellowed newsprint backdrop with a paper phone at centre.',
        beats: [
            '00:00–00:03: A flat paper smartphone cut-out snaps into centre frame displaying a chat bubble with a single checkmark.',
            '00:03–00:06: A second paper checkmark slides in beside the first, and both checkmarks turn blue together.',
            '00:06–00:08: A hand-drawn black star scribbles beside the blue checkmarks.',
        ],
    },
    'sd-whatsapp-websockets': {
        shot: 'Locked-off medium wide shot, side-on connection view.',
        location: 'A newsprint field with a paper server tower at the left and three paper phones at the right.',
        beats: [
            '00:00–00:03: A tall paper server tower snaps into place at the left. Three paper phones stand at the right.',
            '00:03–00:06: Three bright mustard-yellow paper threads stretch from the server to each phone, holding steady.',
            '00:06–00:08: A small paper envelope travels rapidly along the top thread from server to phone.',
        ],
    },
    'sd-whatsapp-group-fanout': {
        shot: 'Locked-off wide shot, multi-branch fan-out layout.',
        location: 'A newsprint backdrop with one paper sender at the left and a cluster of twenty small paper figures at the right.',
        beats: [
            '00:00–00:03: A paper sender cut-out snaps into the left frame. A cluster of twenty small paper figures stands at the right.',
            '00:03–00:06: A single paper envelope leaves the sender, enters a paper box at centre, and splits into twenty small envelopes.',
            '00:06–00:08: The twenty envelopes travel in parallel to each figure at once. A hand-drawn black bracket scribbles around the cluster.',
        ],
    },
    'sd-whatsapp-encryption': {
        shot: 'Locked-off medium shot, centred padlock animation.',
        location: 'A newsprint field with a paper padlock at centre.',
        beats: [
            '00:00–00:03: A golden paper padlock cut-out snaps into centre frame, unlocked.',
            '00:03–00:06: A paper letter slides into the padlock and the shackle snaps down locked.',
            '00:06–00:08: A paper key travels across frame to unlock it. A hand-drawn black checkmark scribbles above.',
        ],
    },
    'sd-whatsapp-presence': {
        shot: 'Locked-off medium wide shot, pulse indicator view.',
        location: 'A newsprint field with three paper user cards in a row.',
        beats: [
            '00:00–00:03: Three paper user avatar cards snap into a row across frame.',
            '00:03–00:06: Small paper green dot indicators snap onto the corner of the first two cards, pulsing steadily.',
            '00:06–00:08: A tiny paper pulse wave line draws itself across the bottom of the cards.',
        ],
    },
    'sd-whatsapp-outro': {
        shot: 'Locked-off medium shot, centred, slow 10% push in.',
        location: 'A newsprint field with a paper doorway at centre.',
        beats: [
            '00:00–00:03: A paper doorway snaps into centre frame, closed.',
            '00:03–00:06: The door swings open, revealing a warm mustard-yellow glow behind it.',
            '00:06–00:08: A hand-drawn black checkmark scribbles itself above the doorway and hand-drawn radiating lines draw outward.',
        ],
    },
};

async function main() {
    console.log('🚀 Generating Omni Video Clips with NEW veo-3.1-lite-generate-001 model...\n');
    await generateClips({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: 'sd-whatsapp--',
        force: true,
    });
}

main().catch(console.error);
