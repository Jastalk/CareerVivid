/**
 * generate-uber-new-veo-clips.mjs
 *
 * Generates brand new, visually captivating paper-collage AI video clips for:
 *   System Design: How to Design Uber (Real-time Location & Matching)
 *   Using Veo 3.1 Lite model (`veo-3.1-lite-generate-001`) & paperCollagePromptGrammar.mjs
 *
 * Output: public/system-design-lessons/clips/sd-uber--<beatId>.mp4
 */

import path from 'path';
import { generateClips } from './paperCollagePromptGrammar.mjs';

const OUT_DIR = path.resolve('public/system-design-lessons/clips');

const CLIPS = {
    'sd-uber-intro': {
        shot: 'Locked-off medium shot, square to camera.',
        location: 'A yellowed newsprint backdrop with a paper city street map at centre.',
        beats: [
            '00:00–00:03: A paper smartphone cut-out snaps into centre frame displaying a map with a single paper taxi icon.',
            '00:03–00:06: Fifty tiny paper taxi cut-outs stream rapidly onto the paper map from all directions.',
            '00:06–00:08: A hand-drawn black vector arrow curves around the nearest paper taxi, highlighting it with a mustard yellow circle.',
        ],
    },
    'sd-uber-spatial-grid': {
        shot: 'Locked-off wide shot, top-down view.',
        location: 'A newsprint field with a large paper world globe flattened out at centre.',
        beats: [
            '00:00–00:03: A flat paper map snaps into centre frame. Hand-drawn black lines draw a grid of small hexagonal cells over the entire map.',
            '00:03–00:06: One hexagonal cell lights up in mustard yellow, and three nearby neighbor hexagons flash in muted teal.',
            '00:06–00:08: A paper car cut-out inside the yellow hexagon moves seamlessly into an adjacent cell.',
        ],
    },
    'sd-uber-gps-avalanche': {
        shot: 'Locked-off wide shot, conveyor layout.',
        location: 'A newsprint backdrop with a paper server tower at centre.',
        beats: [
            '00:00–00:03: Hundreds of small paper location pings pour down from above like a waterfall.',
            '00:03–00:06: A paper conveyor belt labeled KAFKA STREAM captures the pings and feeds them into a spinning ring buffer wheel.',
            '00:06–00:08: The ring buffer flashes green as location pings are processed continuously without spilling.',
        ],
    },
    'sd-uber-matching-lock': {
        shot: 'Locked-off medium shot, centre frame.',
        location: 'A newsprint field with a paper taxi icon between two paper rider icons.',
        beats: [
            '00:00–00:03: Two paper rider cut-outs send request arrows toward one central paper taxi at the exact same time.',
            '00:03–00:06: A heavy brass paper padlock cut-out snaps down over the taxi, locking it to the first rider.',
            '00:06–00:08: The second rider request bounces off the padlock, while the locked taxi begins moving toward rider one.',
        ],
    },
    'sd-uber-surge-pricing': {
        shot: 'Locked-off wide shot, balance scale layout.',
        location: 'A newsprint backdrop with a paper city skyline at the bottom.',
        beats: [
            '00:00–00:03: A paper crowd of 100 rider cut-outs appears on a paper city map, while only 5 paper taxis are visible.',
            '00:03–00:06: A paper price tag labeled 1.0x expands rapidly into a large red price tag labeled 2.5x SURGE.',
            '00:06–00:08: Ten additional paper taxis drive into the frame from the edges, attracted by the surge tag.',
        ],
    },
    'sd-uber-failure-modes': {
        shot: 'Locked-off medium wide shot, split layout.',
        location: 'A newsprint field with tall paper skyscraper cut-outs at the left.',
        beats: [
            '00:00–00:03: A paper car cut-out moves between tall paper skyscrapers while erratic dotted GPS lines jump wildly.',
            '00:03–00:06: A smooth hand-drawn vector curve draws over the erratic dots, smoothing the trajectory into a straight line.',
            '00:06–00:08: A hand-drawn black checkmark scribbles beside the smoothed trajectory.',
        ],
    },
    'sd-uber-benchmark': {
        shot: 'Locked-off wide shot, side-by-side comparison.',
        location: 'A newsprint backdrop split into left and right halves.',
        beats: [
            '00:00–00:03: The left side shows a grid of square paper cells labeled S2 QUADTREE.',
            '00:03–00:06: The right side shows a tight honeycomb of hexagonal paper cells labeled H3 HEXAGON.',
            '00:06–00:08: Concentric hand-drawn vector circles draw outward from the centre hexagon, illustrating equal distances to all neighbors.',
        ],
    },
    'sd-uber-call-to-action': {
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
    console.log('⚡ Generating Brand-New Veo 3.1 Lite AI Video Clips for Uber Spatial Engine...\n');
    await generateClips({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: 'sd-uber--',
        force: true, // Force generation with veo-3.1-lite-generate-001!
    });
}

main().catch(console.error);
