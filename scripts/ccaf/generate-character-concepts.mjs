/**
 * Generates the five CCA-F course characters as concept art, one per exam domain.
 *
 * These are reference images: they lock the cast's look before anything else is
 * built, so the 3D figures in the quest and the miniature-diorama shots in the
 * video course all agree with each other.
 *
 * The design is our own — brick-toy proportions, but not a reproduction of any
 * commercial minifigure, and no brand name appears in the prompts or the UI.
 *
 *   node scripts/ccaf/generate-character-concepts.mjs [outDir]
 *
 * Needs GEMINI_API_KEY in .env (never printed, never committed).
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const OUT_DIR = process.argv[2] || 'scratchpad/characters';

/** Image models to try, best first — the preview model is not on every key. */
const MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];

/**
 * Appended verbatim to every prompt. Consistency across the whole cast — and
 * later across all 45 lesson backplates — depends on this never changing.
 */
const STYLE = `
Studio product photograph of a physical toy figure on a dark reflective
surface. Dramatic warm key light from above with a soft rim light, deep
charcoal-black background, shallow depth of field, macro photography, fine
dust motes in the light beam, cinematic colour grade, photorealistic.
Absolutely no text, no letters, no words, no numbers, no logos, no branding,
no watermark anywhere in the image.
`.trim().replace(/\s+/g, ' ');

/** Shared silhouette — original design, described from scratch every time. */
const BODY = `
An original stylized blocky toy character, full body, front view, standing.
Cylindrical head with a small round stud on top, simple dot eyes and a calm
neutral expression, a tapered boxy torso, straight blocky arms ending in
simple C-shaped clamp hands, and two separate rectangular legs. The head and
the hands are always a warm light skin tone, never the colour of the outfit —
only the clothing changes between characters.
`.trim().replace(/\s+/g, ' ');

const CHARACTERS = [
  {
    id: '1-orchestration',
    name: 'Domain 1 · Orchestration — Dispatcher',
    outfit: `Wearing a deep indigo-purple uniform jacket with gold shoulder
      epaulettes, a matching peaked cap, and a slim headset with a boom
      microphone. A small gold badge on the chest. Dark navy legs.`,
  },
  {
    id: '2-workshop',
    name: 'Domain 2 · Tool & MCP — Maker',
    outfit: `Wearing a burnt-orange work apron over a rust-brown tunic, a heavy
      tool belt with small tools, and protective goggles pushed up onto the
      forehead. Dark brown legs.`,
  },
  {
    id: '3-engineering',
    name: 'Domain 3 · Claude Code Config — Engineer',
    outfit: `Wearing a teal-green work shirt with rolled sleeves, a bright
      yellow safety hard hat with a short brim, a pen in the chest pocket and
      reflective cuffs. Dark slate legs.`,
  },
  {
    id: '4-training',
    name: 'Domain 4 · Prompt & Structured Output — Instructor',
    outfit: `Wearing a magenta-pink training uniform with the sleeves rolled up,
      a white cloth headband tied around the forehead, and a dark belt at the
      waist. Deep plum legs.`,
  },
  {
    id: '5-hub',
    name: 'Domain 5 · Context & Reliability — Tower Control',
    outfit: `Wearing a steel-blue jumpsuit with a lime-green high-visibility
      stripe across the chest, and large dark over-ear headphones with a
      microphone. Dark navy legs.`,
  },
];

const loadApiKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const file of ['.env', '.env.local']) {
    if (!fs.existsSync(file)) continue;
    const hit = fs.readFileSync(file, 'utf8')
      .split('\n')
      .find(line => line.startsWith('GEMINI_API_KEY='));
    if (hit) return hit.slice('GEMINI_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  }
  return null;
};

/**
 * Two ways in, tried in order:
 *   1. Vertex AI — uses ADC or a local service-account key. Preferred: it is
 *      what the Cloud Functions already use, and it needs no separate quota.
 *   2. A Generative Language API key from .env.
 * The service-account file is gitignored; nothing here prints a credential.
 */
const buildClient = () => {
  const project = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const localKey = 'firebase-service-account.json';

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(localKey)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(localKey);
  }

  const hasAdc = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const apiKey = loadApiKey();

  if (hasAdc) {
    return {
      client: new GoogleGenAI({ vertexai: true, project, location }),
      how: `Vertex AI (${project} / ${location})`,
      fallbackKey: apiKey,
    };
  }
  if (apiKey) return { client: new GoogleGenAI({ apiKey }), how: 'Generative Language API key', fallbackKey: null };

  throw new Error('No credentials: set GOOGLE_APPLICATION_CREDENTIALS or GEMINI_API_KEY');
};

const promptFor = (character) =>
  `${BODY} ${character.outfit.replace(/\s+/g, ' ').trim()} ${STYLE}`;

/** Pulls the first inline image out of a generateContent response. */
const extractImage = (response) => {
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) return part.inlineData;
  }
  return null;
};

const main = async () => {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const targets = only ? CHARACTERS.filter(c => only.includes(c.id)) : CHARACTERS;
  if (!targets.length) throw new Error('ONLY matched no characters');

  const { client: ai, how } = buildClient();
  console.log(`auth: ${how}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let model = null;
  for (const candidate of MODELS) {
    try {
      const probe = await ai.models.generateContent({
        model: candidate,
        contents: promptFor(targets[0]),
      });
      if (extractImage(probe)) {
        model = candidate;
        const image = extractImage(probe);
        const file = path.join(OUT_DIR, `${targets[0].id}.png`);
        fs.writeFileSync(file, Buffer.from(image.data, 'base64'));
        console.log(`model: ${candidate}`);
        console.log(`  ✓ ${targets[0].name} → ${file}`);
        break;
      }
      console.log(`  ${candidate}: responded without an image, trying next`);
    } catch (error) {
      console.log(`  ${candidate}: ${error.message.split('\n')[0].slice(0, 120)}`);
    }
  }

  if (!model) throw new Error('No usable image model. Tried: ' + MODELS.join(', '));

  for (const character of targets.filter(c => c.id !== CHARACTERS[0].id || only)) {
    let saved = false;
    // The model occasionally answers with prose and no image; retrying with a
    // fresh request clears it far more often than rewording the prompt does.
    for (let attempt = 1; attempt <= 3 && !saved; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: promptFor(character),
        });
        const image = extractImage(response);
        if (!image) {
          const why = response?.candidates?.[0]?.finishReason ?? 'no image';
          console.log(`  · ${character.name}: attempt ${attempt} — ${why}`);
          continue;
        }
        const file = path.join(OUT_DIR, `${character.id}.png`);
        fs.writeFileSync(file, Buffer.from(image.data, 'base64'));
        console.log(`  ✓ ${character.name} → ${file}`);
        saved = true;
      } catch (error) {
        console.log(`  · ${character.name}: attempt ${attempt} — ${error.message.split('\n')[0].slice(0, 100)}`);
      }
    }
    if (!saved) console.log(`  ✗ ${character.name}: gave up after 3 attempts`);
  }
};

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
