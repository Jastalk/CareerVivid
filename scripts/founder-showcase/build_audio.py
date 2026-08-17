#!/usr/bin/env python3
"""Rebuild the showcase master audio.

The shipped master_audio_deluxe.wav is the correct mix attenuated by ~30 dB:
its first 25s sit at -53.5 dBFS mean while the source VO stems are at -20.8.
That makes the narration inaudible for most of the film. This reassembles the
same stems, in the same slots, at broadcast level.

Slot offsets are taken from the timeline cue points in the HTML director so the
rebuilt audio stays frame-aligned with the visuals.
"""
import subprocess, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUD  = os.path.join(BASE, "audio")
SFX  = os.path.join(BASE, "sfx")
OUT  = os.path.join(BASE, "v2", "master_audio_v2.wav")
DUR  = 200.0

# (file, start_seconds) - narration, in script order
VO = [
    # Section 1 is re-voiced: the old opening asked an abstract question and
    # made a biographical claim the sources do not support. The new lines lead
    # with the cost of the job hunt, then introduce him plainly.
    ("v2/vo/sec1_part1_hook_v2.wav",    0.60),
    ("v2/vo/sec1_part2_vision_v2.wav", 21.20),
    ("sec2_part1_resume_intro.wav",   35.40),
    ("sec2_part2_resume_transform.wav", 53.20),
    ("sec3_part1_interview_intro.wav", 71.90),
    ("sec3_part2_candidate_ans1.wav",  87.20),
    ("sec3_part3_agent_pushback.wav", 104.70),
    ("sec3_part4_candidate_ans2.wav", 120.20),
    ("sec3_part5_agent_verdict.wav",  127.90),
    ("sec3_part6_interview_recap.wav",135.30),
    ("v2/vo/sec4_part1_ecosystem_v2.wav",  147.80),
    ("v2/vo/sec4_part2_data_proof_v2.wav", 159.80),
    ("v2/vo/sec6_community_proof.wav",    170.20),
    ("sec5_part1_climax.wav",             186.20),
]

# (file, start_seconds, gain_dB) - SFX ship 20-35 dB under the VO, so lift them.
FX = [
    ("whoosh.wav",         34.90,  20),   # 0:35  founder -> resume
    ("whoosh.wav",         71.40,  20),   # 1:11  resume  -> system design
    ("transition_v2.wav", 147.05, -13),   # 2:27  design  -> ecosystem
    ("transition_v2.wav", 169.55, -14),   # 2:50  ecosystem -> community proof
    ("transition_v2.wav", 185.65, -14),   # 3:05  community proof -> final CTA
    ("chime_success.wav",  59.40,  22),   # lands as the ATS ring settles on 92
    ("typing_soft.wav",    87.00,  34),   # candidate begins speaking
    ("report_chime.wav",  135.00,  24),   # diagnostic report reveal
    ("transition_v2.wav", 159.35, -19),   # 2:39  soft mark between 4a and 4b
]

inputs, filters, labels = [], [], []
idx = 0

for fn, start in VO:
    path = os.path.join(BASE, fn) if "/" in fn else os.path.join(AUD, fn)
    if not os.path.exists(path):
        sys.exit("missing VO stem: " + path)
    inputs += ["-i", path]
    # Per-stem loudness normalise: the stems span -16.0 to -23.1 dB mean, and the
    # candidate voice is consistently ~5 dB under the narrator. Even them out
    # first so no single line ducks under the others in the mix.
    filters.append(
        f"[{idx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
        f"loudnorm=I=-17:TP=-1.5:LRA=11,"
        f"adelay={int(start*1000)}|{int(start*1000)}[v{idx}]"
    )
    labels.append(f"[v{idx}]")
    idx += 1

for fn, start, gain in FX:
    path = os.path.join(SFX, fn)
    if not os.path.exists(path):
        print("  ! skipping missing sfx:", fn); continue
    inputs += ["-i", path]
    filters.append(
        f"[{idx}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
        f"volume={gain}dB,adelay={int(start*1000)}|{int(start*1000)}[v{idx}]"
    )
    labels.append(f"[v{idx}]")
    idx += 1

# normalize=0 keeps amix from dividing every input by the input count, which is
# what would otherwise re-create the original too-quiet mix.
graph = ";".join(filters) + ";" + "".join(labels) + \
    f"amix=inputs={len(labels)}:duration=longest:normalize=0[mixed];" \
    f"[mixed]apad,atrim=0:{DUR},loudnorm=I=-14:TP=-1.0:LRA=11,alimiter=limit=0.95[out]"

cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + [
    "-filter_complex", graph, "-map", "[out]",
    "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", OUT,
]

print(f"assembling {len(VO)} VO stems + {len(FX)} sfx -> {OUT}")
subprocess.run(cmd, check=True)

r = subprocess.run(["ffmpeg", "-i", OUT, "-af", "volumedetect", "-f", "null", "-"],
                   capture_output=True, text=True)
for line in r.stderr.splitlines():
    if "mean_volume" in line or "max_volume" in line:
        print("  " + line.split("]")[-1].strip())
