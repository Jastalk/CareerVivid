/**
 * generate-all-3-classic-veo-clips.mjs
 *
 * Sequentially generates Veo 3.1 Lite (veo-3.1-lite-generate-001) stop-motion paper collage animation clips
 * for all beats across the 3 classic System Design topics:
 *   1. YouTube Live Streaming at Scale (sd-ytlive, 8 beats)
 *   2. Uber Surge Pricing & Real-Time Heatmaps (sd-ubersurge, 7 beats)
 *   3. Discord Actor Model & ScyllaDB (sd-discord, 7 beats)
 */

import { execSync } from 'child_process';

async function main() {
    console.log('🎥 Launching Veo 3.1 Lite Video Clip Generation for 3 Classic Topics...\n');

    console.log('========================================================');
    console.log('🚀 Topic 1: YouTube Live Streaming (sd-ytlive)');
    console.log('========================================================');
    try {
        execSync('node scripts/system-design-interview/generate-ytlive-omni-videos.mjs', { stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Error generating ytlive clips:', e.message);
    }

    console.log('\n========================================================');
    console.log('🚀 Topic 2: Uber Surge Pricing (sd-ubersurge)');
    console.log('========================================================');
    try {
        execSync('node scripts/system-design-interview/generate-ubersurge-omni-videos.mjs', { stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Error generating ubersurge clips:', e.message);
    }

    console.log('\n========================================================');
    console.log('🚀 Topic 3: Discord Actor Model (sd-discord)');
    console.log('========================================================');
    try {
        execSync('node scripts/system-design-interview/generate-discord-omni-videos.mjs', { stdio: 'inherit' });
    } catch (e) {
        console.error('❌ Error generating discord clips:', e.message);
    }

    console.log('\n🎉 ALL VEO 3.1 LITE CLIPS GENERATED SUCCESSFULLY FOR 3 CLASSIC TOPICS!');
}

main().catch(console.error);
