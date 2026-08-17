---
name: careervivid-gemini-omni-video-production
description: Production pipeline for CareerVivid Gemini Omni Avatar SaaS Commercial & System Design Explainer Videos. Generates multimodal video clip assets featuring the engineer avatar in Apple Park nature-integrated environments, handles 4-5 clip batch pacing per 5-hour credit reset, modular asset library storage, white shirt signature outfit, 100% English spoken narration, signature outro CTAs, and Career Agent live companion storytelling.
---

# 🎬 Skill: CareerVivid Gemini Omni Avatar Video Production

This Skill defines the mandatory workflow for producing high-converting **Gemini Omni Avatar Commercial & System Design Explainer Video Assets** featuring the engineer avatar in Apple Park nature-professional staging and the Career Agent live companion value proposition.

---

## 🛑 Core Architectural Mandates

### 1. Model & Voice Selection: Gemini Omni Avatar Only
- **MANDATORY**: ALL video clips MUST be generated using **Gemini Omni multimodal video generation in the Gemini web app** (`gemini.google.com`).
- **100% ENGLISH SPOKEN NARRATION**: All spoken narration prompts MUST be in **100% fluent English**.
- **NATIVE LIP SYNC & USER VOICE**: Gemini Omni generates the real engineer avatar (`@zhujiawen519`) **speaking directly on-screen with integrated natural voice and synchronized lip movements** in the video file itself.
- **NEVER FALL BACK** to silent Veo models or external TTS assembly when producing Omni avatar videos.

### 2. Signature Avatar Outfit (STRICT REQUIREMENT)
- **ALWAYS WHITE SHIRT (白色衬衫)**: Avatar (`@zhujiawen519`) MUST ALWAYS wear the signature **sleek crisp white button-down shirt (白色衬衫)** in every video. NEVER use black shirts or dark sweaters.

### 3. Fresh Chat Thread Per Batch & Asset Library Storage
- **MANDATORY**: Every new video batch MUST be generated inside a **BRAND-NEW fresh Gemini chat conversation thread** (`https://gemini.google.com/app`).
- **WHY**: Starting a fresh chat thread for each batch ensures 100% thread purity. Every generated video clip in that thread belongs strictly to that batch, making index extraction unambiguous.
- **MODULAR ASSET LIBRARY**: Save all cropped clean clips into `public/system-design-lessons/clips-library/` so they can be combined into various promotional films and lesson modules.

### 4. ⏰ 4-5 Clips Per 5-Hour Batch & Automated Schedule
- **BATCH SIZE PACING**: Each 5-hour credit reset yields approximately **4 to 5 video clips**.
- **AUTOMATED RECURRING TIMING**: Every 5 hours (when credits reset), automatically trigger the generation of the next batch of 4-5 clips.
- **CREDIT EXCEEDED HANDLING**: If Gemini web app displays a quota limit warning (*"Sorry, I can't generate more videos for you today..."*):
  - Save all completed clips from the current batch to the asset library.
  - Set a one-shot timer using the `schedule` tool for **5 hours and 1 minute** (`DurationSeconds=18060`).
  - Upon waking, open a fresh chat thread and generate the next batch of 4-5 clips.

---

## 🍃 Visual Art Direction: "Tim Cook @ Apple Park" Nature-Professional Style

Move away from industrial server rooms into **nature-integrated architectural environments** inspired by Tim Cook presenting at Apple Park. The aesthetic must feel warm, organic, serene, connected with nature, yet ultra-sleek, minimalist, high-tech, and deeply professional.

### Signature Environments:
- **Redwood Glass Pavilion**: Floor-to-ceiling glass walls surrounded by towering green redwood trees, natural sunlight filtering through leaves onto a minimalist light-oak workstation.
- **Architectural Water Reflection Pool**: Outdoor infinity pool with subtle water ripples, sleek floating glass whiteboard, surrounded by lush green lawns and rolling hills under golden hour sunlight.
- **Apple Park Ring Terrace**: Curved glass corridor overlooking an expansive central grove of fruit trees and green hills, ultra-clean Scandinavian aesthetic.
- **Misty Ridge Deck**: High-altitude open-air teak deck overlooking misty green mountains at sunrise, holding a sleek glass tablet displaying system architecture nodes.

---

## 🎭 CareerVivid Product Value & Outro CTA Templates

### Core Storytelling Arc:
- **Pain Point Hook**: *"Learning System Design or Coding patterns alone feels confusing, overwhelming, or abstract. You study diagrams for weeks, but when you actually sit down to solve a problem or present in an interview, you get stuck."*
- **Career Agent Companion Solution**: *"CareerVivid features an active, real-time AI Companion — the Career Agent. As you practice system design scenarios or coding problems, the Career Agent sits right beside you step-by-step, providing real-time guidance on what to do next and instant interactive feedback."*

### Signature Outro Spoken CTA Templates (MANDATORY USE):
Every video script's final beat MUST end with one of the following signature spoken CTAs:

- **CTA Option A (High-Converting Problem Solver)**:
  - *"If you struggle, please check out CareerVivid dot app, and let CareerVivid help you gain the knowledge you struggle to gain and get that damn job quickly!"*

- **CTA Option B (Social Proof & Empowerment)**:
  - *"Many students use CareerVivid dot app to successfully pass their system design interviews. You can do it too!"*

---

## 📝 Gemini Omni Prompting Grammar

Every prompt submitted to Gemini Omni MUST follow this standard structure:

```text
@zhujiawen519 Cinematic AI Video & Spoken Narration Prompt:

Visual Prompt:
A cinematic 4K medium shot framing the young male software engineer avatar (@zhujiawen519) wearing a sleek crisp white button-down shirt (白色衬衫), standing inside a floor-to-ceiling glass pavilion at Apple Park surrounded by lush green redwood trees and natural morning sunlight. Warm, organic, serene, ultra-sleek and professional. No text on screen.

Audio & Spoken Narration:
The engineer speaks calmly and authoritatively in fluent English with complete sentence articulation:
"<Complete cinematic story sentence in English. Never cut off mid-sentence.>"
```

---

## ✂️ Watermark Removal & Asset Library Pipeline

### 1. Watermark Cropping (93% Vertical Crop)
Every downloaded raw `.mp4` clip from Gemini (`contribution.usercontent.google.com`) contains a Google AI watermark logo at the bottom.
Apply the following standard FFmpeg crop & 1080p upscaling filter:

```bash
ffmpeg -y -i "raw-clip.mp4" -vf "crop=in_w:in_h*0.93:0:0,scale=1920:1080:flags=bicubic,fps=24" -r 24 -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -preset fast -crf 18 -c:a aac -ar 48000 -ac 2 "clean-clip.mp4"
```

### 2. Video Concatenation
Mux clean clips into promotional films or lesson videos with `-movflags +faststart`:

```bash
ffmpeg -y -f concat -safe 0 -i "concat-list.txt" -c copy -movflags +faststart "public/system-design-lessons/design-<topic>-omni.mp4"
```

---

## 🤝 ego-browser Handoff Protocol

Whenever browser operations pause or complete:
```javascript
await claimTaskSpace(taskSpaceId);
await completeTaskSpace(taskSpaceId, { keep: true });
```
This relinquishes browser control back to the user immediately.
