/**
 * archive-uploaded-videos.mjs
 *
 * Automated Weekly & Post-Upload Video Archival Pipeline for CareerVivid:
 *   1. Scans local directories for compiled videos and Veo AI clips.
 *   2. Verifies external hard drive (/Volumes/Lenovo) is mounted.
 *   3. Copies video files to /Volumes/Lenovo/CareerVivid_Veo_Videos/ using rsync.
 *   4. Verifies destination file existence & file sizes.
 *   5. Removes local duplicate video files to maintain clean SSD space.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_BASE_DIR = '/Volumes/Lenovo/CareerVivid_Veo_Videos';

const SOURCES = [
    { local: 'public/system-design-lessons', remote: path.join(TARGET_BASE_DIR, 'system-design-lessons') },
    { local: 'public/ccaf-lessons', remote: path.join(TARGET_BASE_DIR, 'ccaf-lessons') },
    { local: 'public/assets/ccaf-termclips', remote: path.join(TARGET_BASE_DIR, 'ccaf-termclips') },
    { local: 'public/video_assets/flow_ai_video', remote: path.join(TARGET_BASE_DIR, 'flow_ai_video') }
];

async function archiveUploadedVideos() {
    console.log(`========================================================`);
    console.log(`📹 CAREERVIVID WEEKLY VIDEO ARCHIVAL PIPELINE`);
    console.log(`========================================================\n`);

    if (!fs.existsSync('/Volumes/Lenovo')) {
        console.error('❌ External hard drive /Volumes/Lenovo is NOT mounted!');
        console.error('   Please connect your Lenovo drive and try again.');
        process.exit(1);
    }

    fs.mkdirSync(TARGET_BASE_DIR, { recursive: true });
    let totalCopied = 0;
    let totalDeleted = 0;

    for (const item of SOURCES) {
        if (!fs.existsSync(item.local)) continue;

        console.log(`🚀 Processing [${item.local}] -> [${item.remote}]...`);
        fs.mkdirSync(item.remote, { recursive: true });

        // 1. Copy video files to external drive using quiet rsync
        const rsyncCmd = `rsync -aq --include="*/" --include="*.mp4" --exclude="*" "${path.resolve(item.local)}/" "${path.resolve(item.remote)}/"`;
        try {
            execSync(rsyncCmd, { stdio: 'pipe' });
            console.log(`   ✅ Video files transferred to external drive.`);
        } catch (err) {
            console.error(`   ❌ Sync error for ${item.local}:`, err.message);
            continue;
        }

        // 2. Verify and remove local duplicate video files
        const findCmd = `find "${path.resolve(item.local)}" -name "*.mp4"`;
        const localFiles = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

        for (const file of localFiles) {
            const relPath = path.relative(path.resolve(item.local), file);
            const remoteFile = path.join(path.resolve(item.remote), relPath);

            if (fs.existsSync(remoteFile) && fs.statSync(remoteFile).size === fs.statSync(file).size) {
                fs.unlinkSync(file);
                totalDeleted++;
                console.log(`   🗑️ Removed local duplicate: ${relPath}`);
            } else {
                console.warn(`   ⚠️ Remote copy missing or size mismatch for ${relPath}, keeping local.`);
            }
        }
        console.log('');
    }

    // 3. Final summary report
    const countCmd = `find "${TARGET_BASE_DIR}" -name "*.mp4" | wc -l`;
    const sizeCmd = `du -sh "${TARGET_BASE_DIR}"`;

    const totalCount = execSync(countCmd, { encoding: 'utf8' }).trim();
    const totalSize = execSync(sizeCmd, { encoding: 'utf8' }).trim();

    console.log(`========================================================`);
    console.log(`🎉 VIDEO ARCHIVAL COMPLETE!`);
    console.log(`📁 External Storage: ${TARGET_BASE_DIR}`);
    console.log(`📹 Total Preserved Videos: ${totalCount}`);
    console.log(`💾 Total External Storage Used: ${totalSize}`);
    console.log(`🗑️ Local Duplicate Files Removed: ${totalDeleted}`);
    console.log(`========================================================`);
}

archiveUploadedVideos().catch(console.error);
