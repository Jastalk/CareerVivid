/**
 * generate-domain1-omni-videos.mjs
 *
 * Generates the Vox paper-collage footage bed for Domain 1 using Gemini Omni
 * (Veo) on Vertex AI.
 *
 * Two things are worth knowing before editing this file.
 *
 * 1. Use Veo 3.1 Lite for every new clip. Query the model catalog before
 *    changing the default; do not probe availability by submitting generation
 *    requests because successful requests are billable.
 *
 * 2. Veo cannot write text. The prompt grammar forbids it on purpose, because
 *    what it produces instead is convincing-looking gibberish. Nothing that has
 *    to be *read* — stop_reason, tool_use, max_tokens, the 问题/解法/本质 cards —
 *    can come from here. Those live in the overlay layer, in real DOM text.
 *    This script only makes the world the words sit in.
 *
 * Domain 1 has 45 beats but only 31 distinct visual ideas: a metaphor beat and
 * the term beat that lands it share one shot, so the picture holds while the
 * explanation arrives. CLIP_FOR maps the other 14 onto their source.
 *
 * Output: public/ccaf-lessons/clips/d1--<clipId>.mp4
 * Resumable: an existing file is skipped unless FORCE=1.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';

const OUT_DIR = path.resolve('public/ccaf-lessons/clips');
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL = 'veo-3.1-lite-generate-001';
const DURATION = 8;

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });

/**
 * The house style, repeated verbatim in every prompt.
 *
 * Veo drifts toward glossy 3D and cinematic camera moves within a couple of
 * seconds unless the style is restated in full each time; a shared prefix is
 * cheaper to keep consistent than thirty-one hand-written variants.
 *
 * This is the Vox documentary-explainer look, named ingredient by ingredient.
 * Call it that in conversation and in the docs — it is the name of the genre.
 * Do not put the word in the prompt. Two runs settle it:
 *
 *   ingredients only, no publication named   31 clips, 0 with lettering
 *   "Vox-style …" restored in front of them   5 clips, 3 with lettering
 *
 * and the three were not subtle — one was a full-frame VOX wordmark, one had
 * "VO" a third of the frame high. The word makes the model draw letters, and
 * letters are the one thing that can never be in this footage: everything
 * readable belongs to the overlay layer. The ingredient checklist gets the look
 * on its own, which is what the reference guide says to do anyway — a precise
 * list does more work than a style adjective.
 */
const STYLE = 'Documentary paper-collage explainer animation. Aged off-white newsprint / grid-paper backdrop, faintly yellowed, with faint printed grid lines, light photocopy artifacts, slight grain and a soft vignette at the edges. All cut-outs are halftone or duotone, with crisp torn outlines and visible slightly-shifting drop shadows, so each reads as a physical piece of paper resting on the scene. Hand-drawn black vector scribbles — arrows, circles, stars, squiggles — draw themselves onto the frame in real time to point at whatever is being shown. Limited palette: black ink, mustard yellow, muted teal, one accent red. Stop-motion cadence at 12 frames per second: snappy frame-by-frame repositioning with intentional paper jitter, no eased interpolation. Entirely flat 2D cut-paper animation — never live-action footage, never a filmed person or place.';

const LIGHTING = 'Flat, even studio light, warm 3400K, no hard shadows, soft vignette at the frame edges.';

/**
 * Text is requested off explicitly rather than merely negative-constrained.
 * Veo renders letterforms unreliably; asked for words under pressure it emits
 * confident gibberish. Everything the viewer must read is real DOM text in the
 * overlay layer instead — see build-domain1-film-v3.mjs.
 */
const TEXT = 'TEXT: No on-screen text in this clip. Do not write any words, letters, numbers, labels or captions anywhere in frame.';

const NEGATIVE = 'Negative Constraints: no text, no letters, no numbers, no words, no captions, no signage, no logos, no watermarks, no brand marks, no channel idents, no corner bugs, no camera shake, no motion blur, no eased digital interpolation, no 3D glossy render, no photorealism, no lens flare, no human faces in close-up.';

