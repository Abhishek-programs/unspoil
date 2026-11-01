#!/usr/bin/env bash
# Automated screen record for Play FOREGROUND_SERVICE_SPECIAL_USE demo (no status bar).
set -euo pipefail
DEV="${1:-RZCW820MMFZ}"
REMOTE=/sdcard/unspoil-payment-helper-demo.mp4
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_RAW="${OUT_DIR}/payment-helper-fgs-demo-raw.mp4"
OUT="${OUT_DIR}/payment-helper-fgs-demo.mp4"
PKG=app.unspoil
ESEWA=com.f1soft.esewa
NBANK=com.f1soft.nabilmbank
LIMIT="${2:-120}"
STATUS_CROP="${3:-96}"

if [[ "$(adb -s "$DEV" get-state 2>/dev/null)" != "device" ]]; then
  echo "Device $DEV not ready." >&2
  exit 1
fi

OLD_POLICY="$(adb -s "$DEV" shell settings get global policy_control 2>/dev/null | tr -d '\r' || true)"
restore_ui() {
  if [[ -n "$OLD_POLICY" && "$OLD_POLICY" != "null" ]]; then
    adb -s "$DEV" shell settings put global policy_control "$OLD_POLICY" 2>/dev/null || true
  else
    adb -s "$DEV" shell settings put global policy_control null 2>/dev/null || true
  fi
}
trap restore_ui EXIT

adb -s "$DEV" shell settings put global policy_control "immersive.status=*"
adb -s "$DEV" shell settings put global policy_control "immersive.full=*"

adb -s "$DEV" shell rm -f "$REMOTE" 2>/dev/null || true
adb -s "$DEV" shell screenrecord --time-limit "$LIMIT" "$REMOTE" &
REC_PID=$!
sleep 2

echo "→ Payment helper settings…"
adb -s "$DEV" shell am start -a android.intent.action.VIEW -d "unspoil://notification-settings" "$PKG" >/dev/null
sleep 10

echo "→ UnSpoil (refresh watch service)…"
adb -s "$DEV" shell am start -n "${PKG}/.MainActivity" >/dev/null
sleep 4

echo "→ eSewa…"
adb -s "$DEV" shell monkey -p "$ESEWA" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
sleep 18

echo "→ nBank…"
adb -s "$DEV" shell monkey -p "$NBANK" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
sleep 18

echo "→ Settings again…"
adb -s "$DEV" shell am start -a android.intent.action.VIEW -d "unspoil://notification-settings" "$PKG" >/dev/null
sleep 8

wait "$REC_PID" 2>/dev/null || true
adb -s "$DEV" pull "$REMOTE" "$OUT_RAW"
adb -s "$DEV" shell rm -f "$REMOTE" 2>/dev/null || true

FFMPEG=""
if command -v ffmpeg >/dev/null 2>&1; then
  FFMPEG=ffmpeg
elif [[ -x /opt/homebrew/bin/ffmpeg ]]; then
  FFMPEG=/opt/homebrew/bin/ffmpeg
fi

if [[ -n "$FFMPEG" ]]; then
  FFPROBE="${FFMPEG/ffmpeg/ffprobe}"
  [[ -x "$FFPROBE" ]] || FFPROBE=ffprobe
  WH="$("$FFPROBE" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT_RAW" 2>/dev/null || true)"
  W="${WH%%,*}"
  H="${WH##*,}"
  if [[ -n "$W" && -n "$H" && "$H" -gt "$STATUS_CROP" ]]; then
    NEW_H=$((H - STATUS_CROP))
    "$FFMPEG" -y -i "$OUT_RAW" -vf "crop=${W}:${NEW_H}:0:${STATUS_CROP}" -c:v libx264 -crf 20 -preset fast -an "$OUT"
    rm -f "$OUT_RAW"
  else
    mv "$OUT_RAW" "$OUT"
  fi
else
  CROP_VENV="${OUT_DIR}/.crop-venv"
  if [[ ! -x "${CROP_VENV}/bin/python" ]]; then
    python3 -m venv "$CROP_VENV"
    "${CROP_VENV}/bin/pip" install -q imageio imageio-ffmpeg 2>/dev/null || true
  fi
  if "${CROP_VENV}/bin/python" - "$OUT_RAW" "$OUT" "$STATUS_CROP" <<'PY' 2>/dev/null; then
import sys
import imageio.v3 as iio
import numpy as np
src, dst, top = sys.argv[1], sys.argv[2], int(sys.argv[3])
meta = iio.immeta(src, exclude_applied=False)
fps = meta.get("fps", 30)
frames = []
for fr in iio.imiter(src):
    frames.append(fr[top:, :, :])
iio.imwrite(dst, frames, fps=fps, codec="libx264", quality=8)
PY
    rm -f "$OUT_RAW"
  else
    mv "$OUT_RAW" "$OUT"
    echo "Note: install ffmpeg for status-bar crop; raw saved as $OUT" >&2
  fi
fi

echo "Saved: $OUT"
ls -lh "$OUT"
