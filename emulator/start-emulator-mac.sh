#!/usr/bin/env bash
set -euo pipefail

emulator -avd android30 -gpu host -no-window -no-metrics -no-boot-anim -netfast -camera-front emulated -camera-back virtualscene