/**
 * SHOT + LOCATION + timestamped ACTION beats per clip. Style, lighting, text
 * rule and constraints are appended automatically.
 *
 * Three beats, not one paragraph. A static frame in this register reads as a
 * mistake rather than a style, so something has to change roughly every two
 * seconds; writing the change times explicitly is what gets that, because left
 * to itself the model spends the clip easing one slow move. Each beat also
 * describes the frame *assembling itself* — cut-outs sliding in and snapping
 * into place — rather than a camera drifting over a finished picture.
 */
const CLIPS = {
    'buried-in-paper': {
        shot: 'Locked-off medium wide shot, very slow 8% push in across the full 8 seconds.',
        location: 'An empty newsprint field with a single small paper desk at centre.',
        beats: [
            '00:00–00:03: Frame opens nearly empty. A small flat paper cut-out figure and a desk snap into place at centre. Two sheets of paper slide in from the left edge and land beside the desk.',
            '00:03–00:06: Sheets slide in fast from all four edges in quick succession and stack into a rising pile around the figure, each landing with a hard paper snap.',
            '00:06–00:08: The pile surges up past the figure\'s shoulders until only its head shows. A hand-drawn black spiral scribbles itself above the head.',
        ],
    },
    // The most stubborn shot in the film. As a map with a path and flags it came
    // back as live-action travel footage twice; as an unfolding strip with
    // markers along it, the model read the strip as a banner and filled it with
    // a giant invented word — with the no-text rule stated twice in the prompt.
    // Anything long, horizontal and empty invites lettering. Five separate
    // stacking objects give it nowhere to write.
    roadmap: {
        shot: 'Top-down flat lay on a tabletop, locked off, slow 6% push in.',
        location: 'A bare newsprint tabletop, empty at the start.',
        beats: [
            '00:00–00:02: A single paper folder drops flat onto the tabletop at the left and settles.',
            '00:02–00:05: Four more paper folders drop in one at a time to its right, each a different colour, forming a row of five evenly spaced folders.',
            '00:05–00:08: A hand-drawn black arrow draws itself from each folder to the next along the row, and a hand-drawn circle scribbles around the first folder.',
        ],
    },
    'one-turn': {
        shot: 'Locked-off medium shot, centred, no camera move.',
        location: 'A plain newsprint field, empty at the start.',
        beats: [
            '00:00–00:02: A flat rectangular paper machine slides up from the bottom edge and snaps into centre frame.',
            '00:02–00:05: A paper envelope slides in fast from the left and disappears into the machine. The machine sits completely still. A hand-drawn arrow draws itself pointing into the machine.',
            '00:05–00:08: A different paper envelope, a different colour, slides out of the machine to the right and off frame. A second hand-drawn arrow draws itself pointing out.',
        ],
    },
    'the-loop': {
        shot: 'Locked-off medium shot, centred.',
        location: 'A plain newsprint field with a small paper machine at centre.',
        beats: [
            '00:00–00:02: A small paper machine snaps into centre frame. A thick hand-drawn black arrow begins drawing a closed circle around it.',
            '00:02–00:05: The circle completes. A paper envelope travels around the circle, passes through the machine, and comes out the other side.',
            '00:05–00:08: The envelope goes around a second time, faster, then a third time faster still. The circle never breaks.',
        ],
    },
    'two-limits': {
        shot: 'Locked-off medium wide shot, two objects side by side, no camera move.',
        location: 'A plain newsprint field split into left and right halves.',
        beats: [
            '00:00–00:02: A tall paper jar snaps into the left half. A paper tap snaps into the right half.',
            '00:02–00:05: Paper discs drop into the jar and stack up fast until it is completely full and one disc bounces off the rim. Meanwhile the tap releases slow separate drops.',
            '00:05–00:08: The tap stops abruptly mid-drip. A hand-drawn black cross scribbles over the overflowing jar; a hand-drawn circle scribbles around the stopped tap.',
        ],
    },
    hire: {
        shot: 'Locked-off wide shot, slow 8% pull back across the full 8 seconds.',
        location: 'An empty newsprint field with one paper desk at centre.',
        beats: [
            '00:00–00:02: A single paper desk with a small paper figure sits alone at centre, jittering faintly.',
            '00:02–00:05: Three more paper desks slide in from the edges and snap into place around it, each with its own figure.',
            '00:05–00:08: Eight further desks snap in rapidly to complete a full grid filling the frame. A hand-drawn bracket scribbles itself around the whole grid.',
        ],
    },
    'the-trade': {
        shot: 'Locked-off wide shot, centred, no camera move.',
        location: 'A plain newsprint field with one tall stack of paper at centre.',
        beats: [
            '00:00–00:02: One tall stack of paper sheets stands at centre. It wobbles, then splits into four smaller stacks that slide outward.',
            '00:02–00:05: The four split again into twelve small separate stacks that spread across the frame and settle.',
            '00:05–00:08: Flat paper walls rise up fast between the stacks, boxing each one off from the others. Nothing crosses the walls. Hand-drawn black cross marks scribble over three of the gaps.',
        ],
    },
    'no-brakes': {
        shot: 'Locked-off medium shot, static camera, subject travels left to right.',
        location: 'A paper slope running down from the upper left to the lower right of a newsprint field.',
        beats: [
            '00:00–00:02: A paper slope lays itself down across the frame. A paper cart snaps onto it at the top left and begins to roll.',
            '00:02–00:05: The cart gathers speed down the slope. A hand-drawn black circle draws itself around the empty spot on the cart where a brake lever should be.',
            '00:05–00:08: The cart accelerates hard and rolls straight off the right edge of frame. Hand-drawn speed lines scribble in behind where it was.',
        ],
    },
    kettle: {
        shot: 'Locked-off medium shot on a closed door, no camera move.',
        location: 'A flat paper door filling most of a newsprint field, closed.',
        beats: [
            '00:00–00:02: A flat paper door snaps into frame, closed. Everything is still.',
            '00:02–00:05: Curls of white paper steam push out through the gap at the bottom of the door and rise.',
            '00:05–00:08: Three hand-drawn black sound-arcs pulse outward from the door in sequence, each larger than the last. The door never opens.',
        ],
    },
    'blank-letters': {
        shot: 'Locked-off flat lay, three objects in a row, no camera move.',
        location: 'A bare newsprint tabletop.',
        beats: [
            '00:00–00:02: Three paper envelopes drop into a row and land with a snap.',
            '00:02–00:06: Each envelope unfolds open in turn, left to right, revealing a completely blank sheet inside. A hand-drawn question-mark squiggle scribbles above each as it opens.',
            '00:06–00:08: All three fold shut at once with a hard snap and jitter in place.',
        ],
    },
    // Twice rejected while the garments hung from something. Laid flat and
    // seen from above they pass — the hanging silhouette was the problem, not
    // the coats. Three distinct objects is all the shot has to say.
    'three-coats': {
        shot: 'Top-down flat lay, three objects in a row, no camera move.',
        location: 'A bare newsprint tabletop.',
        beats: [
            '00:00–00:02: A hand-drawn black baseline draws itself across the tabletop.',
            '00:02–00:06: Three flat paper jacket cut-outs drop onto the tabletop in a row, left to right, lying flat and face-up — each a different colour and a different outline, each landing with a jitter.',
            '00:06–00:08: All three shift once together. A hand-drawn black bracket scribbles itself under the row.',
        ],
    },

    queue: {
        shot: 'Locked-off wide shot, profile view, subjects in a line, no camera move.',
        location: 'A newsprint field with a paper doorway at the left edge.',
        beats: [
            '00:00–00:02: A paper doorway snaps into the left of frame. Small flat paper figures slide in fast from the right and form a single-file queue facing it.',
            '00:02–00:05: The figure at the front steps through the doorway and vanishes. The whole queue shuffles up one place with a snap.',
            '00:05–00:08: This repeats twice more, faster each time. A hand-drawn black arrow draws itself along the queue toward the door.',
        ],
    },
    'note-in-hand': {
        shot: 'Locked-off close shot on a hand, centred, no camera move.',
        location: 'A plain newsprint field, empty at the start.',
        beats: [
            '00:00–00:02: A flat paper hand rises into frame from the bottom edge, open and empty.',
            '00:02–00:05: A single small paper note drops into the open palm and settles.',
            '00:05–00:08: The paper fingers close around the note and hold completely still. A hand-drawn black circle draws itself around the closed hand.',
        ],
    },
    proofread: {
        shot: 'Top-down flat lay on a single sheet, slow 8% push in.',
        location: 'A paper page lying flat on a newsprint tabletop, covered in rows of plain grey printed bars standing in for lines of writing.',
        beats: [
            '00:00–00:02: The page drops flat onto the tabletop and settles.',
            '00:02–00:06: A red ink pen tip enters from the top right and strikes quick red correction marks across three of the grey bars, one after another, each with a snap.',
            '00:06–00:08: The pen exits frame. A hand-drawn red circle draws itself around the middle correction mark.',
        ],
    },
    'script-vs-goal': {
        shot: 'Locked-off wide shot, split composition, two halves, no camera move.',
        location: 'A newsprint field divided down the middle by a torn paper seam.',
        beats: [
            '00:00–00:03: On the left half, a rigid paper rail track lays itself down in one straight line and a paper cart snaps onto it.',
            '00:03–00:06: The cart runs the full length of the rail and stops dead at the end. On the right half, a paper compass snaps in and its needle swings.',
            '00:06–00:08: The needle settles pointing at a paper flag, and a hand-drawn black dotted curved path draws itself from the compass to the flag.',
        ],
    },
    // Twice rejected as concentric rings plus a centre dot — the filter reads
    // that shape as a shooting target no matter how it is worded. Switched
    // metaphor entirely: a route on a map to a planted flag says "goal, not
    // script" just as well, and carries none of the baggage.
    brief: {
        shot: 'Top-down flat lay, locked off, no camera move.',
        location: 'A bare newsprint tabletop.',
        beats: [
            '00:00–00:02: A closed paper folder drops onto the tabletop and opens flat with a snap.',
            '00:02–00:05: A small paper map slides onto the left page and a paper checklist card slides onto the right page. A paper flag plants itself upright at one corner of the map.',
            '00:05–00:08: A hand-drawn black dotted route draws itself across the map from the checklist to the base of the flag, ending in a scribbled circle around it.',
        ],
    },

    dominoes: {
        shot: 'Locked-off wide shot, side-on, subjects filling the lower third, no camera move.',
        location: 'A newsprint field with a flat paper ground line.',
        beats: [
            '00:00–00:02: A long row of standing paper dominoes snaps into place across the frame, one section at a time, left to right.',
            '00:02–00:05: The leftmost domino tips and the fall travels along the row in one continuous cascade.',
            '00:05–00:08: The cascade reaches the right edge and the last domino knocks a small paper cup clean off the frame. Hand-drawn black impact lines scribble in at the point of contact.',
        ],
    },
    'ice-baking': {
        shot: 'Locked-off medium wide shot, two objects side by side, no camera move.',
        location: 'A newsprint field split into left and right halves.',
        beats: [
            '00:00–00:02: A paper ice cube in a paper tray snaps into the left half. A closed paper oven snaps into the right half.',
            '00:02–00:05: The oven door swings open and hand-drawn heat lines rise from it. The ice cube shrinks in stages into a flat puddle shape.',
            '00:05–00:08: A hand-drawn black arrow draws itself from the oven back to the puddle, then a heavy red cross stamps down over the arrow with a snap.',
        ],
    },
    'washing-machines': {
        shot: 'Locked-off wide shot, grid layout, slow 6% pull back.',
        location: 'An empty newsprint field.',
        beats: [
            '00:00–00:03: Paper washing machines snap into a four-by-three grid one at a time, in fast succession.',
            '00:03–00:06: Once all twelve are placed, every drum door begins rotating at once, each at a slightly different speed.',
            '00:06–00:08: Hand-drawn black vibration lines scribble in around the whole grid and the machines jitter together.',
        ],
    },
    canyon: {
        shot: 'Locked-off wide shot, deep space, two cliff edges, no camera move.',
        location: 'Two paper cliff edges facing each other across a wide empty gap on a newsprint field.',
        beats: [
            '00:00–00:02: Two paper cliff edges slide in from opposite sides and settle, leaving a wide empty gap between them. A small paper figure snaps onto the left cliff.',
            '00:02–00:05: A hand-drawn black sound-arc travels from the figure out across the gap and reaches the far side faintly.',
            '00:05–00:08: A second arc travels less far and a third dissolves halfway across the gap. The figure stays still.',
        ],
    },
    handover: {
        shot: 'Locked-off medium shot, two figures facing each other, no camera move.',
        location: 'A newsprint field with a paper door at the left edge.',
        beats: [
            '00:00–00:02: Two paper figures snap into frame facing each other. The left one holds a thick paper folder.',
            '00:02–00:05: The folder passes across from the left figure to the right figure, who takes it and holds it still.',
            '00:05–00:08: The left figure slides out through the paper door, which swings shut behind it with a snap. A hand-drawn black line draws itself down the closed door.',
        ],
    },
    // Reworded after a safety-filter rejection: a raised arm pointing at
    // something reads badly out of context. The reaching gesture carries the
    // same meaning — both figures indicate the same object — without it.
    'two-witnesses': {
        shot: 'Locked-off wide shot, symmetrical composition, no camera move.',
        location: 'A newsprint field with a single paper card at centre.',
        beats: [
            '00:00–00:02: A single paper card snaps into centre frame. Two paper figures slide in from opposite edges and settle facing it.',
            '00:02–00:05: Each figure extends a paper arm down toward the card. Two hand-drawn black lines draw themselves from each figure toward the card.',
            '00:05–00:08: The two lines meet at the card and a paper checkmark stamps down over the meeting point with a snap.',
        ],
    },
    'two-numbers': {
        shot: 'Locked-off close shot, centred on one object, no camera move.',
        location: 'A plain newsprint field.',
        beats: [
            '00:00–00:02: A single blank paper box snaps into centre frame.',
            '00:02–00:05: Two blank paper tags on strings drop down onto it from above, one from the left and one from the right. They swing and settle at noticeably different heights.',
            '00:05–00:08: A hand-drawn red zigzag scribbles itself in the space between the two tags, and both tags jitter.',
        ],
    },
    // Reworded after a safety-filter rejection: "evidence bag" plus "seal" put
    // the shot in a forensic register the filter dislikes. A pouch, a sticker
    // and a label card make the same picture.
    'evidence-bag': {
        shot: 'Top-down flat lay, locked off, slow 8% push in.',
        location: 'A bare newsprint tabletop.',
        beats: [
            '00:00–00:02: An open paper pouch drops flat onto the tabletop. A small paper shape slides in from the left.',
            '00:02–00:05: The shape slides into the pouch and the pouch folds shut over it. A round paper sticker presses onto the flap with a hard snap.',
            '00:05–00:08: A blank paper label card on a string drops onto the pouch and settles. A hand-drawn black circle draws itself around the sticker.',
        ],
    },
    'burst-pipes': {
        shot: 'Locked-off wide shot, a network of pipes filling the frame, no camera move.',
        location: 'A newsprint field.',
        beats: [
            '00:00–00:02: A branching network of flat paper pipes draws itself across the frame, section by section.',
            '00:02–00:05: Paper segments visibly swell as pressure builds. The first joint bursts, throwing out a spray of hand-drawn blue ink scribbles.',
            '00:05–00:08: Two more joints burst in quick succession with bigger blue ink sprays. The whole network jitters hard.',
        ],
    },
    holiday: {
        shot: 'Locked-off medium shot on a doorway, static camera.',
        location: 'A closed paper door on a newsprint field, with a flat paper floor.',
        beats: [
            '00:00–00:02: A closed paper door snaps into frame. A paper suitcase slides in from the left and stops beside it.',
            '00:02–00:05: Paper envelopes begin dropping onto the floor in front of the door, one at a time, piling up.',
            '00:05–00:08: The envelopes fall faster into a tall untidy heap that spills sideways past the frame edge.',
        ],
    },
    corrupted: {
        shot: 'Top-down flat lay on a single sheet, locked off, no camera move.',
        location: 'A clean paper document lying flat on a newsprint tabletop.',
        beats: [
            '00:00–00:02: A clean paper document lies flat and still, jittering faintly.',
            '00:02–00:05: A tear rips across its middle with a snap and the two halves shift out of alignment.',
            '00:05–00:08: Grey halftone smudges bleed across the torn edge and small paper fragments flake off and drift away from the frame.',
        ],
    },
    checkpoint: {
        shot: 'Locked-off medium wide shot, two zones, no camera move.',
        location: 'A newsprint field with flat paper ground at centre and a paper drawer unit at the right.',
        beats: [
            '00:00–00:02: A paper flag drives itself down into the ground at centre with a hard snap and holds.',
            '00:02–00:05: A paper drawer slides open on the right. A duplicate copy of the flag slides across into the drawer.',
            '00:05–00:08: The drawer closes and a paper seal stamps onto its front. A hand-drawn black checkmark scribbles over the seal.',
        ],
    },
    'burnt-dishes': {
        shot: 'Top-down flat lay, three objects in a row, no camera move.',
        location: 'A bare newsprint tabletop.',
        beats: [
            '00:00–00:02: Three clean paper plates drop into a row and settle.',
            '00:02–00:06: Onto each plate in turn, a charred black paper shape drops hard, each with a puff of hand-drawn grey ink smoke.',
            '00:06–00:08: All three plates jitter together and a hand-drawn black bracket scribbles itself under the row.',
        ],
    },
    'thirteen-doors': {
        shot: 'Locked-off wide shot, grid layout, slow 8% push in.',
        location: 'A flat paper wall covered in a grid of small closed paper doors.',
        beats: [
            '00:00–00:02: A flat paper wall of small closed doors snaps into frame, row by row.',
            '00:02–00:06: The doors swing open one after another in a sweeping order across the grid, each revealing a plain warm mustard glow behind it.',
            '00:06–00:08: The final doors open together and the whole wall of glow pulses once.',
        ],
    },
    outro: {
        shot: 'Locked-off medium shot, centred, slow 10% push in.',
        location: 'A large closed paper door at centre frame on a newsprint field.',
        beats: [
            '00:00–00:02: A large paper door stands closed at centre. A small paper figure slides up into frame from the bottom edge.',
            '00:02–00:05: The door swings open toward camera, revealing a wide warm mustard-yellow glow behind it.',
            '00:05–00:08: The figure walks into the doorway and stops at the threshold, silhouetted against the light. Hand-drawn black radiating lines scribble outward from the doorway.',
        ],
    },
};

