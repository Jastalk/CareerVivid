/**
 * generate-tiktok-new-veo-clips.mjs
 *
 * Generates brand new, visually captivating paper-collage AI video clips for:
 *   System Design: How to Design TikTok (High-Throughput Recommendation & Real-time Video Feed)
 *   Using Veo 3.1 Lite model (`veo-3.1-lite-generate-001`) & paperCollagePromptGrammar.mjs
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
    'sd-tiktok-candidate-ann': {
        shot: 'Locked-off wide shot, vector network graph layout.',
        location: 'A newsprint field with fifty small paper dots forming a 3D-like connected web graph.',
        beats: [
            '00:00–00:03: Fifty small paper dots snap onto the backdrop, connected by hand-drawn vector lines.',
            '00:03–00:06: A magnifying glass cut-out zooms across the graph, lighting up ten golden paper nodes instantly.',
            '00:06–00:08: The ten golden nodes detach and funnel down into a neat paper queue at the bottom.',
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
    'sd-tiktok-transcoding': {
        shot: 'Locked-off wide shot, shield layout.',
        location: 'A newsprint field with a heavy paper shield at centre protecting a origin server.',
        beats: [
            '00:00–00:03: One hundred paper arrow requests fly toward a paper server from the left.',
            '00:03–00:06: A giant paper shield drops down, blocking ninety-nine arrows while allowing only one single arrow to pass through.',
            '00:06–00:08: The server returns a single golden response card that duplicates to satisfy all waiting requests.',
        ],
    },
    'sd-tiktok-storage-hybrid': {
        shot: 'Locked-off wide shot, comparison layout.',
        location: 'A newsprint backdrop split into left and right halves.',
        beats: [
            '00:00–00:03: The left side shows a paper graph web with slow pulsing lines labeled COLLABORATIVE GRAPH.',
            '00:03–00:06: The right side shows a fast paper vector array shooting golden signals into a phone labeled DENSE VECTORS.',
            '00:06–00:08: A hand-drawn star draws around the DENSE VECTORS side.',
        ],
    },
    'sd-tiktok-call-to-action': {
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
    console.log('⚡ Generating Brand-New Veo 3.1 Lite AI Video Clips for TikTok Recommendation Engine...\n');
    await generateClips({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: 'sd-tiktok--',
        force: true, // Force new generation with veo-3.1-lite-generate-001!
    });
}

main().catch(console.error);
