#!/bin/sh

adb connect $emulator

nohup sh -c 'while sleep 2; do adb shell input keyevent KEYCODE_WAKEUP; done' &

npm start