/**
 * beat id → clip id. A beat missing from this map uses a clip of its own name.
 * The 14 entries here are term beats reusing the shot of the metaphor that set
 * them up, so the picture holds while the definition lands.
 */
export const CLIP_FOR = {
    'open-buried': 'buried-in-paper',
    // Not its own shot. Six generations of a roadmap came back either as
    // live-action travel footage or as a torn-paper banner filled with an
    // invented word — "IDO.OQ!", "RELIF" — because anything long, horizontal
    // and empty reads to the model as a title card, no matter how many times
    // the prompt forbids lettering. The door wall says the same thing anyway:
    // a chapter behind each one. The film now opens on them closed and ends
    // with them open.
    roadmap: 'thirteen-doors',
    'what-is-a-turn': 'one-turn',
    'term-what-comes-back': 'one-turn',
    'why-a-loop-exists': 'the-loop',
    'term-why-a-loop': 'the-loop',
    'two-different-limits': 'two-limits',
    'term-two-limits': 'two-limits',
    'why-hire-at-all': 'hire',
    'the-trade': 'the-trade',
    'term-whose-field': 'the-trade',
    'no-brakes': 'no-brakes',
    'kettle-whistle': 'kettle',
    'stop-reason': 'kettle',
    'three-blank-letters': 'blank-letters',
    'three-coats': 'three-coats',
    'queue-of-helpers': 'queue',
    'note-in-your-hand': 'note-in-hand',
    'dont-delegate': 'queue',
    'proofreading-pass': 'proofread',
    'three-passes': 'proofread',
    'script-vs-goal': 'script-vs-goal',
    'directions-vs-destination': 'script-vs-goal',
    'brief-with-goals': 'brief',
    dominoes: 'dominoes',
    'ice-before-baking': 'ice-baking',
    'forced-first': 'dominoes',
    'twelve-washing-machines': 'washing-machines',
    'twelve-at-once': 'washing-machines',
    'canyon-shout': 'canyon',
    'shift-handover': 'handover',
    'no-inheritance': 'handover',
    'two-witnesses': 'two-witnesses',
    'two-numbers': 'two-numbers',
    'evidence-bag': 'evidence-bag',
    'citation-id': 'evidence-bag',
    'burst-pipes': 'burst-pipes',
    'back-from-holiday': 'holiday',
    'tell-it-what-changed': 'holiday',
    'corrupted-autosave': 'corrupted',
    checkpoint: 'checkpoint',
    'three-burnt-dishes': 'burnt-dishes',
    'three-hundred': 'burnt-dishes',
    'thirteen-doors': 'thirteen-doors',
    'go-find-out': 'outro',
};

