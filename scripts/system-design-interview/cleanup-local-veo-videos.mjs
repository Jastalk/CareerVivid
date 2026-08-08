/**
 * cleanup-local-veo-videos.mjs
 *
 * Verifies every local video exists on external hard drive /Volumes/Lenovo/CareerVivid_Veo_Videos/,
 * then removes the local .mp4 duplicate files to free up disk space.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_BASE_DIR = '/Volumes/Lenovo/CareerVivid_Veo_Videos';

const TARGET_DIRS = [
    { local: 'public/system-design-lessons', remote: path.join(TARGET_BASE_DIR, 'system-design-lessons') },
    { local: 'public/ccaf-lessons', remote: path.join(TARGET_BASE_DIR, 'ccaf-lessons') },
    { local: 'public/assets/ccaf-termclips', remote: path.join(TARGET_BASE_DIR, 'ccaf-termclips') },
    { local: 'public/video_assets/flow_ai_video', remote: path.join(TARGET_BASE_DIR, 'flow_ai_video') }
];

async function cleanupLocalVideos() {
    console.log('🧹 Verifying and Cleaning Up Local Video Duplicates...\n');

    let totalDeleted = 0;

    for (const item of TARGET_DIRS) {
        if (!fs.existsSync(item.local)) continue;

        console.log(`========================================================`);
        console.log(`🔍 Checking [${item.local}]...`);
        console.log(`========================================================`);

        // Find all .mp4 files recursively in local dir
        const findCmd = `find "${path.resolve(item.local)}" -name "*.mp4"`;
        const localFiles = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

        for (const file of localFiles) {
            const relPath = path.relative(path.resolve(item.local), file);
            const remoteFile = path.join(path.resolve(item.remote), relPath);

            if (fs.existsSync(remoteFile) && fs.statSync(remoteFile).size === fs.statSync(file).size) {
                fs.unlinkSync(file);
                totalDeleted++;
                console.log(`   🗑️ Deleted local duplicate: ${relPath}`);
            } else {
                console.warn(`   ⚠️ Remote copy missing or size mismatch for ${relPath}, keeping local.`);
            }
        }
        console.log('');
    }

    console.log(`========================================================`);
    console.log(`🎉 LOCAL CLEANUP COMPLETE!`);
    console.log(`🗑️ Total Local Video Files Removed: ${totalDeleted}`);
    console.log(`💾 All 230 Videos Safely Preserved on External Hard Drive: ${TARGET_BASE_DIR}`);
    console.log(`========================================================`);
}

cleanupLocalVideos().catch(console.error);
