/**
 * generate-designx-omni-videos.mjs
 *
 * Footage for the Design X series. Episode: Design Uber.
 *
 * Every shot is a concrete, nameable object — a paper map, a pin, a card, a
 * crowd. Never "a paper rectangle" or "a flat strip": given a shape with no
 * identity the model invents lettering to give it one, which is how earlier
 * batches came back stamped with `8%`, `HOYE` and `DOCKE OFF`.
 *
 * One world throughout, as the script requires: a map, pins on it, a phone, a
 * crowd of people. No new metaphor per section.
 *
 * Output: public/system-design-lessons/clips/dx-uber--<clipId>.mp4
 */

import path from 'path';
import { generateClips, contactSheet } from './paperCollagePromptGrammar.mjs';

const OUT_DIR = path.resolve('public/system-design-lessons/clips');
const PREFIX = 'dx-uber--';

const CLIPS = {
    'phone-map': {
        shot: 'Top-down flat lay, locked off, slow 8% push in.',
        location: 'A bare newsprint tabletop with a folded paper street map opening at centre.',
        beats: [
            '00:00–00:03: A folded paper street map drops onto the tabletop and unfolds flat across the frame.',
            '00:03–00:06: A single paper pin drops onto the map at the left and sticks. A second paper pin of a different colour drops onto the right side.',
            '00:06–00:08: A hand-drawn black dotted line draws itself between the two pins.',
        ],
    },

    'counter-tick': {
        shot: 'Locked-off medium wide shot, square to camera.',
        location: 'A newsprint field with a paper street map at centre covered in small paper pins.',
        beats: [
            '00:00–00:03: A paper street map sits at centre with a scatter of small paper pins on it.',
            '00:03–00:06: Many more pins drop onto the map in rapid succession until it is densely covered, and every pin jitters in place at once.',
            '00:06–00:08: The pins all shift a short distance together, then jitter again. Hand-drawn black speed lines scribble across the frame.',
        ],
    },

    'boxes-assemble': {
        shot: 'Locked-off wide shot, three objects in a row, no camera move.',
        location: 'A newsprint field, empty at the start.',
        beats: [
            '00:00–00:03: A paper filing drawer slides in from the left and settles. A paper envelope drops into it.',
            '00:03–00:06: A round paper dial snaps into the centre of frame. A small paper folder slides in at the right.',
            '00:06–00:08: Hand-drawn black arrows draw themselves from the drawer to the dial, and from the dial to the folder.',
        ],
    },

    // "A dense web of lines" across a map read as a tangle with nothing to
    // hold onto. Counting the pins one at a time says the same thing — this is
    // too much work — and is a concrete action rather than an abstract mesh.
    'map-scan': {
        shot: 'Top-down flat lay on a map, locked off, slow 6% push in.',
        location: 'A paper street map filling the frame, covered with small paper pins.',
        beats: [
            '00:00–00:03: A paper street map covered in small paper pins. One larger red pin drops in at centre.',
            '00:03–00:06: A hand-drawn black circle draws itself around each pin in turn, one after another, working across the whole map.',
            '00:06–00:08: Circles keep appearing faster until nearly every pin has one. A hand-drawn black cross stamps over the map.',
        ],
    },

    'grid-cells': {
        shot: 'Top-down flat lay on a map, locked off, slow 6% push in.',
        location: 'A paper street map filling the frame, covered with small paper pins.',
        beats: [
            '00:00–00:03: A paper street map covered in pins. Hand-drawn black lines draw themselves across it, dividing the map into a grid of squares.',
            '00:03–00:06: One larger red pin drops into a square near the centre. That square and the eight squares touching it lift slightly and brighten; the rest of the map dims.',
            '00:06–00:08: Short hand-drawn black lines draw from the red pin to only the few pins inside those nine squares. A hand-drawn checkmark scribbles beside them.',
        ],
    },

    // A crowd packing into one square and glowing red is crowd-crush imagery and
    // was rejected every time. Pins piling into one grid square carry the same
    // meaning — everything landed in one place — with no people in it at all.
    'crowd-one-cell': {
        shot: 'Top-down flat lay on a map, locked off, no camera move.',
        location: 'A paper street map divided into a grid of squares by hand-drawn black lines.',
        beats: [
            '00:00–00:03: A paper street map divided into squares by hand-drawn black lines, with a few paper pins spread evenly across it.',
            '00:03–00:06: A large number of paper pins drop rapidly into one single square until it is completely full and pins spill over its edges.',
            '00:06–00:08: That one square turns deep red while every other square stays pale and empty. Hand-drawn black lines scribble around the full square.',
        ],
    },

    'outro-door': {
        shot: 'Locked-off medium shot, centred, slow 10% push in.',
        location: 'A newsprint field with a paper doorway at centre.',
        beats: [
            '00:00–00:03: A paper doorway snaps into centre frame, closed.',
            '00:03–00:06: The door swings open, revealing a warm mustard-yellow glow behind it.',
            '00:06–00:08: A hand-drawn black checkmark scribbles itself above the doorway and hand-drawn radiating lines draw outward from it.',
        ],
    },
};

const args = process.argv.slice(2);

if (args.includes('--sheet')) {
    contactSheet({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: PREFIX,
        sheetPath: path.resolve('public/system-design-lessons/clips/_sheet-designx.jpg'),
    });
} else {
    await generateClips({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: PREFIX,
        only: args.filter(a => !a.startsWith('-')),
        force: Boolean(process.env.FORCE),
    });
}
