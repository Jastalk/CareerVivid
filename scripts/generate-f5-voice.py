#!/usr/bin/env python3
import os
import sys
# Set environment variables for Python 3.14 multiprocessing compatibility
os.environ["PYTHONHASHSEED"] = "random"

import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="F5-TTS Zero-Shot Voice Cloning Generator")
    parser.add_argument("--ref-audio", required=True, help="Path to reference prompt audio (.wav/.m4a/.mp3)")
    parser.add_argument("--ref-text", required=True, help="Exact transcript of the reference audio")
    parser.add_argument("--gen-text", required=True, help="Target text to synthesize")
    parser.add_argument("--output", default="assets/voice_cloning/output.wav", help="Output path for synthesized audio")

    args = parser.parse_args()

    ref_audio_path = Path(args.ref_audio)
    if not ref_audio_path.exists():
        print(f"❌ Error: Reference audio file '{args.ref_audio}' does not exist.")
        sys.exit(1)

    print(f"🎙️ Reference Audio: {args.ref_audio}")
    print(f"📝 Reference Text:  {args.ref_text}")
    print(f"🗣️ Generating Text: {args.gen_text}")
    print(f"💾 Target Output:   {args.output}")
    print("-" * 50)

    try:
        from f5_tts.api import F5TTS

        print("⏳ Loading F5-TTS model weights...")
        f5tts = F5TTS()

        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        print("⚡ Running zero-shot voice synthesis...")
        wav, sr, spect = f5tts.infer(
            ref_file=str(ref_audio_path.resolve()),
            ref_text=args.ref_text,
            gen_text=args.gen_text,
            file_wave=str(output_path.resolve())
        )
        print(f"✅ Voice synthesis complete! Saved to: {args.output}")
        print(f"📊 Sample rate: {sr} Hz | Audio shape: {wav.shape if hasattr(wav, 'shape') else len(wav)}")
    except Exception as e:
        print(f"❌ Synthesis error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
