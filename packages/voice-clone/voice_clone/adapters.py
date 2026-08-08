"""
Per-engine synthesis, run in the engine's own interpreter.

Each model has a different API and an incompatible dependency set, so none of
them can be imported into this process. Instead a small script is written to a
temp file and executed by the engine's venv python; it writes a wav and prints
one line of JSON. The contract is deliberately tiny — a path and a sample rate —
because anything richer would have to be kept in sync across four libraries.

F5-TTS is the exception: it may already be importable here, and when it is the
in-process path is used, which keeps the warm-model behaviour that `batch`
depends on.
"""
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from . import engines

# Each script receives REF, REF_TEXT, TEXT, OUT, SPEED via a JSON argument and
# must print {"sample_rate": int} on the last line of stdout.

SCRIPTS = {
    "chatterbox": '''
import json, sys, warnings
warnings.filterwarnings("ignore")
cfg = json.loads(sys.argv[1])
import torch, torchaudio

# Chatterbox constructs perth.PerthImplicitWatermarker unconditionally, but
# perth sets that name to None when its own optional TensorFlow import fails —
# so the failure surfaces as "NoneType is not callable" from inside the model
# constructor, which points nowhere useful. The watermarker is not needed for
# local synthesis; the no-op one satisfies the call.
import perth
if perth.PerthImplicitWatermarker is None:
    perth.PerthImplicitWatermarker = perth.DummyWatermarker

from chatterbox.tts import ChatterboxTTS

device = "mps" if torch.backends.mps.is_available() else "cpu"
model = ChatterboxTTS.from_pretrained(device=device)
wav = model.generate(cfg["text"], audio_prompt_path=cfg["ref"])
torchaudio.save(cfg["out"], wav, model.sr)
print(json.dumps({"sample_rate": model.sr}))
''',

}


def synthesize(engine_key, ref, ref_text, text, out, speed=1.0, status=None):
    """
    Run one engine over one passage.

    Returns the same shape `Voice.say` returns, so callers do not branch on
    which engine produced the audio.
    """
    note = status or (lambda *_: None)
    engine = engines.get(engine_key)

    if not engine.installed():
        raise RuntimeError(
            f"{engine.label} is not installed.  voice engines --install {engine_key}")

    # F5 keeps the in-process path: it is the only engine that may already be
    # importable here, and losing the warm model would make `batch` pointless.
    if engine_key == "f5":
        from .synth import Voice
        note("loading model")
        voice = Voice(ref, ref_text, status=status)
        return voice.say(text, out, speed=speed)

    if engine_key not in SCRIPTS:
        raise RuntimeError(f"No adapter written for {engine_key}.")

    cfg = {"ref": str(ref), "ref_text": ref_text, "text": text,
           "out": str(out), "speed": speed}

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as fh:
        fh.write(SCRIPTS[engine_key])
        script = fh.name

    note(f"running {engine.label}")
    t0 = time.time()
    proc = subprocess.run(
        [str(engine.python_bin), script, json.dumps(cfg)],
        capture_output=True, text=True)
    elapsed = time.time() - t0
    Path(script).unlink(missing_ok=True)

    if proc.returncode != 0 or not Path(out).exists():
        # Show what the engine actually said. These failures are usually a
        # missing model download or an unsupported op on MPS, and the message
        # names which.
        tail = (proc.stderr or proc.stdout or "").strip().splitlines()
        detail = "\n    ".join(tail[-6:]) if tail else "no output"
        raise RuntimeError(f"{engine.label} failed:\n    {detail}")

    import soundfile as sf
    info = sf.info(str(out))
    return {"path": str(out), "duration": info.duration, "elapsed": elapsed,
            "realtime": elapsed / max(info.duration, 0.01), "chunks": 1,
            "engine": engine.label}
