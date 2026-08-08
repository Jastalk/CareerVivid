import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const project = process.env.GOOGLE_CLOUD_PROJECT || 'jastalk-firebase';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync('firebase-service-account.json')) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve('firebase-service-account.json');
}

const ai = new GoogleGenAI({ vertexai: true, project, location });

async function testGeminiAudio() {
    console.log("Synthesizing audio via Gemini 2.0 Flash Audio...");
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: 'Read the following text out loud in an energetic, engaging, fast-paced YouTube explainer voice (like Sam O\'Nella or Kurzgesagt style):\n\n"You are going to build an agency. One agent, then several. Everything that is easy with one breaks the moment there are two!"'
                        }
                    ]
                }
            ],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Puck' // Puck, Charon, Kore, Fenrir, Aoede
                        }
                    }
                }
            }
        });

        const candidates = response.candidates;
        if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
                    const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
                    fs.writeFileSync('public/assets/ccaf-narration/samples/sample-gemini-puck.wav', audioBuffer);
                    console.log('✅ Saved Gemini Puck Audio to public/assets/ccaf-narration/samples/sample-gemini-puck.wav');
                }
            }
        }
    } catch (e) {
        console.log("❌ Gemini Audio error:", e.message);
    }
}

testGeminiAudio();
