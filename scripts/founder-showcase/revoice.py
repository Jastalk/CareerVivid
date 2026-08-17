#!/usr/bin/env python3
"""Re-record the two Section 4 narration lines to match the new screenshots.

Only these two lines change. Everything else in the 188s script is untouched.

Line 1 (sec4_part1) previously said only that CareerVivid "maps your entire
preparation curve". The new visuals show three tailored resumes and the export
menu, so the line now names the export formats that are on screen.

Line 2 (sec4_part2) said "twenty-two thousand verified interview loops". That
conflates two different numbers: 22,611 is the QUESTION count and 301 is the
loop count. The new screenshot puts "301 COMPANIES · 22,611 QUESTIONS · 821
STAGES" directly on screen, so the line now matches it.

Voice is Charon, the same narrator used for every other Charon stem.
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

KEY   = api_key()
MODEL = "gemini-3.1-flash-tts-preview"
VOICE = "Charon"

LINES = {
    # name: (text, budget_seconds)
    "sec4_part1_ecosystem_v2": (
        "Whether you're targeting software engineering, product management, "
        "or A.I. infrastructure, CareerVivid tailors your resume, then exports "
        "to PDF, Google Docs, or Word.",
        11.4,
    ),
    "sec4_part2_data_proof_v2": (
        "Every session is benchmarked against twenty-two thousand, six hundred "
        "and eleven real interview questions, drawn from three hundred and one "
        "company hiring loops.",
        11.5,
    ),
}

def synth(text):
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/"
           f"{MODEL}:generateContent?key={KEY}")
    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}},
        },
    }
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
    return base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])

for name, (text, budget) in LINES.items():
    pcm = synth(text)                       # audio/L16, 24 kHz, mono
    raw = os.path.join(OUTDIR, name + "_24k.wav")
    with wave.open(raw, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000)
        w.writeframes(pcm)

    final = os.path.join(OUTDIR, name + ".wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw,
                    "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", final], check=True)
    os.remove(raw)

    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final],
        capture_output=True, text=True).stdout.strip())
    flag = "OK " if dur <= budget else "OVER"
    print(f"  [{flag}] {name}: {dur:.2f}s (budget {budget:.1f}s)")
    if dur > budget:
        print(f"         -> shorten the text by ~{int((dur-budget)*2.1)} words and rerun")
