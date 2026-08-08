/**
 * build-3-classic-films.mjs
 *
 * Compiles 1080p Master MP4 films and 9:16 vertical shorts for 3 Classic System Design Videos:
 *   1. YouTube Live Streaming (sd-ytlive) -> design-youtube-live.mp4 & design-ytlive-short.mp4
 *   2. Uber Dynamic Surge Pricing (sd-ubersurge) -> design-ubersurge.mp4 & design-ubersurge-short.mp4
 *   3. Discord Actor Model (sd-discord) -> design-discord.mp4 & design-discord-short.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TASKS = [
    { id: 'sd-ytlive', script: 'scripts/system-design-interview/build-system-design-ytlive-film.mjs', masterMp4: 'public/system-design-lessons/design-youtube-live.mp4', shortMp4: 'public/system-design-lessons/design-ytlive-short.mp4' },
    { id: 'sd-ubersurge', script: 'scripts/system-design-interview/build-system-design-ubersurge-film.mjs', masterMp4: 'public/system-design-lessons/design-ubersurge.mp4', shortMp4: 'public/system-design-lessons/design-ubersurge-short.mp4' },
    { id: 'sd-discord', script: 'scripts/system-design-interview/build-system-design-discord-film.mjs', masterMp4: 'public/system-design-lessons/design-discord.mp4', shortMp4: 'public/system-design-lessons/design-discord-short.mp4' },
];

async function compileFilms() {
    console.log('🎬 Compiling 1080p Master Films and 9:16 Shorts for 3 Classic Videos...\n');

    for (const t of TASKS) {
        console.log(`========================================================`);
        console.log(`🚀 Compiling Film for [${t.id}]...`);
        console.log(`========================================================`);

        execSync(`node "${t.script}"`, { stdio: 'inherit' });

        // Cut 9:16 vertical short from master film (middle 45 seconds)
        if (fs.existsSync(t.masterMp4)) {
            console.log(`📱 Rendering 9:16 TikTok Vertical Short for [${t.id}]...`);
            const shortCmd = `ffmpeg -y -ss 25 -i "${t.masterMp4}" -t 50 -filter_complex "crop=ih*(9/16):ih" -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k "${t.shortMp4}"`;
            execSync(shortCmd, { stdio: 'pipe' });
            console.log(`   ✅ Saved ${t.shortMp4} (${(fs.statSync(t.shortMp4).size / (1024 * 1024)).toFixed(2)} MB)`);
        }
        console.log('');
    }

    console.log('🎉 ALL 3 CLASSIC SYSTEM DESIGN FILMS COMPILED SUCCESSFULLY!');
}

compileFilms().catch(console.error);
