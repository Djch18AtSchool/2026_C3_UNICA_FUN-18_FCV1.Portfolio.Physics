#!/usr/bin/env bash
# Compresses the raw DualSense clip of Tema 5 to 720p H.264 (≤ 15 MB) and extracts its poster.
# Usage: scripts/compress-video.sh media-raw/<clip>.mp4   (raw captures stay in media-raw/, untracked)
set -euo pipefail

readonly MAX_BYTES=$((15 * 1024 * 1024))
readonly POSTER_SECOND=2

if [[ $# -lt 1 || -z "$1" ]]; then
  echo "Uso: $0 media-raw/<entrada>" >&2
  echo "Comprime el video del tema 5 a public/media/tema-05-dualsense.mp4 y genera el póster JPG." >&2
  exit 64
fi

if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  echo "No se encontró ffmpeg/ffprobe en el PATH. Instálalo (p. ej. sudo apt install ffmpeg) y vuelve a intentarlo." >&2
  exit 69
fi

input="$1"
if [[ ! -f "$input" ]]; then
  echo "No existe el archivo de entrada: $input" >&2
  exit 66
fi

# Resolve the input before moving to the repo root, so relative paths keep working.
input_path="$(realpath "$input")"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"
mkdir -p public/media

# yuv420p + High profile: phone HDR/10-bit sources would otherwise yield High 10, which browsers cannot decode.
ffmpeg -y -i "$input_path" -vf scale=-2:720 -c:v libx264 -pix_fmt yuv420p -profile:v high -crf 26 -preset slow -c:a aac -b:a 96k -movflags +faststart public/media/tema-05-dualsense.mp4
ffmpeg -y -ss "$POSTER_SECOND" -i "$input_path" -frames:v 1 -vf scale=-2:720 public/media/tema-05-dualsense.jpg

pix_fmt="$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 public/media/tema-05-dualsense.mp4)"
if [[ "$pix_fmt" != "yuv420p" ]]; then
  echo "Error: el video quedó en formato de píxel '${pix_fmt}' y no en yuv420p; los navegadores no podrían reproducirlo." >&2
  exit 70
fi

size_bytes="$(wc -c < public/media/tema-05-dualsense.mp4)"
size_mb="$(awk -v b="$size_bytes" 'BEGIN { printf "%.1f", b / 1048576 }')"
echo "public/media/tema-05-dualsense.mp4: ${size_mb} MB"
echo "public/media/tema-05-dualsense.jpg: póster del segundo ${POSTER_SECOND}"
if (( size_bytes > MAX_BYTES )); then
  echo "Aviso: el video pesa más de 15 MB; recorta el clip o sube -crf (p. ej. 28)." >&2
fi
