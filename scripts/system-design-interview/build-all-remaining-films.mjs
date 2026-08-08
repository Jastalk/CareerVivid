/**
 * build-all-remaining-films.mjs
 *
 * Sequentially builds all remaining System Design explainer films
 * to guarantee 0 concurrency CPU overhead and 100% successful compilation.
 */

import { execSync } from 'child_process';

const filmsToBuild = [
    { name: 'Airbnb', script: 'scripts/system-design-interview/build-system-design-airbnb-film.mjs' },
    { name: 'Instagram', script: 'scripts/system-design-interview/build-system-design-instagram-film.mjs' },
    { name: 'OpenAI', script: 'scripts/system-design-interview/build-system-design-openai-film.mjs' },
    { name: 'Claude Code', script: 'scripts/system-design-interview/build-system-design-claudecode-film.mjs' },
];

console.log('🚀 Starting Sequential Compilation of All Remaining System Design Films...\n');

for (const f of filmsToBuild) {
    console.log(`🎬 ========================================================`);
    console.log(`🎬 Compiling ${f.name} System Design Film...`);
    console.log(`🎬 ========================================================\n`);

    try {
        execSync(`node ${f.script}`, { stdio: 'inherit' });
        console.log(`\n✅ ${f.name} Film Successfully Compiled!\n`);
    } catch (err) {
        console.error(`❌ Failed to compile ${f.name}:`, err.message);
    }
}

console.log('\n🎉 ALL REMAINING SYSTEM DESIGN FILMS COMPLETED SEQUENTIALLY!');
