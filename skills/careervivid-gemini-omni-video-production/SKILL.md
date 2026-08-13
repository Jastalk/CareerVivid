---
name: careervivid-gemini-omni-video-production
description: Production pipeline for CareerVivid Gemini Omni Avatar SaaS Commercial & System Design Explainer Videos. Generates multimodal videos featuring the engineer avatar speaking on camera with native lip sync and user voice, handles daily AI credit limits gracefully, single-chat thread continuity, and 93% AI watermark cropping.
---

# 🎬 Skill: CareerVivid Gemini Omni Avatar Video Production

This Skill defines the mandatory workflow for producing high-converting **Gemini Omni Avatar Commercial & System Design Explainer Videos** using natural avatar voice, synchronized lip movements, and professional cinematic visual staging.

---

## 🛑 Core Architectural Mandates

### 1. Model & Voice Selection: Gemini Omni Avatar
- **MANDATORY**: ALL video clips MUST be generated using **Gemini Omni multimodal video generation in the Gemini web app** (`gemini.google.com`).
- **NATIVE LIP SYNC & USER VOICE**: Gemini Omni generates the real engineer avatar (`@zhujiawen519`) **speaking directly on-screen with integrated natural voice and synchronized lip movements** in the video file itself.
- **NEVER FALL BACK** to silent Veo models or external TTS assembly when producing Omni avatar videos.

### 2. Single Chat Thread Continuity
- **MANDATORY**: ALL beats/clips for a given commercial or lesson video MUST be generated inside **ONE SINGLE Gemini chat conversation thread** (e.g., `https://gemini.google.com/app/379a699b94af70ca`).
- **WHY**: Generating all clips in the same conversation thread ensures 100% avatar identity, facial structure, clothing, lighting, background style, and voice timbre consistency across the entire video.

### 3. 💳 Daily Credit Boundary & Graceful Stop Rule
- **STRICT CREDIT BOUNDARY**: All video generation MUST strictly respect daily AI credits/quota limits.
- If Gemini web app displays a daily quota limit warning (*"Sorry, I can't generate more videos for you today..."* or *"Videos will be available again..."*):
  - **STOP & REPORT CLEANLY**: Immediately stop further video generation calls, log the exact quota status, and present the completed clips to the user.
  - **DO NOT** attempt unauthorized retry loops or degrade video quality.
  - If scheduled auto-resumption is desired by the user, set a one-shot timer using the `schedule` tool for the reset duration (e.g., 5 hours and 1 minute).

### 4. 🌟 Professional Visual Quality & Scene Staging
- **HIGH-IMPACT CINEMATIC STAGING**: Every scene MUST look premium and professional.
- Use dynamic camera angles: low-angle glide shots in high-tech server rooms, dynamic handheld shots at glass whiteboards, medium close-ups at sleek dark-mode workstations.
- Strict constraint: NO pseudo-latin text, NO gibberish, NO floating artifact text.

---

## 📝 Gemini Omni Prompting Grammar

Every prompt submitted to Gemini Omni MUST follow this standard structure:

```text
@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
<Cinematic shot framing the young male software engineer avatar (@zhujiawen519) standing in front of dark-mode technical architecture studio environment... No text on screen.>

Audio & Spoken Narration:
The engineer speaks clearly with complete sentence articulation:
"<Complete commercial or system design explanation sentence. Never cut off mid-sentence.>"
```

### Script & Beat Rules:
1. **Complete Sentence Articulation**: Ensure the spoken narration text ends with full, complete thoughts (e.g., *"CareerVivid's AI Career Agent scores your architecture in real time and prepares you for FAANG interview loops."*).
2. **Visual Variety**: Alternate camera angles between beats (e.g., low-angle server rack glide, dynamic glass whiteboard, workstation close-up).
3. **Outro Call to Action**: The final beat MUST include an explicit spoken call-to-action:
   - *"Master System Design and land your dream tech offer. Practice interactive scenarios today on CareerVivid dot app!"*

---

## ✂️ Watermark Removal & Concatenation Pipeline

### 1. Watermark Cropping (93% Vertical Crop)
Every downloaded raw `.mp4` clip from Gemini (`contribution.usercontent.google.com`) contains a Google AI watermark logo at the bottom.
Apply the following standard FFmpeg crop & 1080p upscaling filter:

```bash
ffmpeg -y -i "raw-clip.mp4" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "clean-clip.mp4"
```

### 2. Video Concatenation & Faststart
Mux all clean clips in sequence into the final output path with `-movflags +faststart`:

```bash
ffmpeg -y -f concat -safe 0 -i "concat-list.txt" -c copy -movflags +faststart "public/commercial-videos/careervivid-omni-commercial.mp4"
```

---

## 🤝 ego-browser Handoff Protocol

Whenever browser operations pause or complete:
```javascript
await claimTaskSpace(taskSpaceId);
await completeTaskSpace(taskSpaceId, { keep: true });
```
This relinquishes browser control back to the user immediately.