export const clipPathFor = (beatId) => {
    const clip = CLIP_FOR[beatId];
    return clip ? path.join(OUT_DIR, `d1--${clip}.mp4`) : null;
};

/** The six dimensions Veo reads as distinct instructions, in its own order. */
const promptFor = (id) => `SHOT: ${CLIPS[id].shot}
STYLE: ${STYLE}
LIGHTING: ${LIGHTING}
LOCATION: ${CLIPS[id].location}
ACTION — timestamped beats:
${CLIPS[id].beats.join('\n')}
${TEXT}
${NEGATIVE}
Output: ${DURATION}s, 720p, 16:9.`;

/** Veo returns an operation; it is done when it says so, typically in 60–120s. */
async function poll(operation) {
    let op = operation;
    for (let attempt = 0; !op.done; attempt++) {
        if (attempt >= 90) throw new Error('timed out waiting for the video operation');
        await new Promise(r => setTimeout(r, 5000));
        op = await ai.operations.getVideosOperation({ operation: op });
        process.stdout.write('.');
    }
    return op;
}

/**
 * Tiles one frame from every clip on disk into a single contact sheet.
 *
 * The watermark problem described above is stochastic — half the pilot run was
 * clean — so it cannot be caught by spot-checking one clip. A pixel heuristic
 * would confuse a logo with the grid lines that are meant to be there. Looking
 * at all thirty-one at once costs nothing and actually works.
 */
