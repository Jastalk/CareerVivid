/**
 * generate-tiktok-omni-videos.mjs
 *
 * Generates low-cost Gemini Omni AI Video clips for:
 *   System Design: How to Design TikTok (High-Throughput Recommendation & Real-time Video Feed)
 *   Using paperCollagePromptGrammar.mjs (veo-3.1-lite-generate-001).
 *
 * Output: public/system-design-lessons/clips/sd-tiktok--<beatId>.mp4
 */

import path from 'path';
import { generateClips } from './paperCollagePromptGrammar.mjs';

const OUT_DIR = path.resolve('public/system-design-lessons/clips');

const CLIPS = {
    'sd-tiktok-intro': {
        shot: 'Locked-off medium shot, square to camera.',
        location: 'A yellowed newsprint backdrop with a paper phone at centre.',
        beats: [
            '00:00–00:03: A flat paper smartphone cut-out snaps into centre frame displaying a short video thumbnail.',
            '00:03–00:06: Paper fingers swipe up on the phone screen rapidly five times in sequence.',
            '00:06–00:08: Five new paper video cards slide up continuously without any pause. A hand-drawn black arrow curves upward beside it.',
        ],
    },
    'sd-tiktok-recommendation': {
        shot: 'Locked-off wide shot, multi-stage funnel layout.',
        location: 'A newsprint field with a large paper funnel at centre.',
        beats: [
            '00:00–00:03: A large paper funnel snaps into centre frame. Hundreds of small paper video squares float above it.',
            '00:03–00:06: The video squares pour into the top of the funnel, and three top-ranked golden video cards drop out of the bottom.',
            '00:06–00:08: A hand-drawn black checkmark scribbles beside the three golden cards.',
        ],
    },
    'sd-tiktok-counter-sharding': {
        shot: 'Locked-off medium wide shot, grid layout.',
        location: 'A newsprint backdrop with one central paper heart and fifty small paper counter boxes.',
        beats: [
            '00:00–00:03: A red paper heart cut-out snaps into centre frame. Thousands of paper like-slips pour down from above.',
            '00:03–00:06: Instead of entering one box, the slips split evenly across six small paper counter boxes in a grid.',
            '00:06–00:08: The six counter boxes flash green at once and aggregate into a total number display.',
        ],
    },
    'sd-tiktok-cdn-prefetch': {
        shot: 'Locked-off medium shot, side-on view.',
        location: 'A newsprint field with a paper server tower at the left and a paper phone at the right.',
        beats: [
            '00:00–00:03: A paper CDN edge tower snaps in at the left. A flat paper phone stands at the right.',
            '00:03–00:06: Three small paper video filmstrip chunks travel along a dotted line from the tower to pre-fill the phone.',
            '00:06–00:08: The first filmstrip lights up in mustard yellow instantly before a finger swipes.',
        ],
    },
    'sd-tiktok-storage-hybrid': {
        shot: 'Locked-off wide shot, conveyor belt layout.',
        location: 'A newsprint backdrop with a paper cutter at centre.',
        beats: [
            '00:00–00:03: A long paper video reel drops onto a flat paper conveyor belt at the left.',
            '00:03–00:06: The reel passes through a cutter, outputting 1080p, 720p, and 360p paper video variants.',
            '00:06–00:08: Older paper reels slide down into a heavy storage chest labeled COLD ARCHIVE.',
        ],
    },
    'sd-tiktok-outro': {
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
    await generateClips({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: 'sd-tiktok--',
        force: Boolean(process.env.FORCE),
    });
}

main().catch(console.error);
