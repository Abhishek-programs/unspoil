#!/usr/bin/env bash
set -euo pipefail
DEV="${1:-RZCW820MMFZ}"
OUT="$(cd "$(dirname "$0")" && pwd)/screenshots"
mkdir -p "$OUT"
PKG=app.unspoil

adb -s "$DEV" shell settings put global policy_control "immersive.status=${PKG}"

cleanup() {
  adb -s "$DEV" shell settings put global policy_control null 2>/dev/null || true
}
trap cleanup EXIT

capture() {
  local uri="$1"
  local file="$2"
  adb -s "$DEV" shell am start -a android.intent.action.VIEW -d "$uri" "$PKG" >/dev/null 2>&1 || \
    adb -s "$DEV" shell am start -n "${PKG}/.MainActivity" >/dev/null 2>&1
  sleep 3
  adb -s "$DEV" exec-out screencap -p > "$file"
  if command -v python3 >/dev/null; then
    CROP_VENV="${OUT}/.crop-venv"
    if [[ ! -x "${CROP_VENV}/bin/python" ]]; then
      python3 -m venv "$CROP_VENV"
      "${CROP_VENV}/bin/pip" install -q pillow
    fi
    "${CROP_VENV}/bin/python" - "$file" <<'PY'
import sys
from PIL import Image
path = sys.argv[1]
top = 96
im = Image.open(path)
w, h = im.size
im.crop((0, top, w, h)).save(path)
PY
  fi
  echo "Wrote $file"
}

adb -s "$DEV" shell am force-stop "$PKG"
capture "unspoil://" "${OUT}/screenshot-01-home.png"
capture "unspoil://transactions" "${OUT}/screenshot-02-transactions.png"
capture "unspoil://goals" "${OUT}/screenshot-03-goals.png"
capture "unspoil://settings" "${OUT}/screenshot-04-settings.png"
