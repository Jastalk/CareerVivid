#!/usr/bin/env python3
"""Generate a replacement for sfx/whoosh.wav.

The original is a broadband noise sweep — the "blow" sound. It sits badly next
to chime_success and report_chime, which are tonal and clean. This builds a
transition that belongs to the same family: mostly a soft tonal lift with a
warm low settle, and only a trace of filtered air underneath. No hiss, no
sibilance, nothing above ~4 kHz.

Layers
  1. air      — noise through a 4-pole lowpass, raised-cosine swell. Very quiet;
                it exists to give the move a sense of travel, not to be heard.
  2. settle   — a sine gliding 132 -> 74 Hz with a fast attack and long decay.
                This is the "arrival" and carries most of the weight.
  3. lift     — two sines a perfect fifth apart (587.3 / 880.0 Hz, D5 + A5),
                fading in ahead of the settle and ringing briefly after it.
                Same interval family as the existing chimes.
"""
import math, struct, os, wave

SR    = 48000
DUR   = 0.95
HIT   = 0.58          # the moment the cut lands
N     = int(SR * DUR)
OUT   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sfx", "transition_v2.wav")

# deterministic noise — no seed drift between rebuilds
_s = 0x2F6E2B1
def rnd():
    global _s
    _s = (1103515245 * _s + 12345) & 0x7FFFFFFF
    return (_s / 0x3FFFFFFF) - 1.0

def onepole(buf, cutoff):
    a = math.exp(-2.0 * math.pi * cutoff / SR)
    y, out = 0.0, []
    for x in buf:
        y = (1 - a) * x + a * y
        out.append(y)
    return out

left, right = [], []

# ---- layer 1: air -------------------------------------------------------
air = [rnd() for _ in range(N)]
for _ in range(4):                      # 4-pole cascade kills all the hiss
    air = onepole(air, 1400)
peak = max(abs(v) for v in air) or 1.0
air = [v / peak for v in air]

# ---- render -------------------------------------------------------------
for i in range(N):
    t = i / SR

    # swell in, then fall away just after the hit
    if t < HIT:
        e_air = 0.5 - 0.5 * math.cos(math.pi * (t / HIT))       # raised cosine 0->1
    else:
        e_air = math.exp(-(t - HIT) * 7.5)
    a = air[i] * e_air * 0.085

    # low settle, glides down into the cut
    if t >= HIT - 0.03:
        u = t - (HIT - 0.03)
        f = 132.0 * math.exp(-u * 6.2) + 74.0 * (1 - math.exp(-u * 6.2))
        e = min(1.0, u / 0.012) * math.exp(-u * 5.0)
        s = math.sin(2 * math.pi * f * u) * e * 0.30
    else:
        s = 0.0

    # tonal lift — fifth, in before the hit and ringing after
    l = 0.0
    for freq, amp in ((587.33, 0.052), (880.00, 0.038)):
        if t >= HIT - 0.26:
            u = t - (HIT - 0.26)
            e = min(1.0, u / 0.09) * math.exp(-max(0.0, u - 0.09) * 4.4)
            l += math.sin(2 * math.pi * freq * t) * e * amp

    dry = a + s + l
    # a few samples of offset on the air only — width without phase damage
    aw = air[max(0, i - 90)] * e_air * 0.085
    left.append(dry)
    right.append(aw + s + l)

# ---- normalise + write --------------------------------------------------
pk = max(max(abs(v) for v in left), max(abs(v) for v in right)) or 1.0
g = 0.89 / pk
frames = bytearray()
for a, b in zip(left, right):
    frames += struct.pack("<hh", int(a * g * 32767), int(b * g * 32767))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(bytes(frames))
print("wrote", os.path.normpath(OUT), f"({DUR}s, hit at {HIT}s)")
