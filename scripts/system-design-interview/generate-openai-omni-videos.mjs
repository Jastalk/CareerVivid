/**
 * Generates the fresh 8-second paper-collage beds for the acquisition cut of
 * "Design a ChatGPT-like streaming LLM". All readable copy is composited later.
 */

import path from 'path';
import { contactSheet, generateClips } from './paperCollagePromptGrammar.mjs';

const OUT_DIR = path.resolve('public/system-design-lessons/clips');
const PREFIX = 'sd-openai-v3--';

const CLIPS = {
    'sd-openai-intro': {
        shot: 'Locked-off medium-wide shot made from unlabeled paper objects.',
        location: 'A warm off-white grid-paper tabletop with a teal paper phone on the left, a small mustard cuboid machine in the middle, and a blank spiral notebook on the right. Nothing has lettering, icons, labels, or printed marks.',
        beats: [
            '00:00-00:03: A small blank ivory card leaves the phone and travels toward the mustard machine along a hand-drawn arrow.',
            '00:03-00:06: The mustard machine holds a stack of blank ivory cards while the phone waits beneath a slowly turning paper clock hand.',
            '00:06-00:08: Three small blank ivory cards leave the machine one at a time and the notebook receives one completely blank paper square.',
        ],
    },
    'sd-openai-sse-streaming': {
        shot: 'Locked-off wide shot with abstract paper objects only.',
        location: 'A plain warm cream paper field with only wide, faint blank grid lines: no newspaper texture, no printed columns, and no background marks. It holds a narrow mustard gate at left, tiny blank ivory rectangles, one teal cuboid machine, and a blank teal phone at right.',
        beats: [
            '00:00-00:03: A growing row of blank ivory rectangles presses against the narrow gate while a red paper wave rises above it.',
            '00:03-00:06: The gate opens into a dotted black path and small blank rectangles move one by one toward the phone without waiting for a full stack.',
            '00:06-00:08: A second unmarked teal cuboid snaps into place and the red paper wave settles into a calm amber arc.',
        ],
    },
    'sd-openai-kv-cache': {
        shot: 'Top-down medium shot, abstract memory reuse layout.',
        location: 'A warm off-white grid-paper tabletop with a tall blank paper strip stack at left, a shallow teal tray in the centre, and an orange circle with a black scribble at right. Nothing contains writing or symbols.',
        beats: [
            '00:00-00:03: A long blank paper strip stretches from the left stack toward the orange circle and slows under its own length.',
            '00:03-00:06: Small colored paper tiles are lifted from the blank strip and placed in the teal tray.',
            '00:06-00:08: One small blank ivory card reaches the orange circle using only the tray and a hand-drawn lightning bolt appears above the short path.',
        ],
    },
    'sd-openai-gpu-workers': {
        shot: 'Locked-off wide shot, abstract scheduling board layout.',
        location: 'A plain warm cream paper field with only wide, faint blank grid lines: no newspaper texture, no printed columns, and no background marks. A shallow yellow tray sits at left with a loose cluster of identical teal squares to its right. Every paper shape is empty and has no words, numbers, labels, or icons.',
        beats: [
            '00:00-00:03: Several tiny blank ivory cards arrive in the yellow tray while only two teal squares are active.',
            '00:03-00:06: The yellow tray slides short blank cards into newly available teal squares one by one as longer blank strips remain in motion.',
            '00:06-00:08: The teal squares pulse in an alternating rhythm and a hand-drawn balance scale settles level above the cluster.',
        ],
    },
    'sd-openai-failure-modes': {
        shot: 'Locked-off medium-wide shot, protective flow layout.',
        location: 'A warm grid-paper scene with tiny blank ivory rectangles at left, a red striped gate at centre, a small teal tray, and one mustard cuboid at right. No element has any writing.',
        beats: [
            '00:00-00:03: Too many blank ivory rectangles arrive at once and pile above a hand-drawn safety line.',
            '00:03-00:06: The striped gate allows a measured number of rectangles through while oversized blank strips are trimmed to a shorter length.',
            '00:06-00:08: A small amber rectangle takes a side path back to the left and the mustard cuboid continues operating calmly.',
        ],
    },
    'sd-openai-practice': {
        shot: 'Locked-off centred medium shot, warm doorway layout.',
        location: 'A warm off-white grid-paper backdrop with a closed paper doorway in the centre, three blank paper stepping stones, and a yellow pencil. The entire scene is unmarked with no diagram, no labels, and no writing.',
        beats: [
            '00:00-00:03: The paper doorway swings open to reveal a gentle warm amber glow and three small paper stepping stones.',
            '00:03-00:06: The yellow pencil traces one simple black curved line through the three blank stepping stones while a magnifying glass passes over the centre stone.',
            '00:06-00:08: A dark ink checkmark is drawn above the doorway and short radiating lines appear around it.',
        ],
    },
};

async function main() {
    const args = process.argv.slice(2).filter(Boolean);
    const force = args.includes('--force');
    const only = args.filter((arg) => arg !== '--force');
    await generateClips({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: PREFIX,
        only: only.length ? only : undefined,
        force,
    });
    contactSheet({
        clips: CLIPS,
        outDir: OUT_DIR,
        prefix: PREFIX,
        sheetPath: path.resolve('scratchpad/openai-acquisition-contact-sheet.jpg'),
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
