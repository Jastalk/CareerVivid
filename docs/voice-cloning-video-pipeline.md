# CareerVivid System Design Video & Zero-Shot Voice Cloning Pipeline Architecture

## Executive Summary
This document defines the complete architecture for CareerVivid's System Design Video Generation & Zero-Shot Local Voice Cloning Pipeline. Other AI agents, subagents, and developers can inspect, benchmark, and optimize this modular pipeline.

---

## 1. File Structure & Core Assets

### 📁 Voice Assets & Model Environment
- **Reference Voice Sample**: [`assets/voice_cloning/evan_intro.wav`](file:///Users/jiawenzhu/Developer/careervivid/assets/voice_cloning/evan_intro.wav) (8.44s audio prompt recorded in Voice Memos)
- **Reference Audio Transcript**: `"Hey, how are you today? I'm doing great. My name is Jowen. I have a specialty in creating awesome AI products."`
- **F5-TTS Virtual Environment**: `.venv-f5` (`uv` environment with `f5-tts`, `torch==2.13.0` with Metal/MPS acceleration)
- **Cached Voice Clips**: [`public/assets/system-design-narration/sd-llm-inference/en/evan-voice/`](file:///Users/jiawenzhu/Developer/careervivid/public/assets/system-design-narration/sd-llm-inference/en/evan-voice/)

### 📁 Scripts & Core Pipelines
- **Voice Synthesizer**: [`scripts/generate-f5-voice-segmented.py`](file:///Users/jiawenzhu/Developer/careervivid/scripts/generate-f5-voice-segmented.py) (Sentence-level chunked zero-shot voice synthesizer with MPS hardware acceleration & NFE step control)
- **Segmented Orchestrator**: [`scripts/system-design-interview/generate-llm-inference-evan-segmented.mjs`](file:///Users/jiawenzhu/Developer/careervivid/scripts/system-design-interview/generate-llm-inference-evan-segmented.mjs) (Beat-by-beat orchestrator with caching and timing breakdown)
- **Film Assembly**: [`scripts/system-design-interview/build-llm-inference-evan-voice-film.mjs`](file:///Users/jiawenzhu/Developer/careervivid/scripts/system-design-interview/build-llm-inference-evan-voice-film.mjs) (Encodes 1080p MP4 with progressive diagrams, Veo beds, cloned audio, and BGM)
- **Script Definition**: [`scripts/system-design-interview/systemDesignLlmInferenceScript.ts`](file:///Users/jiawenzhu/Developer/careervivid/scripts/system-design-interview/systemDesignLlmInferenceScript.ts) (8 Beat breakdown & narration text)

### 📹 Video Outputs
- **Original Video**: [`public/system-design-lessons/design-llm-inference.mp4`](file:///Users/jiawenzhu/Developer/careervivid/public/system-design-lessons/design-llm-inference.mp4) (Default TTS voice)
- **Cloned Voice Video**: [`public/system-design-lessons/design-llm-inference-evan-voice.mp4`](file:///Users/jiawenzhu/Developer/careervivid/public/system-design-lessons/design-llm-inference-evan-voice.mp4) (Evan's cloned voice)

---

## 2. Full Architecture Workflow

```
+-------------------------------------------------------------------------------+
| STAGE 1: Reference Audio Capture & Normalization                                |
| - Reference Wav: assets/voice_cloning/evan_intro.wav (8.44s)                 |
| - Reference Text: "Hey, how are you today? I'm doing great..."                |
+-------------------------------------------------------------------------------+
                                       │
                                       ▼
+-------------------------------------------------------------------------------+
| STAGE 2: Beat-by-Beat & Sentence-Level Audio Synthesis (F5-TTS)               |
| - Execution: PYTHONHASHSEED=random ./.venv-f5/bin/python scripts/...          |
| - Model: SWivid/F5-TTS (Flow Matching Diffusion Transformer)                  |
| - Acceleration: Apple Silicon Metal / PyTorch MPS (device="mps")              |
| - Granularity: Sentence-by-Sentence Chunking -> Concat to Beat WAV            |
| - Cache Strategy: Skip unchanged beat WAVs automatically                      |
+-------------------------------------------------------------------------------+
                                       │
                                       ▼
+-------------------------------------------------------------------------------+
| STAGE 3: Programmatic Progressive Diagram & Veo Clip Rendering                |
| - Beats 1 & 8: Veo 3.1 Lite video clip + Boomerang bed                       |
| - Beats 2 ~ 7: Playwright 1080p DOM progressive node/edge rendering @ 30fps   |
+-------------------------------------------------------------------------------+
                                       │
                                       ▼
+-------------------------------------------------------------------------------+
| STAGE 4: FFmpeg Muxing & Master Video Export                                  |
| - Sync beat audio duration with video frame rates                            |
| - Mix cloned voice with low-volume background soundtrack (bgm-d12.mp3, 5%)    |
| - Export 1080p H.264 MP4: design-llm-inference-evan-voice.mp4                 |
+-------------------------------------------------------------------------------+
```

---

## 3. Benchmarks & Performance Metrics (Apple M4 16GB)

- **Total Video Runtime**: 2.94 minutes (176.5 seconds across 8 Beats)
- **Voice Synthesis Time per Beat**: ~90s – 120s per Beat (Sentence-chunked, 16 NFE steps)
- **Total Audio Synthesis Time**: ~11.25 minutes for entire 3-minute lesson
- **Memory Footprint**: ~3.5 GB Unified Memory (VRAM)
- **Video Assembly Time**: ~15 seconds (FFmpeg hardware video encoding)

---

## 4. Potential Optimization Areas for Future Agents

1. **NFE Step Optimization**: Test lowering `nfe_step` from 16 down to 8 or 10 for 2x faster audio synthesis speed while benchmarking audio quality.
2. **CosyVoice2 Comparison**: Benchmark `CosyVoice2-0.5B` vs `F5-TTS` for latency and emotion control tags (`<laugh>`, `<sigh>`).
3. **Batch Parallelization**: Run Beat synthesis in parallel workers if VRAM permits (e.g. 2 parallel beats on M4 16GB).
