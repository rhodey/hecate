#!/usr/bin/env bash
set -euo pipefail

mkdir -p /tmp/pulse
exec pulseaudio -n --daemonize=no --disallow-exit --exit-idle-time=-1 --file=/etc/pulse/default.pa
