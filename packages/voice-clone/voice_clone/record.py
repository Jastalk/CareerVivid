"""
Reference capture.

The sample rate is the whole reason this module exists. F5-TTS works at 24 kHz
internally, so a 16 kHz reference — which is what most phone voice-memo apps
produce — has nothing above 8 kHz. Sibilance, breath and lip detail are simply
absent and the model invents them, which is exactly what makes a clone sound
dull next to a commercial TTS voice. No synthesis parameter recovers it.

So capture at 48 kHz and refuse to pretend otherwise: `check()` reports what a
file actually is, and the CLI warns loudly rather than quietly producing a
mediocre clone.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

import soundfile as sf

SAMPLE_RATE = 48000

# F5-TTS clones best from 10–15 seconds. Shorter starves it of prosody; much
# longer stops helping and slows every synthesis that encodes it.
IDEAL_MIN, IDEAL_MAX = 10.0, 15.0


def _require_ffmpeg():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found. Install it with:  brew install ffmpeg")


def devices():
    """Input devices as [(index, name)], macOS only."""
    _require_ffmpeg()
    out = subprocess.run(
        ["ffmpeg", "-f", "avfoundation", "-list_devices", "true", "-i", ""],
        capture_output=True, text=True).stderr

    found, seen_audio = [], False
    for line in out.splitlines():
        if "AVFoundation audio devices" in line:
            seen_audio = True
            continue
        if not seen_audio:
            continue
        m = re.search(r"\[(\d+)\]\s+(.+)$", line)
        if m:
            found.append((int(m.group(1)), m.group(2).strip()))
    return found


def record(out_path, seconds, device=None):
    """Capture `seconds` of mono 48 kHz audio to `out_path`."""
    _require_ffmpeg()
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if device is None:
        found = devices()
        if not found:
            sys.exit("No audio input devices found.")
        # Prefer the built-in mic over virtual devices (Zoom, Loopback and
        # friends install themselves at index 0 and capture silence).
        device = next((i for i, n in found if "microphone" in n.lower()), found[0][0])

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "avfoundation", "-i", f":{device}",
        "-t", str(seconds), "-ar", str(SAMPLE_RATE), "-ac", "1",
        str(out_path),
    ], check=True)
    return out_path


def check(path):
    """Report a reference file's suitability: (sample_rate, duration, issues)."""
    info = sf.info(str(path))
    issues = []
    if info.samplerate < 24000:
        issues.append(
            f"{info.samplerate} Hz — F5-TTS works at 24 kHz, so everything above "
            f"{info.samplerate // 2} Hz is missing and gets invented. This is the "
            f"single biggest limit on how good the clone can sound. Re-record at 48 kHz."
        )
    if info.duration < IDEAL_MIN:
        issues.append(f"{info.duration:.1f}s — short. {IDEAL_MIN:.0f}–{IDEAL_MAX:.0f}s clones better.")
    elif info.duration > 30:
        issues.append(f"{info.duration:.1f}s — longer than needed; it slows every synthesis.")
    if info.channels > 1:
        issues.append(f"{info.channels} channels — mono is expected.")
    return info.samplerate, info.duration, issues
