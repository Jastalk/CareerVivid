/**
 * copy-veo-videos-to-external.mjs
 *
 * Copies all local Veo generated videos (System Design clips, CCAF clips, Master films)
 * to the external hard drive at /Volumes/Lenovo/CareerVivid_Veo_Videos/
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { execFileSync } from 'child_process';

const TARGET_BASE_DIR = '/Volumes/Lenovo/CareerVivid_Veo_Videos';

if (!fs.existsSync('/Volumes/Lenovo')) {
    console.error('❌ External hard drive /Volumes/Lenovo is not mounted!');
    process.exit(1);
}

fs.mkdirSync(TARGET_BASE_DIR, { recursive: true });

const SOURCES = [
    { src: 'public/system-design-lessons', dest: path.join(TARGET_BASE_DIR, 'system-design-lessons') },
    { src: 'public/ccaf-lessons', dest: path.join(TARGET_BASE_DIR, 'ccaf-lessons') },
    { src: 'public/assets/ccaf-termclips', dest: path.join(TARGET_BASE_DIR, 'ccaf-termclips') },
    { src: 'public/video_assets/flow_ai_video', dest: path.join(TARGET_BASE_DIR, 'flow_ai_video') }
];

async function backupVeoVideos() {
    console.log(`📦 Backup Pipeline: Copying local Veo videos to ${TARGET_BASE_DIR}...\n`);

    let totalFilesCopied = 0;
    let totalBytesCopied = 0;

    for (const item of SOURCES) {
        if (!fs.existsSync(item.src)) {
            console.log(`⚠️ Source directory ${item.src} does not exist, skipping.`);
            continue;
        }

        console.log(`========================================================`);
        console.log(`🚀 Copying [${item.src}] -> [${item.dest}]...`);
        console.log(`========================================================`);

        // Use rsync to efficiently copy files while displaying progress
        try {
            const out = execFileSync('rsync', [
                '-av',
                '--include=*/',
                '--include=*.mp4',
                '--exclude=*',
                `${path.resolve(item.src)}/`,
                `${path.resolve(item.dest)}/`,
            ], { encoding: 'utf8', cwd: process.cwd(), shell: false });
            const lines = out.trim().split('\n');
            const files = lines.filter(l => l.endsWith('.mp4'));
            totalFilesCopied += files.length;
            console.log(`   ✅ Copied ${files.length} video files from ${item.src}`);
        } catch (err) {
            console.error(`❌ Error copying ${item.src}:`, err.message);
        }
        console.log('');
    }

    // Verify backup count and size on external drive
    const countCmd = `find "${TARGET_BASE_DIR}" -name "*.mp4" | wc -l`;
    const sizeCmd = `du -sh "${TARGET_BASE_DIR}"`;

    const totalCount = execSync(countCmd, { encoding: 'utf8' }).trim();
    const totalSize = execSync(sizeCmd, { encoding: 'utf8' }).trim();

    console.log(`========================================================`);
    console.log(`🎉 BACKUP COMPLETE!`);
    console.log(`📁 Destination: ${TARGET_BASE_DIR}`);
    console.log(`📹 Total Video Files Copied: ${totalCount}`);
    console.log(`📦 Total Storage Occupied: ${totalSize}`);
    console.log(`========================================================`);
}

backupVeoVideos().catch(console.error);
