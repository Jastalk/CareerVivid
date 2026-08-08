/**
 * upload-careervivid-youtube-video.mjs
 *
 * Dedicated CLI Uploader for CareerVivid System Design Videos on:
 *   Channel: @CareerVividSystemDesign ("CareerVivid System Design")
 *
 * Usage:
 *   node scripts/upload-careervivid-youtube-video.mjs --video <mp4_path> --title <title> --description <description>
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import open from 'open';
import { google } from '/Users/jiawenzhu/.config/hackathon-youtube-uploader/node_modules/googleapis/build/src/index.js';

const CONFIG_DIR = '/Users/jiawenzhu/.config/careervivid-youtube-uploader';
const CLIENT_SECRET_PATH = path.join(CONFIG_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

function parseArgs() {
    const args = process.argv.slice(2);
    const params = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
            params[key] = value;
        }
    }
    return params;
}

async function getOAuth2Client() {
    if (!fs.existsSync(CLIENT_SECRET_PATH)) {
        console.error(`❌ client_secret.json not found at ${CLIENT_SECRET_PATH}`);
        process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH));
    const { client_secret, client_id } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8080');

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    }

    console.log('\x1b[33m[INFO] No saved token found for @CareerVividSystemDesign. Starting interactive OAuth authorization flow...\x1b[0m');
    console.log('\x1b[36m👉 CRITICAL: In the Google OAuth popup, select your "CareerVivid System Design" Brand Account channel!\x1b[0m');

    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                if (req.url.indexOf('code=') > -1) {
                    const urlParams = new URL(req.url, 'http://localhost:8080');
                    const code = urlParams.searchParams.get('code');
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>CareerVivid Authentication Successful!</h1><p>You can close this window now. Returning to terminal...</p>');
                    server.close();

                    const { tokens } = await oAuth2Client.getToken(code);
                    oAuth2Client.setCredentials(tokens);
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
                    console.log(`\x1b[32m[SUCCESS] Credentials saved to ${TOKEN_PATH}\x1b[0m`);
                    resolve(oAuth2Client);
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Waiting for authorization code...');
                }
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                reject(err);
            }
        }).listen(8080, () => {
            const authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.upload'],
                prompt: 'select_account consent'
            });
            console.log(`\nOpening browser to authenticate...`);
            console.log(`If browser doesn't open, visit:\n${authUrl}\n`);
            open(authUrl);
        });
    });
}

async function youtubeInfo(auth) {
    const youtube = google.youtube({ version: 'v3', auth });
    const res = await youtube.channels.list({ mine: true, part: 'snippet' });
    const item = res.data.items?.[0];
    return { title: item?.snippet?.title, customUrl: item?.snippet?.customUrl, id: item?.id };
}

async function uploadVideo(oAuth2Client, videoPath, metadata) {
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
    const fileSize = fs.statSync(videoPath).size;

    console.log(`\nInitializing upload for: ${path.basename(videoPath)} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);
    console.log(`Title: "${metadata.snippet.title}"`);
    console.log(`Privacy: ${metadata.status.privacyStatus}`);

    return new Promise((resolve, reject) => {
        youtube.videos.insert(
            {
                part: 'snippet,status',
                requestBody: metadata,
                media: { body: fs.createReadStream(videoPath) }
            },
            {
                onUploadProgress: (evt) => {
                    const uploadedBytes = evt.bytesRead;
                    const percent = Math.round((uploadedBytes / fileSize) * 100);
                    if (uploadedBytes === fileSize || !global.lastLoggedPercent || percent - global.lastLoggedPercent >= 10) {
                        console.log(`Uploading: ${percent}% | ${(uploadedBytes / (1024 * 1024)).toFixed(2)} MB / ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
                        global.lastLoggedPercent = percent;
                    }
                }
            },
            (err, res) => {
                if (err) return reject(err);
                resolve(res.data);
            }
        );
    });
}

async function uploadThumbnail(oAuth2Client, videoId, thumbnailPath) {
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
    console.log(`🖼️ Uploading thumbnail for Video ID: ${videoId} from ${path.basename(thumbnailPath)}...`);
    const res = await youtube.thumbnails.set({
        videoId: videoId,
        media: { body: fs.createReadStream(thumbnailPath) }
    });
    console.log(`✅ Thumbnail successfully set for video ${videoId}!`);
    return res.data;
}

async function main() {
    const params = parseArgs();
    const videoPath = params.video ? path.resolve(params.video) : null;
    const thumbnailPath = params.thumbnail ? path.resolve(params.thumbnail) : null;
    const videoIdArg = params.videoId || null;

    const oAuth2Client = await getOAuth2Client();

    // Verify channel identity
    const channelRes = await youtubeInfo(oAuth2Client);
    console.log(`📡 Connected YouTube Channel: "${channelRes.title}" (${channelRes.customUrl || channelRes.id})`);

    if (channelRes.customUrl !== '@CareerVividSystemDesign' && channelRes.title !== 'CareerVivid System Design') {
        console.error(`\n❌ SAFETY ABORT: Connected channel is "${channelRes.title}" (${channelRes.customUrl}), NOT "@CareerVividSystemDesign"!`);
        console.error(`Removing invalid token at ${TOKEN_PATH}...`);
        fs.rmSync(TOKEN_PATH, { force: true });
        console.error(`Please re-run this command and select the "CareerVivid System Design" Brand Account during Google login.`);
        process.exit(1);
    }

    if (videoIdArg && thumbnailPath) {
        // Thumbnail-only update for existing video
        await uploadThumbnail(oAuth2Client, videoIdArg, thumbnailPath);
        return;
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
        console.error('❌ Usage: node scripts/upload-careervivid-youtube-video.mjs --video <path_to_mp4> --title "<title>" --description "<description>" [--thumbnail <image_path>]');
        console.error('   Or thumbnail update: node scripts/upload-careervivid-youtube-video.mjs --videoId <id> --thumbnail <image_path>');
        process.exit(1);
    }

    const rawTitle = params.title || 'CareerVivid System Design Breakdown';
    const title = rawTitle.slice(0, 95);
    const description = params.description || 'System Design Interview breakdown by CareerVivid.';
    const privacy = params.privacy || 'public';

    const metadata = {
        snippet: {
            title,
            description,
            categoryId: '28',
            tags: ['SystemDesign', 'SoftwareEngineering', 'TechInterview', 'CareerVivid']
        },
        status: {
            privacyStatus: privacy,
            selfDeclaredMadeForKids: false
        }
    };

    const result = await uploadVideo(oAuth2Client, videoPath, metadata);
    const videoId = result.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        await uploadThumbnail(oAuth2Client, videoId, thumbnailPath);
    }

    console.log(`\n========================================================`);
    console.log(`🎉 [SUCCESS] Video Uploaded to "${channelRes.title}" (${channelRes.customUrl || channelRes.id})!`);
    console.log(`Video ID:  ${videoId}`);
    console.log(`Video URL: ${videoUrl}`);
    console.log(`========================================================`);
}

main().catch(err => {
    console.error(`❌ Critical Upload Error: ${err.message}`);
    process.exit(1);
});
