"""
The engine registry.

Four models, one interface. They are not interchangeable in the ways that
matter, so the registry records the differences rather than hiding them:

  · **F5-TTS** — what everything else is measured against here. Note the
    licence: the *code* is MIT but the released weights are CC-BY-NC, because
    the Emilia training set is in-the-wild data. That makes the pretrained
    model unusable in a commercial product, which is the single most important
    fact on this page and the reason the others were added.
  · **Chatterbox** — MIT throughout, clones from ~5s, and carries an explicit
    emotion-exaggeration control. The closest drop-in replacement.

Each lives in its own virtualenv. They pull incompatible pins of torch, numba
and transformers, and a single shared environment resolves to whichever set
breaks the fewest of them — which in practice means one of them is always
broken. Isolation costs disk and buys the ability to install one without
disturbing the others.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ENV_ROOT = Path.home() / ".voice-clone" / "engines"


class Engine:
    """
    One model, in its own environment.

    `install_hint` is shown verbatim when the engine is missing, so it has to be
    a command that actually works rather than a description of one.
    """

    def __init__(self, key, label, licence, commercial, ref_seconds,
                 module, install_hint, python="3.12", notes=""):
        self.key = key
        self.label = label
        self.licence = licence
        self.commercial = commercial      # is the *released model* usable commercially
        self.ref_seconds = ref_seconds
        self.module = module              # import name used to detect presence
        self.install_hint = install_hint
        self.python = python
        self.notes = notes

    # ── environment ─────────────────────────────────────────────────────────

    @property
    def venv(self):
        return ENV_ROOT / self.key

    @property
    def python_bin(self):
        return self.venv / "bin" / "python"

    def installed(self):
        """True when this engine's environment exists and imports."""
        if self.key == "f5":
            # F5 may live in the tool's own environment rather than a per-engine
            # one, because it was installed before the registry existed.
            try:
                __import__(self.module)
                return True
            except Exception:
                pass
        if not self.python_bin.exists():
            return False
        probe = subprocess.run(
            [str(self.python_bin), "-c", f"import {self.module}"],
            capture_output=True)
        return probe.returncode == 0

    def install(self, log=print):
        """Create the venv and install this engine into it."""
        if not shutil.which("uv"):
            raise RuntimeError("uv not found. Install it: brew install uv")
        ENV_ROOT.mkdir(parents=True, exist_ok=True)
        log(f"creating {self.venv}")
        subprocess.run(["uv", "venv", "--python", self.python, str(self.venv)], check=True)
        log(f"installing {self.label} — this pulls a multi-gigabyte stack")
        subprocess.run(self.install_cmd(), check=True)
        return self.installed()

    def install_cmd(self):
        raise NotImplementedError


class PipEngine(Engine):
    def __init__(self, *a, packages=(), **kw):
        super().__init__(*a, **kw)
        self.packages = list(packages)

    def install_cmd(self):
        return ["uv", "pip", "install", "--python", str(self.python_bin), *self.packages]


REGISTRY = {}


def _add(engine):
    REGISTRY[engine.key] = engine
    return engine


_add(PipEngine(
    "f5", "F5-TTS", "code MIT · weights CC-BY-NC", False, 10,
    "f5_tts",
    "uv pip install --python <venv> f5-tts 'numba>=0.61' 'llvmlite>=0.44'",
    packages=["f5-tts", "numba>=0.61", "llvmlite>=0.44"],
    notes="Weights are non-commercial. Fine for testing, not for published work."))

_add(PipEngine(
    "chatterbox", "Chatterbox", "MIT", True, 5,
    "chatterbox",
    "voice engines install chatterbox",
    packages=["chatterbox-tts"],
    notes="Emotion-exaggeration control. Closest drop-in for F5."))

# Qwen3-TTS and CosyVoice 3 were both evaluated and removed.
#
# Qwen3-TTS does not do zero-shot cloning at all: the CustomVoice variant ships
# nine fixed timbres and takes no reference audio. The "clones from 3 seconds"
# claim came from a secondary comparison article, not the model card.
#
# CosyVoice 3 is real and does clone, but the PyPI package named `cosyvoice` is
# an unrelated API client — the model installs only from GitHub with a manual
# ~5GB weight download, and its Apple Silicon support is partial (the ONNX parts
# fall back to CPU). Worth revisiting for Chinese narration; not worth carrying
# a broken entry until then.

def get(key):
    if key not in REGISTRY:
        raise KeyError(f"Unknown engine {key!r}. Have: {', '.join(REGISTRY)}")
    return REGISTRY[key]


def available():
    return [e for e in REGISTRY.values() if e.installed()]


def default():
    """
    Prefer an engine whose weights can actually ship.

    F5 is last on purpose: it is the best-tuned path here but its weights are
    non-commercial, so it should never be what someone gets by accident.
    """
    for key in ("chatterbox", "f5"):
        engine = REGISTRY[key]
        if engine.installed():
            return engine
    return None
