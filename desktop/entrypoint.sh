#!/bin/bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime-hecate}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=/tmp/dbus-session}"
export PULSE_SERVER="${PULSE_SERVER:-unix:/tmp/pulse/native}"

mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

dbus-daemon --session --address="$DBUS_SESSION_BUS_ADDRESS" --fork

Xvfb "$DISPLAY" -screen 0 1280x800x24 -ac +extension RANDR &
XVFB_PID=$!

cleanup() {
  kill "$XVFB_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "pulse = $PULSE_SERVER"
sleep 2
pactl info
pactl set-default-sink signal_out
pactl set-default-source signal_in.monitor

socat TCP-LISTEN:9222,fork,bind=0.0.0.0 TCP:127.0.0.1:9223 &

exec signal-desktop --remote-debugging-port=9223 --no-sandbox
