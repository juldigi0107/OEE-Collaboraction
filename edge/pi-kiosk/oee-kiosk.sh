#!/usr/bin/env bash
set -u
MACHINE="${OEE_MACHINE:-APM-7}"
APP_URL="${OEE_APP_URL:-https://juldigi0107.github.io/OEE-Collaboraction/}"
URL="${APP_URL%/}/?kiosk=hmi&machine=${MACHINE}"
while true; do
  sleep 10
  chromium --ozone-platform=wayland --kiosk --start-maximized --noerrdialogs --disable-infobars --no-first-run --disable-session-crashed-bubble --disable-pinch --overscroll-history-navigation=0 "$URL" || true
  sleep 5
done
