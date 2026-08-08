/**
 * generate-sd-api-omni-videos.mjs
 *
 * Footage for System Design episode 1 — APIs & Data Models.
 *
 * The clips this replaces carried the same three faults as episode 2's did: a
 * `a publication wordmark` wordmark burned into two corners, invented lettering where labels were
 * requested, and glossy 3D database cylinders instead of flat cut paper. All of
 * it came from a v1.0 prompt grammar that named the publication, asked the
 * model to write words, and never said "flat 2D". Those lines now live once in
 * paperCollagePromptGrammar.mjs.
 *
 * One world, used throughout: a phone, a card, a counter, a ticket. The script
 * replays the same purchase four times — once to feel the double charge, once
 * to feel the fix — and the footage should not be inventing a new place each
 * time it does.
 *
 * Output: public/system-design-lessons/clips/sd-api--<beatId>.mp4
 */

import path from 'path';
import { generateClips, contactSheet } from './paperCollagePromptGrammar.mjs';

const OUT_DIR = path.resolve('public/system-design-lessons/clips');
const PREFIX = 'sd-api--';

// Concrete, nameable objects — never abstract paper shapes.
//
// The first pass described this episode as rectangles, slips and strips, and
// five of six clips came back with invented lettering stamped across them:
// "8%", "T15%", "HOYE", "DOCKE OFF". It is the same failure as an empty banner
// inviting a title card. Given a shape with no identity, the model reaches for
// text to give it one. Name a real object and it draws the object instead —
// every clip in episode 2 that worked was a crowd, a door, a bucket or a shelf.
const CLIPS = {
    'sd-intro': {
        shot: 'Top-down flat lay, locked off, slow 8% push in.',
        location: 'A bare newsprint tabletop with a paper filing drawer at the right.',
        beats: [
            '00:00–00:03: A paper envelope drops onto the tabletop at the left and settles.',
            '00:03–00:06: More envelopes drop in and stack up. The paper filing drawer at the right slides open.',
            '00:06–00:08: The envelopes slide across into the open drawer one after another and the drawer closes.',
        ],
    },

    'sd-idempotency-story': {
        shot: 'Locked-off medium shot, centred, no camera move.',
        location: 'A newsprint field with a flat paper ticket machine at centre.',
        beats: [
            '00:00–00:02: A paper ticket machine snaps into centre frame. A paper hand reaches in from the left and presses its button.',
            '00:02–00:05: A hand-drawn black lightning scribble cracks across the machine and it jitters hard.',
            '00:05–00:08: Two identical paper tickets slide out of the machine instead of one. A hand-drawn red circle scribbles around both.',
        ],
    },

    'sd-idempotency-solution': {
        shot: 'Top-down flat lay, locked off, slow 8% push in.',
        location: 'A bare newsprint tabletop with a paper ticket lying on it.',
        beats: [
            '00:00–00:03: A paper ticket lies on the tabletop. A round rubber stamp presses down onto its corner and lifts away, leaving a mark.',
            '00:03–00:05: A second identical ticket slides in from the left and stops dead against a hand-drawn black line.',
            '00:05–00:08: The second ticket slides back out to the left. One stamped ticket remains, and a hand-drawn black checkmark scribbles above it.',
        ],
    },

    'sd-expand-contract': {
        shot: 'Locked-off medium wide shot, two filing drawers side by side.',
        location: 'A newsprint field with an old paper filing drawer at the left.',
        beats: [
            '00:00–00:03: An old paper filing drawer stands at the left. A clean new filing drawer slides in beside it.',
            '00:03–00:06: Both drawers open. Paper envelopes travel from the old drawer across into the new one, one at a time.',
            '00:06–00:08: The old drawer closes, shrinks, and slides off the left edge, leaving the new drawer alone.',
        ],
    },

    'sd-read-model': {
        shot: 'Locked-off wide shot, two zones side by side, no camera move.',
        location: 'A newsprint field with a heavy paper safe at the left and a paper conveyor belt across the right.',
        beats: [
            '00:00–00:03: A heavy paper safe with a round dial snaps into the left half. A paper conveyor belt lays itself down across the right half.',
            '00:03–00:06: The safe door opens and paper envelopes travel out onto the belt, which carries them quickly to the right.',
            '00:06–00:08: The belt speeds up while the safe stays completely still. A hand-drawn black star scribbles over the belt.',
        ],
    },

    'sd-outro': {
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
        sheetPath: path.resolve('public/system-design-lessons/clips/_sheet-api.jpg'),
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