function contactSheet() {
    const files = Object.keys(CLIPS)
        .map(id => ({ id, file: path.join(OUT_DIR, `d1--${id}.mp4`) }))
        .filter(c => fs.existsSync(c.file));

    if (!files.length) return console.log('no clips on disk yet');

    const sheet = path.join(OUT_DIR, '_contact-sheet.jpg');
    const inputs = files.map(c => `-i "${c.file}"`).join(' ');
    // Frame 40 rather than 0: the first frames are often still an empty
    // background, and a mark that fades in would be missed.
    const chain = files
        .map((_, i) => `[${i}:v]select='eq(n\\,40)',scale=480:270,setsar=1[t${i}]`)
        .join(';');
    const cols = 4;
    const rows = Math.ceil(files.length / cols);
    const tile = files.map((_, i) => `[t${i}]`).join('') + `xstack=inputs=${files.length}:layout=` +
        files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join('|') + '[out]';

    try {
        execSync(`ffmpeg -y ${inputs} -filter_complex "${chain};${tile}" -map "[out]" -frames:v 1 "${sheet}"`, { stdio: 'pipe' });
        console.log(`contact sheet: ${sheet}  (${files.length} clips, ${cols}x${rows})`);
        files.forEach((c, i) => console.log(`  r${Math.floor(i / cols) + 1}c${(i % cols) + 1}  ${c.id}`));
    } catch (error) {
        console.error('contact sheet failed:', String(error.message).slice(0, 200));
    }
}

