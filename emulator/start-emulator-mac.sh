#!/usr/bin/env bash
set -euo pipefail

SwitchAudioSource -t input -s "Loopback1"
SwitchAudioSource -t output -s "Loopback2"

emulator -avd android30 -gpu host -no-window -no-metrics -no-boot-anim -netfast -allow-host-audio -camera-front webcam1
