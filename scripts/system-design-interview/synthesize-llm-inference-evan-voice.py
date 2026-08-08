#!/usr/bin/env python3
import os
import sys
import time
from pathlib import Path

BEATS = [
    {
        "id": "beat-1-hook",
        "text": "Serving a 70-billion parameter model to 10,000 concurrent users requires massive GPU clusters. Yet standard inference engines waste up to 80 percent of expensive H100 VRAM on pre-allocated key-value cache memory, driving per-token serving costs through the roof! How do top AI labs achieve 2,000 tokens per second at 99.9% reliability?"
    },
    {
        "id": "beat-2-requirements",
        "text": "Let us define the non-negotiable SLAs. We must support 5,000 active requests per second with a time-to-first-token under 50 milliseconds and inter-token latency under 15 milliseconds. On an 8-way Nvidia H100 cluster with 640 gigabytes of total High Bandwidth Memory, we must sustain 150 tokens per second per user session without running out of memory."
    },
    {
        "id": "beat-3-naive-approach",
        "text": "In naive auto-regressive generation, the model allocates a contiguous memory block for the maximum context window of 8,192 tokens per request. For a 70B FP16 model, each request reserves 1.2 gigabytes of KV cache memory upfront, regardless of whether the user prompts 10 tokens or 8,000 tokens."
    },
    {
        "id": "beat-4-why-it-breaks",
        "text": "This naive design breaks under real traffic. Over 60 to 80 percent of allocated VRAM sits completely idle due to internal fragmentation! When concurrent requests spike to 500 sessions, GPU memory fills up, causing catastrophic Out-Of-Memory crashes and forcing request batch sizes down to just 16."
    },
    {
        "id": "beat-5-core-architecture",
        "text": "To solve memory waste, modern engines implement PagedAttention! Inspired by OS virtual memory, PagedAttention partitions the KV cache into fixed-size physical blocks of 16 tokens. A central Page Table maps logical token positions to non-contiguous physical VRAM blocks, eliminating internal fragmentation and enabling dynamic allocation on demand."
    },
    {
        "id": "beat-6-deep-dive",
        "text": "PagedAttention enables Continuous Batching and Copy-On-Write memory sharing. Instead of waiting for an entire batch to finish, new requests join the iteration loop dynamically at step boundaries! When 1,000 users query the same 4,000-token system prompt, PagedAttention shares physical memory pages across sessions, reducing prompt memory overhead by 95 percent."
    },
    {
        "id": "beat-7-tradeoffs",
        "text": "What are the engineering tradeoffs? Small 16-token page blocks eliminate memory waste, but increase CPU Page Table lookup overhead by 5 percent during high-frequency attention kernels. Selecting larger 64-token blocks improves GPU memory bandwidth utilization by 12 percent, but slightly increases fragmentation on short generation tasks."
    },
    {
        "id": "beat-8-recap-cta",
        "text": "By combining PagedAttention virtual memory, continuous batching, and shared prompt prefixing, modern LLM inference systems achieve 5x throughput improvements on H100 clusters while maintaining sub-50ms latency! If you enjoyed this system design breakdown, make sure to like and subscribe for more. Practice interactive scenarios and 300+ real tech company interview questions today on CareerVivid."
    }
]

REF_AUDIO = "assets/voice_cloning/evan_intro.wav"
REF_TEXT = "Hey, how are you today? I'm doing great. My name is Jowen. I have a specialty in creating awesome AI products."
OUT_DIR = Path("public/assets/system-design-narration/sd-llm-inference/en/evan-voice")

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("🎙️ Starting F5-TTS Voice Cloning Synthesis for LLM Inference Serving Video")
    print(f"📁 Reference Audio: {REF_AUDIO}")
    print(f"📂 Output Directory: {OUT_DIR}")
    print("=" * 60)

    from f5_tts.api import F5TTS

    print("\n⏳ Initializing F5-TTS Model on Apple Silicon MPS...")
    init_start = time.time()
    f5tts = F5TTS()
    init_time = time.time() - init_start
    print(f"✅ Model loaded in {init_time:.2f} seconds.")

    synth_start = time.time()
    generated_files = []

    for i, beat in enumerate(BEATS, 1):
        beat_id = beat["id"]
        gen_text = beat["text"]
        out_file = OUT_DIR / f"{beat_id}.wav"

        print(f"\n🗣️ [{i}/{len(BEATS)}] Synthesizing beat: {beat_id}")
        print(f"   Text ({len(gen_text)} chars): \"{gen_text[:80]}...\"")

        b_start = time.time()
        wav, sr, spect = f5tts.infer(
            ref_file=str(Path(REF_AUDIO).resolve()),
            ref_text=REF_TEXT,
            gen_text=gen_text,
            file_wave=str(out_file.resolve())
        )
        b_elapsed = time.time() - b_start
        print(f"   ✅ Beat synthesis done in {b_elapsed:.2f}s -> {out_file.name}")
        generated_files.append((beat_id, b_elapsed, out_file))

    total_synth_time = time.time() - synth_start

    print("\n" + "=" * 60)
    print("🎉 ALL AUDIO SYNTHESIS COMPLETE!")
    print(f"⏱️ TOTAL AUDIO SYNTHESIS TIME: {total_synth_time:.2f} seconds ({total_synth_time/60:.2f} mins)")
    print("=" * 60)

    for b_id, b_time, b_path in generated_files:
        print(f"  • {b_id.padEnd(25) if hasattr(b_id, 'padEnd') else b_id:<25}: {b_time:.2f}s")

    # Write timing report file for easy reference
    with open(OUT_DIR / "timing_report.txt", "w") as f:
        f.write(f"Total Synthesis Time: {total_synth_time:.2f} seconds\n")
        for b_id, b_time, _ in generated_files:
            f.write(f"{b_id}: {b_time:.2f}s\n")

if __name__ == "__main__":
    main()
