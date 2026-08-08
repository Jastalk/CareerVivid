/**
 * list-youtube-videos.mjs
 *
 * Lists all uploaded videos on the active YouTube channel using YouTube Data API v3 via Google CLI.
 */

import fs from 'fs';
import path from 'path';
import { google } from '/Users/jiawenzhu/.config/hackathon-youtube-uploader/node_modules/googleapis/build/src/index.js';

const CONFIG_DIR = '/Users/jiawenzhu/.config/hackathon-youtube-uploader';
const CLIENT_SECRET_PATH = path.join(CONFIG_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

async function listVideos() {
    console.log('📡 Fetching Channel Videos via Google CLI...\n');

    const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH));
    const { client_secret, client_id } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8080');
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);

    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    // Fetch my channel info
    const channelRes = await youtube.channels.list({
        mine: true,
        part: 'snippet,contentDetails',
    });

    const channel = channelRes.data.items?.[0];
    if (!channel) {
        console.error('❌ Channel not found');
        return;
    }

    console.log(`Channel Title: ${channel.snippet.title}`);
    console.log(`Custom URL:    https://www.youtube.com/${channel.snippet.customUrl}`);

    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

    // Fetch uploaded items
    const playlistRes = await youtube.playlistItems.list({
        playlistId: uploadsPlaylistId,
        part: 'snippet,status',
        maxResults: 50,
    });

    const items = playlistRes.data.items || [];
    console.log(`\nFound ${items.length} Videos Uploaded to Channel:\n`);

    items.forEach((item, idx) => {
        const title = item.snippet.title;
        const videoId = item.snippet.resourceId.videoId;
        const privacy = item.status?.privacyStatus || 'public';
        console.log(`[${idx + 1}] ${title}`);
        console.log(`    URL: https://www.youtube.com/watch?v=${videoId}`);
        console.log(`    Privacy: ${privacy}\n`);
    });
}

listVideos().catch(console.error);
