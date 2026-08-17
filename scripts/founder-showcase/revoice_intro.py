#!/usr/bin/env python3
"""Re-record the two Section 1 narration lines.

The original opening was abstract and asked the audience a question it had no
reason to care about yet ("Why is an engineer who builds complex systems
rethinking the entire job hunt?"). It also made a biographical claim the sources
do not support ("building distributed infrastructure", "seeing thousands of
engineers get filtered out").

The replacement leads with the thing the viewer already feels - the job hunt
costs hundreds of hours and grinds down your confidence - and only then
introduces the person, plainly. It is written against the real photos: coding
events, conversations with engineers, and the walk he takes to reset.

Everything after 35s is untouched.
"""
import os, json, base64, wave, subprocess, urllib.request, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = "/Users/jiawenzhu/Developer/careervivid"
OUTDIR = os.path.join(HERE, "vo")
os.makedirs(OUTDIR, exist_ok=True)

def api_key():
    for line in open(os.path.join(REPO, ".env"), encoding="utf-8"):
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("GEMINI_API_KEY not found in .env")

KEY, MODEL, VOICE = api_key(), "gemini-3.1-flash-tts-preview", "Charon"

LINES = {
    # slot 0.60 -> 21.60
    "sec1_part1_hook_v2": (
        "Landing a job takes hundreds of hours. Sometimes thousands. "
        "Applications that vanish. Interviews you never hear back from. "
        "And somewhere in all of it, your confidence quietly runs out. "
        "Practice should feel like the real thing. That is the whole idea.",
        20.3,
    ),
    # slot 21.60 -> 35.00
    "sec1_part2_vision_v2": (
        "Jiawen Zhu is a full-stack engineer who spends his time around people "
        "going through exactly that. He wanted to build something that gives "
        "them their confidence back. So he built CareerVivid.",
        12.9,
    ),
}

def synth(text):
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{MODEL}:generateContent?key={KEY}")
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
    return base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])

for name, (text, budget) in LINES.items():
    pcm = synth(text)
    raw = os.path.join(OUTDIR, name + "_24k.wav")
    with wave.open(raw, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    final = os.path.join(OUTDIR, name + ".wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw,
                    "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", final], check=True)
    os.remove(raw)
    dur = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                                "-of","csv=p=0", final], capture_output=True, text=True).stdout.strip())
    print(f"  [{'OK ' if dur <= budget else 'OVER'}] {name}: {dur:.2f}s (budget {budget:.1f}s)")
