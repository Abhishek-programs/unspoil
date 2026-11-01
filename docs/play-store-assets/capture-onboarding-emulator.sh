#!/usr/bin/env bash
# Onboarding screenshots from Android emulator only (fresh install / cleared data).
set -euo pipefail
DEV="${1:-emulator-5554}"
OUT="$(cd "$(dirname "$0")" && pwd)/screenshots"
PKG=app.unspoil
APK="${2:-$(cd "$(dirname "$0")/../.." && pwd)/android/app/build/outputs/apk/release/app-release.apk}"

if ! adb devices | awk 'NR>1 && $1 ~ /^emulator-/{found=1} END{exit !found}'; then
  echo "No emulator in adb devices. Start one first (e.g. Pixel_10_Pro)." >&2
  exit 1
fi
if [[ "$(adb -s "$DEV" get-state 2>/dev/null)" != "device" ]]; then
  echo "Device $DEV not ready." >&2
  exit 1
fi
if [[ ! -f "$APK" ]]; then
  echo "Release APK not found: $APK" >&2
  exit 1
fi

mkdir -p "$OUT"
rm -f "$OUT"/onboarding-*.png

adb -s "$DEV" install -r "$APK" >/dev/null
adb -s "$DEV" shell pm clear "$PKG" >/dev/null

adb -s "$DEV" shell settings put global policy_control "immersive.status=${PKG}"
cleanup() {
  adb -s "$DEV" shell settings put global policy_control null 2>/dev/null || true
}
trap cleanup EXIT

crop_top() {
  local file="$1"
  local top="${2:-96}"
  CROP_VENV="$(dirname "$0")/.crop-venv"
  if [[ ! -x "${CROP_VENV}/bin/python" ]]; then
    python3 -m venv "$CROP_VENV"
    "${CROP_VENV}/bin/pip" install -q pillow
  fi
  "${CROP_VENV}/bin/python" - "$file" "$top" <<'PY'
import sys
from PIL import Image
path, top = sys.argv[1], int(sys.argv[2])
im = Image.open(path)
w, h = im.size
im.crop((0, top, w, h)).save(path)
print(w, h, "->", w, h - top)
PY
}

capture_route() {
  local uri="$1"
  local file="$2"
  adb -s "$DEV" shell am start -a android.intent.action.VIEW -d "$uri" "$PKG" >/dev/null 2>&1
  sleep 3
  adb -s "$DEV" shell input keyevent 111 >/dev/null 2>&1 || true
  sleep 0.4
  adb -s "$DEV" exec-out screencap -p > "$file"
  crop_top "$file"
  echo "Wrote $file"
}

capture_route "unspoil://onboarding" "${OUT}/onboarding-01-welcome.png"
capture_route "unspoil://onboarding/permissions" "${OUT}/onboarding-02-permissions.png"
capture_route "unspoil://onboarding/money" "${OUT}/onboarding-03-money.png"
capture_route "unspoil://onboarding/foundations" "${OUT}/onboarding-04-foundations.png"
capture_route "unspoil://onboarding/buckets" "${OUT}/onboarding-05-buckets.png"
capture_route "unspoil://onboarding/goals" "${OUT}/onboarding-06-goals.png"
capture_route "unspoil://onboarding/balances" "${OUT}/onboarding-07-balances.png"
