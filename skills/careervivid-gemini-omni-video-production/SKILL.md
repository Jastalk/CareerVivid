---
name: careervivid-gemini-omni-video-production
description: Production pipeline for CareerVivid Gemini Omni Avatar System Design Explainer Videos. Generates multimodal videos featuring the engineer avatar speaking on camera with native lip sync, handles 5-hour browser quota waiting, single-chat thread continuity, and 93% AI watermark cropping.
---

# CareerVivid Gemini Omni Avatar Video Production Skill

This skill defines the mandatory workflow for producing high-converting **Gemini Omni Avatar System Design Explainer Videos** for CareerVivid.

---

## 🛑 Core Architectural Mandates

### 1. STRICT MODEL SELECTION: Gemini Omni Only
- **MANDATORY**: ALL video clips MUST be generated using **Gemini Omni multimodal video generation in the Gemini web app** (`gemini.google.com`).
- **FORBIDDEN**: NEVER use `veo-3.1-lite` + external TTS assembly for Omni videos. Gemini Omni generates the real engineer avatar **speaking directly on-screen with integrated natural voice and synchronized lip movements** in the video file itself.

### 2. SINGLE CHAT THREAD CONTINUITY
- **MANDATORY**: ALL beats/clips for a given lesson video MUST be generated inside **ONE SINGLE Gemini chat conversation thread** (e.g., `https://gemini.google.com/app/379a699b94af70ca`).
- **WHY**: Generating all clips in the same conversation thread ensures 100% avatar identity, facial structure, clothing, lighting, background style, and voice timbre consistency across the entire video.

### 3. ⏳ CREDIT EXCEEDED & 5-HOUR WAITING RULE
- If Gemini web app displays a daily quota limit warning (*"Sorry, I can't generate more videos for you today..."* or *"Videos will be available again..."*):
  - **NEVER FALL BACK** to silent Veo models or TTS synthesis.
  - **ACTION**: Immediately set a one-shot timer using the `schedule` tool for **5 hours and 1 minute** (18,060 seconds) or the exact reset time specified by Gemini.
  - **WAIT**: Stop calling tools and pause execution. The system will automatically wake the agent when the 5-hour timer expires and credits refresh.
  - **RESUME**: Upon waking, resume prompting inside the **exact same chat thread**.

---

## 📝 Gemini Omni Prompting Grammar

Every prompt submitted to Gemini Omni MUST follow this standard structure:

```text
@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
<Cinematic shot framing the young male software engineer (avatar @zhujiawen519) standing in front of dark-mode technical architecture environment... No text on screen.>

Audio & Spoken Narration:
The engineer speaks clearly with complete sentence articulation:
"<Complete system design explanation sentence. Never cut off mid-sentence.>"
```

### Script & Beat Rules:
1. **Complete Sentence Articulation**: Ensure the spoken narration text ends with full, complete thoughts (e.g., *"Once delivered to the recipient, the message is instantly deleted from server storage forever."*).
2. **Visual Variety**: Alternate camera angles between beats (e.g., low-angle glide shot in server room, dynamic handheld shot at glass whiteboard, medium close-up at tech office workstation).
3. **Outro Call to Action**: The final beat MUST include an explicit spoken call-to-action:
   - *"Follow me for more system design breakdowns or practice interactive tech company interview questions today on CareerVivid!"*

---

## ✂️ Watermark Removal & Concatenation Pipeline

### 1. Watermark Cropping (93% Vertical Crop)
Every downloaded raw `.mp4` clip from Gemini (`contribution.usercontent.google.com`) contains a Google AI watermark logo at the bottom.
Apply the following standard FFmpeg crop & 1080p upscaling filter:

```bash
ffmpeg -y -i "raw-clip.mp4" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "clean-clip.mp4"
```

### 2. Video Concatenation
Mux all clean clips in sequence into the final lesson output path:

```bash
ffmpeg -y -f concat -safe 0 -i "concat-list.txt" -c copy "public/system-design-lessons/design-<topic>-omni.mp4"
```

---

## 🤝 ego-browser Handoff Protocol

Whenever browser operations pause or complete:
```javascript
await claimTaskSpace(taskSpaceId);
await completeTaskSpace(taskSpaceId, { keep: true });
```
This relinquishes browser control back to the user immediately.
