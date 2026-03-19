#!/bin/bash

# Kill any running emulator instances before starting a new one
pkill -f "/opt/android-sdk/emulator/emulator"

# Removes .lock files before emulator starts to prevent crashes
rm -rf /data/android.avd/*.lock

# Use custom ramdisk if present
if [ -f /data/android.avd/ramdisk.img ]; then
  RAMDISK="-ramdisk /data/android.avd/ramdisk.img"
fi

# Path to the AVD config
CONFIG_FILE="/data/android.avd/config.ini"

update_config() {
  local key="$1"
  local value="$2"
  if grep -q "^$key=" "$CONFIG_FILE"; then
    sed -i "s/^$key=.*/$key=$value/" "$CONFIG_FILE"
  else
    echo "$key=$value" >> "$CONFIG_FILE"
  fi
}

# Configure optional screen resolution and density directly via config.ini
if [ -f "$CONFIG_FILE" ]; then
  if [ -n "$SCREEN_RESOLUTION" ]; then
    WIDTH=${SCREEN_RESOLUTION%x*}
    HEIGHT=${SCREEN_RESOLUTION#*x}
    update_config "hw.lcd.width" "$WIDTH"
    update_config "hw.lcd.height" "$HEIGHT"
  fi
  if [ -n "$SCREEN_DENSITY" ]; then
    update_config "hw.lcd.density" "$SCREEN_DENSITY"
  fi
fi

# Pulseaudio needs x11
export DISPLAY="${DISPLAY:-:99}"
if ! pgrep -f "Xvfb ${DISPLAY}" >/dev/null 2>&1; then
  Xvfb "${DISPLAY}" -screen 0 1280x720x24 -nolisten tcp >/tmp/xvfb.log 2>&1 &
  sleep 1
fi

# Start the emulator with the appropriate ramdisk.img
/opt/android-sdk/emulator/emulator -avd android -nojni -netfast -writable-system -no-boot-anim -skip-adb-auth -gpu swiftshader_indirect -no-snapshot -no-metrics $RAMDISK -camera-front $CAMERA -allow-host-audio -qemu -m $RAM_SIZE

# emulator -avd <Your_AVD_Name> -camera-front "videofile,<path_to_video>"
