#!/usr/bin/env bash
set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This bootstrap script currently supports Debian/Ubuntu hosts." >&2
  exit 1
fi

sudo apt-get update
sudo apt-get install -y \
  python3 \
  python3-venv \
  ffmpeg \
  tesseract-ocr \
  tesseract-ocr-eng \
  tesseract-ocr-deu \
  libgl1 \
  libglib2.0-0 \
  libxcb1

echo "Host bootstrap complete."