/**
 * Asks Vertex which Veo models this project can actually call.
 *
 * This lists the catalog without starting a billable generation request.
 */
async function probe() {
    const page = await ai.models.list();
    const models = [];
    for await (const model of page) models.push(model);
    const names = models.map((model) => model.name ?? model).filter((name) => String(name).includes('veo'));
    console.log(`available Veo models for ${PROJECT}/${LOCATION}:`);
    names.forEach((name) => console.log(`  ${name}`));
}

async function main() {
    if (process.argv.includes('--sheet')) return contactSheet();
    if (process.argv.includes('--probe')) return probe();

    const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
    const ids = only.length ? only : Object.keys(CLIPS);

    const missing = ids.filter(id => !CLIPS[id]);
    if (missing.length) throw new Error(`unknown clip id: ${missing.join(', ')}`);

    const todo = ids.filter(id => process.env.FORCE || !fs.existsSync(path.join(OUT_DIR, `d1--${id}.mp4`)));

    console.log(`🎥 Domain 1 · Gemini Omni footage (${MODEL})`);
    console.log(`   ${ids.length} clips requested, ${ids.length - todo.length} already on disk, ${todo.length} to generate`);
    console.log(`   ${todo.length * DURATION}s of Veo 3.1 to bill\n`);

    let made = 0;
    const failed = [];

    for (const [i, id] of todo.entries()) {
        const outFile = path.join(OUT_DIR, `d1--${id}.mp4`);
        process.stdout.write(`[${String(i + 1).padStart(2)}/${todo.length}] ${id.padEnd(20)}`);

        try {
            const op = await ai.models.generateVideos({
                model: MODEL,
                prompt: promptFor(id),
                config: {
                    durationSeconds: DURATION,
                    numberOfVideos: 1,
                    aspectRatio: '16:9',
                    personGeneration: 'allow_adult',
                },
            });

            const done = await poll(op);
            const video = done?.response?.generatedVideos?.[0]?.video;
            if (!video) throw new Error(done?.error?.message ?? 'no video in response');

            if (video.videoBytes) {
                fs.writeFileSync(outFile, Buffer.from(video.videoBytes, 'base64'));
            } else if (video.uri) {
                execSync(`gcloud storage cp "${video.uri}" "${outFile}"`, { stdio: 'pipe' });
            } else {
                throw new Error('response held neither bytes nor a uri');
            }

            made++;
            console.log(` ✅ ${(fs.statSync(outFile).size / 1048576).toFixed(1)} MB`);
        } catch (error) {
            failed.push(id);
            console.log(` ❌ ${String(error.message ?? error).replace(/\s+/g, ' ').slice(0, 90)}`);
        }
    }

    console.log(`\n${made} generated, ${failed.length} failed`);
    if (failed.length) {
        console.log(`   retry with: node scripts/ccaf/generate-domain1-omni-videos.mjs ${failed.join(' ')}`);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
