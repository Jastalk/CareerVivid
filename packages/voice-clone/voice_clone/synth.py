"""
Segmented synthesis.

Long text is split into clauses, generated one at a time, and stitched back
together. Three details carry the performance and the quality:

**The reference is encoded once, not per chunk.** `F5TTS.infer()` re-runs
`preprocess_ref_audio_text()` on every call — reading the wav, extracting mel,
aligning the transcript — and that cost is fixed regardless of how long the
sentence being generated is. Hoisting it out took one beat from 209s to 54s.

**Chunks are ~280 characters.** A 140-character limit produced roughly twice as
many chunks, and every chunk pays the fixed per-call overhead. F5-TTS holds
prosody comfortably to about 300.

**Joins are cross-faded.** Each chunk is sampled independently, so its edge
samples do not line up with its neighbour's. Butting them together leaves a step
discontinuity, audible as a click at every join.
"""
import re
import time

import numpy as np
import soundfile as sf
import torch

from .quiet import captured, silence_imports

silence_imports()

MAX_CHUNK_CHARS = 280


def pick_device():
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def split_text(text, max_chars=MAX_CHUNK_CHARS):
    """Split on sentence ends, then on clause ends only when still too long."""
    chunks = []
    for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) <= max_chars:
            chunks.append(sentence)
            continue
        current = ""
        for clause in re.split(r"(?<=[,;:])\s+", sentence):
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
    """Concatenate with an equal-power cross-fade at each join."""
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
        # Equal power, not linear: a linear fade dips in loudness halfway
        # through, which reads as a gap rather than a join.
        t = np.linspace(0, 1, overlap, dtype=np.float32)
        joined = out[-overlap:] * np.cos(t * np.pi / 2) + seg[:overlap] * np.sin(t * np.pi / 2)
        out = np.concatenate([out[:-overlap], joined, seg[overlap:]])
    return out


class Voice:
    """
    A loaded model plus one encoded reference.

    Holding these together is the point: build it once and every `say()` skips
    both the model load and the reference encode. Synthesising eight beats
    through one Voice is dramatically cheaper than eight separate processes.
    """

    def __init__(self, ref_audio, ref_text, device=None, log=None, status=None):
        """
        `status` is an optional callable taking a short label, used to drive a
        spinner while the two slow setup steps run. Both print freely, so they
        happen inside `captured()` and the interface reports progress itself.
        """
        self.device = device or pick_device()
        self.log = log or (lambda *_: None)
        note = status or (lambda *_: None)

        note("loading model")
        t0 = time.time()
        with captured():
            from f5_tts.api import F5TTS
            self.model = F5TTS(device=self.device)
        self.model_load_secs = time.time() - t0

        note("encoding reference")
        t0 = time.time()
        with captured():
            from f5_tts.infer.utils_infer import preprocess_ref_audio_text
            self.ref_audio, self.ref_text = preprocess_ref_audio_text(str(ref_audio), ref_text)
        self.ref_encode_secs = time.time() - t0

    def say(self, text, out_path, nfe_step=16, cfg_strength=2.5, speed=1.0,
            cross_fade=0.15, seed=1234, max_chars=MAX_CHUNK_CHARS, on_chunk=None):
        with captured():
            from f5_tts.infer.utils_infer import infer_process

        chunks = split_text(text, max_chars)
        report = on_chunk or (lambda *_: None)
        # Fixed by default: without it each chunk samples a slightly different
        # timbre and the stitched result drifts across a long passage.
        torch.manual_seed(seed)

        segments, sample_rate = [], None
        t_all = time.time()
        for i, chunk in enumerate(chunks, 1):
            t0 = time.time()
            # infer_process prints and draws a tqdm bar; the caller's own
            # progress display is the one that should be visible.
            with captured():
                wav, sr, _ = infer_process(
                    self.ref_audio, self.ref_text, chunk,
                    self.model.ema_model, self.model.vocoder,
                    mel_spec_type=self.model.mel_spec_type,
                    device=self.device,
                    nfe_step=nfe_step,
                    cfg_strength=cfg_strength,
                    speed=speed,
                )
            sample_rate = sr
            segments.append(np.asarray(wav, dtype=np.float32))
            report(i, len(chunks), len(chunk), len(wav) / sr, time.time() - t0)

        audio = stitch(segments, sample_rate, cross_fade)
        sf.write(str(out_path), audio, sample_rate)

        elapsed = time.time() - t_all
        duration = len(audio) / sample_rate
        return {"path": str(out_path), "duration": duration,
                "elapsed": elapsed, "realtime": elapsed / duration, "chunks": len(chunks)}
