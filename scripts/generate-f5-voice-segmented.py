#!/usr/bin/env python3
"""
F5-TTS segmented voice synthesis.

Long narration is split into clauses, synthesised one at a time, and stitched
back together. Three things about how it does that are load-bearing.

**The reference is encoded once, not per chunk.** `F5TTS.infer()` re-runs
`preprocess_ref_audio_text()` on every call — reading the wav, extracting mel,
aligning the transcript — and that cost is fixed, independent of how long the
sentence being generated is. Across dozens of chunks it was the single largest
term in the runtime. `preprocess_ref_audio_text()` is called once here and the
result reused, which is what `infer_process()` expects anyway.

**Chunks are larger.** The old 140-character limit produced roughly twice as
many chunks as necessary, and every chunk pays that fixed overhead. F5-TTS holds
quality comfortably to ~300 characters.

**Stitching happens in memory.** The old path wrote a temp wav per chunk and
read them all back to concatenate. Same result, dozens of fewer disk round
trips, and it lets the joins be cross-faded rather than butted together — a hard
splice between two independently sampled chunks clicks.

On quality, the biggest lever is not in this file: the reference recording's
sample rate. F5-TTS works at 24 kHz internally, so a 16 kHz reference has
nothing above 8 kHz — no sibilance, no breath, no lip detail — and the model can
only invent it. Re-record at 44.1/48 kHz before tuning anything here.
"""
import os
import re
import sys
import time
import argparse
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

os.environ["PYTHONHASHSEED"] = "random"

# Long enough that the fixed per-chunk cost is amortised, short enough that
# F5-TTS still holds prosody together.
MAX_CHUNK_CHARS = 280


def split_into_sentences(text, max_chars=MAX_CHUNK_CHARS):
    """Split on sentence ends, then on clause ends only when still too long."""
    chunks = []
    for sentence in re.split(r'(?<=[.!?])\s+', text.strip()):
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) <= max_chars:
            chunks.append(sentence)
            continue

        current = ""
        for clause in re.split(r'(?<=[,;:])\s+', sentence):
            if len(current) + len(clause) + 1 <= max_chars:
                current = (current + " " + clause).strip()
            else:
                if current:
                    chunks.append(current)
                current = clause
        if current:
            chunks.append(current)
    return [c for c in chunks if c]


def stitch(segments, sample_rate, cross_fade_sec=0.15):
    """
    Concatenate chunks with an equal-power cross-fade at each join.

    Each chunk is sampled independently, so its first and last samples do not
    line up with its neighbours'. Butting them together puts a step discontinuity
    at every join, which is audible as a click.
    """
    if not segments:
        return np.zeros(0, dtype=np.float32)
    if len(segments) == 1:
        return segments[0]

    n = int(cross_fade_sec * sample_rate)
    out = segments[0]
    for seg in segments[1:]:
        overlap = min(n, len(out), len(seg))
        if overlap < 32:
            out = np.concatenate([out, seg])
            continue
        # Equal power rather than linear: a linear fade dips in loudness at the
        # midpoint, which reads as a gap.
        t = np.linspace(0, 1, overlap, dtype=np.float32)
        fade_out, fade_in = np.cos(t * np.pi / 2), np.sin(t * np.pi / 2)
        joined = out[-overlap:] * fade_out + seg[:overlap] * fade_in
        out = np.concatenate([out[:-overlap], joined, seg[overlap:]])
    return out


