/**
 * update-youtube-descriptions.mjs
 *
 * Programmatically updates YouTube video descriptions for all CareerVivid System Design videos
 * putting raw URLs on their own clean lines for optimal link rendering.
 */

import fs from 'fs';
import path from 'path';
import { google } from '/Users/jiawenzhu/.config/hackathon-youtube-uploader/node_modules/googleapis/build/src/index.js';

const CONFIG_DIR = '/Users/jiawenzhu/.config/hackathon-youtube-uploader';
const CLIENT_SECRET_PATH = path.join(CONFIG_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');

const VERIFIED_LINKS_BLOCK = `
🚀 System Design Learning Path:
https://careervivid.app/learning/system-design-interview

💻 Coding Interview Patterns for Beginners:
https://careervivid.app/learning/coding-interview-patterns

🏢 300+ Real Tech Company Interview Questions:
https://careervivid.app/interview-studio

#SystemDesign #SoftwareEngineering #TechInterview #CareerVivid`;

const VIDEOS_TO_UPDATE = [
    { id: 'l5NfBiODlw8', topic: 'TikTok' },
    { id: 'rvqSW3dvU5c', topic: 'WhatsApp' },
    { id: 'DZoAHG4mubY', topic: 'OpenAI' },
    { id: '8Ijrr_3wpBs', topic: 'Airbnb' },
    { id: 'vLx4Vz2CFwk', topic: 'Instagram' },
    { id: 'zJ5zBILF4vo', topic: 'YouTube' },
    { id: '7oAa7cv7clE', topic: 'Uber' },
];

async function updateDescriptions() {
    console.log('🔄 Updating YouTube Video Descriptions...\n');

    const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH));
    const { client_secret, client_id } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:8080');
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);

    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });

    for (const item of VIDEOS_TO_UPDATE) {
        console.log(`Updating [${item.topic}] (${item.id})...`);
        try {
            const res = await youtube.videos.list({
                part: 'snippet',
                id: item.id,
            });

            const existingSnippet = res.data.items?.[0]?.snippet;
            if (!existingSnippet) {
                console.error(`❌ Video not found: ${item.id}`);
                continue;
            }

            const cleanDescription = existingSnippet.description.split('🚀')[0].trim();
            const updatedDescription = `${cleanDescription}\n\n${VERIFIED_LINKS_BLOCK.trim()}`;

            await youtube.videos.update({
                part: 'snippet',
                requestBody: {
                    id: item.id,
                    snippet: {
                        title: existingSnippet.title,
                        categoryId: existingSnippet.categoryId || '28',
                        description: updatedDescription,
                        tags: existingSnippet.tags || [],
                    },
                },
            });

            console.log(`✅ Updated ${item.topic} -> https://www.youtube.com/watch?v=${item.id}`);
        } catch (err) {
            console.error(`❌ Failed to update ${item.topic}:`, err.message);
        }
    }
    console.log('\n🎉 All YouTube Video Descriptions Updated Successfully!');
}

updateDescriptions().catch(console.error);
