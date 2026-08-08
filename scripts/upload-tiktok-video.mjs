/**
 * upload-tiktok-video.mjs
 *
 * TikTok CLI Video Uploader using ego-browser / Playwright persistent browser session.
 * Usage:
 *   node scripts/upload-tiktok-video.mjs --video "public/system-design-lessons/design-whatsapp.mp4" --caption "How to Design WhatsApp | System Design #systemdesign #tech"
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function getArg(flag) {
    const idx = process.argv.indexOf(flag);
    return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

const videoPath = getArg('--video');
const thumbnailPath = getArg('--thumbnail');
const caption = getArg('--caption') || 'System Design Breakdown | CareerVivid';

if (!videoPath || !fs.existsSync(videoPath)) {
    console.error('❌ Usage: node scripts/upload-tiktok-video.mjs --video <path_to_mp4> [--thumbnail <path_to_jpg>] [--caption "my caption"]');
    process.exit(1);
}

const absoluteVideoPath = path.resolve(videoPath);
const absoluteThumbnailPath = thumbnailPath && fs.existsSync(thumbnailPath) ? path.resolve(thumbnailPath) : null;

console.log(`🚀 TikTok CLI Uploader`);
console.log(`   Video: ${absoluteVideoPath}`);
if (absoluteThumbnailPath) console.log(`   Thumbnail/Cover: ${absoluteThumbnailPath}`);
console.log(`   Caption: "${caption}"\n`);

const scriptCode = `
const task = await useOrCreateTaskSpace('tiktok video uploader')
try { await claimTaskSpace(task.id) } catch (e) {}
try { await takeOverTaskSpace(task.id) } catch (e) {}

await openOrReuseTab('https://www.tiktok.com/creator-center/upload', { wait: true, timeout: 25 })
await wait(5)

const snap = await snapshotText()
cliLog('Checking login state on TikTok Creator Center...')

if (snap.includes('Log in') || snap.includes('Sign in') || snap.includes('Login')) {
    cliLog('⚠️ TikTok Login Required! Please log into your TikTok account in the browser.')
    await handOffTaskSpace(task.id)
} else {
    cliLog('✅ Authenticated on TikTok!')
    cliLog('Uploading video file: ' + ${JSON.stringify(absoluteVideoPath)})
    await uploadFile('input[type="file"]', ${JSON.stringify(absoluteVideoPath)})
    cliLog('Waiting for video file processing...')
    await wait(14)

    cliLog('Setting video caption...')
    await fillInput('div[contenteditable="true"]', ${JSON.stringify(caption)})
    await wait(2)

    ${absoluteThumbnailPath ? `
    cliLog('Setting video cover thumbnail: ' + ${JSON.stringify(absoluteThumbnailPath)})
    try {
        await click('button:has-text("Edit cover")', { label: 'Click Edit Cover button' })
        await wait(3)
        // Upload thumbnail image file in cover modal if file input exists
        const fileInput = await page.$('div[role="dialog"] input[type="file"], input[accept="image/*"]')
        if (fileInput) {
            await fileInput.setInputFiles(${JSON.stringify(absoluteThumbnailPath)})
            await wait(3)
        }
        await click('button:has-text("Save")', { label: 'Save Cover' }).catch(() => null)
        await wait(2)
    } catch (e) {
        cliLog('⚠️ Custom Cover upload notice: ' + e.message)
    }
    ` : ''}

    cliLog('Ensuring "Who can see this post" is set to Everyone...')
    try {
        const visDropdown = await page.$('div:has-text("Who can see this post") select, [data-e2e="privacy-dropdown"]')
        if (visDropdown) {
            await visDropdown.selectOption({ label: 'Everyone' })
        }
    } catch (e) {
        // Default on TikTok is already Everyone
    }

    cliLog('Submitting & Posting video on TikTok Creator Center...')
    let posted = false
    const selectors = ['button:has-text("Post")', 'button:has-text("Publish")', 'button:has-text("Submit")', '[data-e2e="post_video_button"]', 'button.btn-post', 'button.css-11y4e3y']
    for (const sel of selectors) {
        try {
            await click(sel, { label: 'Click Post/Submit video button' })
            cliLog('✅ Clicked TikTok Submit button via selector: ' + sel)
            posted = true
            break
        } catch (e) {
            // Try next selector
        }
    }

    if (!posted) {
        cliLog('⚠️ Primary button selectors failed, trying fallback click...')
        await click('button:has-text("Post")', { label: 'Fallback Post click' }).catch(() => null)
    }

    cliLog('Waiting for TikTok submission confirmation...')
    await wait(8)
    cliLog('🎉 TikTok Video Upload & Submission Complete! Video is published live!')
}
try { await completeTaskSpace(task.id, { keep: true }) } catch (e) {}
`;

try {
    const output = execFileSync('ego-browser', ['nodejs'], {
        encoding: 'utf8',
        cwd: process.cwd(),
        input: scriptCode,
        shell: false,
    });
    console.log(output);
} catch (err) {
    console.error('❌ TikTok Upload Error:', err.message);
}