def main():
    p = argparse.ArgumentParser(description="F5-TTS segmented voice synthesizer")
    p.add_argument("--ref-audio", required=True)
    p.add_argument("--ref-text", required=True,
                   help="Exact transcript of the reference, word for word. A "
                        "wrong transcript degrades the whole clone.")
    p.add_argument("--gen-text", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--nfe-step", type=int, default=16,
                   help="Flow-matching steps. The one parameter that trades "
                        "quality for time directly. Do not go below 16.")
    p.add_argument("--cfg-strength", type=float, default=2.5,
                   help="How closely to follow the reference timbre. 2.0 is the "
                        "library default; 2.5-3.0 sits closer to the speaker, "
                        "above 3 goes stiff.")
    p.add_argument("--speed", type=float, default=1.0)
    p.add_argument("--cross-fade", type=float, default=0.15)
    p.add_argument("--seed", type=int, default=1234,
                   help="Fixed by default. Without it every chunk samples a "
                        "slightly different timbre and the stitched result "
                        "drifts across the beat.")
    p.add_argument("--max-chars", type=int, default=MAX_CHUNK_CHARS)
    args = p.parse_args()

    ref_audio_path = Path(args.ref_audio)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    device = ("mps" if torch.backends.mps.is_available()
              else "cuda" if torch.cuda.is_available() else "cpu")

    chunks = split_into_sentences(args.gen_text, args.max_chars)

    ref_info = sf.info(str(ref_audio_path))
    print(f"🎙️  Reference: {ref_audio_path.name}  "
          f"{ref_info.samplerate} Hz · {ref_info.duration:.1f}s")
    if ref_info.samplerate < 24000:
        print(f"⚠️   Reference is {ref_info.samplerate} Hz. F5-TTS works at 24 kHz, "
              f"so everything above {ref_info.samplerate // 2} Hz is missing and the "
              f"model has to invent it. Re-record at 44.1 or 48 kHz for a real "
              f"quality gain — no parameter here can substitute.")
    print(f"⚡ Device: {device.upper()} · NFE {args.nfe_step} · "
          f"cfg {args.cfg_strength} · seed {args.seed}")
    print(f"📝 {len(chunks)} chunk(s), max {args.max_chars} chars:")
    for i, c in enumerate(chunks, 1):
        print(f"   [{i}] ({len(c)} chars) {c[:78]}{'…' if len(c) > 78 else ''}")
    print("-" * 60)

    from f5_tts.api import F5TTS
    from f5_tts.infer.utils_infer import preprocess_ref_audio_text, infer_process

    print(f"⏳ Loading F5-TTS on {device}…")
    load_start = time.time()
    f5tts = F5TTS(device=device)
    print(f"   model ready in {time.time() - load_start:.1f}s")

    # Encode the reference ONCE. This is the optimisation that matters: the call
    # below was previously repeated inside every chunk, and its cost does not
    # depend on the sentence being generated.
    prep_start = time.time()
    ref_audio, ref_text = preprocess_ref_audio_text(
        str(ref_audio_path.resolve()), args.ref_text)
    print(f"🔁 Reference encoded once in {time.time() - prep_start:.1f}s "
          f"(previously repeated per chunk)")

    torch.manual_seed(args.seed)

    segments, timings = [], []
    sample_rate = None
    beat_start = time.time()

    for i, chunk in enumerate(chunks, 1):
        print(f"⚡ [{i}/{len(chunks)}] {len(chunk)} chars…", end=" ", flush=True)
        t0 = time.time()
        wav, sr, _ = infer_process(
            ref_audio, ref_text, chunk,
            f5tts.ema_model, f5tts.vocoder,
            mel_spec_type=f5tts.mel_spec_type,
            device=device,
            nfe_step=args.nfe_step,
            cfg_strength=args.cfg_strength,
            speed=args.speed,
        )
        elapsed = time.time() - t0
        sample_rate = sr
        segments.append(np.asarray(wav, dtype=np.float32))
        timings.append(elapsed)
        print(f"{elapsed:.1f}s  ({len(wav) / sr:.1f}s audio)")

    audio = stitch(segments, sample_rate, args.cross_fade)
    sf.write(str(output_path), audio, sample_rate)

    total = time.time() - beat_start
    duration = len(audio) / sample_rate
    print("-" * 60)
    print(f"🎉 {output_path}")
    print(f"   {duration:.1f}s of audio in {total:.1f}s  "
          f"({total / duration:.2f}x realtime)")
    print(f"   slowest chunk {max(timings):.1f}s · fastest {min(timings):.1f}s")


if __name__ == "__main__":
    main()
