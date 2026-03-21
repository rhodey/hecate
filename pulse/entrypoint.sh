#!/usr/bin/env bash
set -euo pipefail

rm -f /tmp/pulse/native /tmp/pulse/pid
mkdir -p /tmp/pulse
chmod 0777 /tmp/pulse

exec pulseaudio -n --daemonize=no --disallow-exit --exit-idle-time=-1 --file=/etc/pulse/default.pa
