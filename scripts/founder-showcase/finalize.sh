#!/usr/bin/env bash
# Mux the re-rendered picture with the rebuilt audio and verify the result.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VID="$HERE/video_v2.mp4"
AUD="$HERE/master_audio_v2.wav"
OUT="$HERE/../../careervivid-founder-showcase-deluxe-v2.mp4"
OLD="$HERE/../../careervivid-founder-showcase-deluxe.mp4"

[[ -f "$VID" ]] || { echo "missing $VID — run render.mjs first"; exit 1; }
[[ -f "$AUD" ]] || { echo "missing $AUD — run build_audio.py first"; exit 1; }

echo "muxing -> $OUT"
ffmpeg -y -v error \
  -i "$VID" -i "$AUD" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy \
  -c:a aac -b:a 256k -ar 48000 -ac 2 \
  -shortest -movflags +faststart \
  "$OUT"

echo
echo "================= VERIFY ================="
probe () {
  local f="$1" label="$2"
  local dur fps nb w h br size mean
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of csv=p=0 "$f")
  nb=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$f")
  w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f")
  h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$f")
  br=$(ffprobe -v error -show_entries format=bit_rate -of csv=p=0 "$f")
  size=$(du -h "$f" | cut -f1)
  mean=$(ffmpeg -i "$f" -af volumedetect -f null - 2>&1 | grep mean_volume | awk '{print $5,$6}')
  printf "%-10s %sx%s  %ss  %s fps  %s frames  %s kbps  %s  audio %s\n" \
    "$label" "$w" "$h" "${dur%.*}" "$fps" "$nb" "$((br/1000))" "$size" "$mean"
}
[[ -f "$OLD" ]] && probe "$OLD" "OLD"
probe "$OUT" "NEW"

echo
echo "--- unique-frame check (duplicate frames = judder) ---"
for f in "$OLD" "$OUT"; do
  [[ -f "$f" ]] || continue
  kept=$(ffmpeg -i "$f" -vf "mpdecimate=hi=64*8:lo=64*3:frac=0.05" -f null - 2>&1 \
        | grep -oE 'frame= *[0-9]+' | tail -1 | grep -oE '[0-9]+')
  total=$(ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 "$f")
  printf "  %-58s %s unique / %s total\n" "$(basename "$f")" "${kept:-?}" "$total"
done

echo
echo "--- per-25s audio level (should be flat, ~-17 dB) ---"
for s in 0 30 60 90 120 150 175; do
  v=$(ffmpeg -ss $s -t 22 -i "$OUT" -af volumedetect -f null - 2>&1 | grep mean_volume | awk '{print $5,$6}')
  printf "  t=%-5s %s\n" "${s}s" "$v"
done

# The CRF-17 60fps file is the archival master. It is too heavy to drop on a
# landing page or hand to a social platform, both of which will re-encode it
# anyway — so also emit a delivery cut. 30fps here is not a downgrade: the
# source has a unique frame at every 60fps step, so halving it is a clean
# decimation rather than the 15x frame-hold that caused the original judder.
WEB="$HERE/../../careervivid-founder-showcase-v2-web.mp4"
echo
echo "encoding web delivery cut -> $WEB"
ffmpeg -y -v error -i "$OUT" \
  -c:v libx264 -preset slow -crf 21 -maxrate 8M -bufsize 16M \
  -vf "fps=30" -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -movflags +faststart "$WEB"
echo
echo "wrote master : $OUT"
echo "wrote web    : $WEB"
cp "$OUT" "/Users/jiawenzhu/Desktop/careervivid-founder-showcase-deluxe-v2.mp4"
cp "$WEB" "/Users/jiawenzhu/Desktop/careervivid-founder-showcase-v2-web.mp4"
echo "copied to Desktop:"
echo "  /Users/jiawenzhu/Desktop/careervivid-founder-showcase-deluxe-v2.mp4"
echo "  /Users/jiawenzhu/Desktop/careervivid-founder-showcase-v2-web.mp4"
