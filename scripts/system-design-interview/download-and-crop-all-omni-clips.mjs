/**
 * download-and-crop-all-omni-clips.mjs
 *
 * Downloads all unique Gemini Omni video clips directly from their video src URLs,
 * crops out the bottom AI watermark using FFmpeg, and concatenates them cleanly into:
 * /Users/jiawenzhu/Developer/careervivid/public/system-design-lessons/design-whatsapp-omni.mp4
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CLIPS_DIR = path.resolve('public/system-design-lessons/clips');
fs.mkdirSync(CLIPS_DIR, { recursive: true });

async function processClips() {
    console.log(`========================================================`);
    console.log(`🎬 GEMINI OMNI WATERMARK-FREE VIDEO PIPELINE`);
    console.log(`========================================================\n`);

    const videoUrls = [
        "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBhNjE4YTI0MjJhNzA3OGQ1MDAwNjU4NjliYTAwNzY4ZDA4OGViYWUwMzkzMzMyYTYSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
        "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBhYTgxOWUzOWE0YzhlYWFhMDAwNjU4NmQ1NWIyMGQ3NDA4MzQxMjBjYzEzOTRlOTUSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
        "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBlZGNhY2U0ODVhZTI1NDU0MDAwNjU4NmQ1ZGU5YjQ3YjAwY2U0OWEwNzUwOWVkNmMSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050",
        "https://contribution.usercontent.google.com/download?c=CgxiYXJkX3N0b3JhZ2USUBINcmVzcG9uc2VfZGF0YRo_CjBlNmNjZTNlOTUxZmQ4NTIwMDAwNjU4NmQ2NDYxM2NlZDA4ODQ5YTA0NzYzNjAwNmQSCxIHEOX9hsv0BBgB&filename=video.mp4&opi=103135050"
    ];

    console.log(`Found ${videoUrls.length} unique video URLs in Gemini tab:\n`, videoUrls);

    const cleanClipPaths = [];

    for (let i = 0; i < videoUrls.length; i++) {
        const url = videoUrls[i];
        console.log(`\n--------------------------------------------------------`);
        console.log(`🚀 Downloading Video Clip ${i + 1}/${videoUrls.length}...`);
        console.log(`--------------------------------------------------------`);

        // Clear ~/Downloads/video*.mp4 before fetching
        execSync(`rm -f ~/Downloads/video*.mp4 2>/dev/null`, { stdio: 'pipe' });

        const downloadNavScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await switchTab("0BE430C9B278537BA201A6453DB45B63")
await openOrReuseTab(${JSON.stringify(url)}, { wait: false })
await wait(3)
EOF
`;
        execSync(downloadNavScript, { stdio: 'inherit' });

        await new Promise(r => setTimeout(r, 2000));
        const downloadedFile = execSync(`ls -t ~/Downloads/video*.mp4 2>/dev/null | head -n 1`, { encoding: 'utf8' }).trim();

        if (!downloadedFile || !fs.existsSync(downloadedFile)) {
            console.error(`❌ Failed to download clip ${i + 1}`);
            continue;
        }

        const rawPath = path.join(CLIPS_DIR, `whatsapp-omni-raw-${i + 1}.mp4`);
        fs.copyFileSync(downloadedFile, rawPath);

        const cleanPath = path.join(CLIPS_DIR, `whatsapp-omni-clean-${i + 1}.mp4`);
        console.log(`✂️ Cropping bottom AI watermark & upscaling to 1920x1080...`);

        // FFmpeg filter: crop bottom 5% (strips AI watermark), scale to 1920x1080, preserve audio
        const ffmpegCropCmd = `ffmpeg -y -i "${rawPath}" -vf "crop=in_w:in_h*0.95:0:0,scale=1920:1080:flags=bicubic" -c:v libx264 -preset fast -crf 18 -c:a copy "${cleanPath}"`;
        execSync(ffmpegCropCmd, { stdio: 'pipe' });

        console.log(`✅ Clean Clip ${i + 1} saved: ${cleanPath}`);
        cleanClipPaths.push(cleanPath);
    }

    if (cleanClipPaths.length > 0) {
        console.log(`\n========================================================`);
        console.log(`🎬 Concatenating ${cleanClipPaths.length} Watermark-Free Video Clips...`);
        console.log(`========================================================`);

        const concatListPath = path.join(CLIPS_DIR, 'whatsapp-clean-concat.txt');
        fs.writeFileSync(concatListPath, cleanClipPaths.map(f => `file '${f}'`).join('\n'));

        const masterOutputPath = path.resolve('public/system-design-lessons/design-whatsapp-omni.mp4');
        const ffmpegConcatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${masterOutputPath}"`;

        execSync(ffmpegConcatCmd, { stdio: 'inherit' });

        const finalSize = fs.statSync(masterOutputPath).size;
        console.log(`\n🎉 MASTER FILM UPDATED: ${masterOutputPath}`);
        console.log(`📦 File Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`========================================================`);
    }

    // Complete task space with keep: true to hand off back to user
    const handoffScript = `
ego-browser nodejs <<'EOF'
await claimTaskSpace(2)
await completeTaskSpace(2, { keep: true })
EOF
`;
    execSync(handoffScript, { stdio: 'inherit' });
}

processClips().catch(console.error);
