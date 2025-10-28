#!/bin/bash

# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!! This should never be ran in the production machine !!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
#
# This file is only intended for testing locally
#

program=""
[[ -n $(command -v google-chrome) ]] && program='google-chrome'
[[ -n $(command -v chromium) ]] && program='chromium'
[[ -n $(command -v chromium-browser) ]] && program='chromium-browser'

if [[ -z $program ]]; then
  echo "Couldn't find 'google-chrome', 'chromium' or 'chromium-browser' to run"
  exit
fi

$program \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --disable-translate \
  --disable-extensions \
  --disable-background-networking \
  --safebrowsing-disable-auto-update \
  --disable-sync \
  --metrics-recording-only \
  --disable-default-apps \
  --no-first-run \
  --mute-audio \
  --hide-scrollbars \
  --remote-debugging-port=9222
