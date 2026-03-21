sudo := "$(docker info > /dev/null 2>&1 || echo 'sudo')"

make-net:
  {{sudo}} docker network create hnet --driver bridge > /dev/null 2>&1 || true

build:
  just make-net
  touch .env
  just _build-{{os()}}

_build-linux:
  grep -qF "emulator" .env || echo "emulator=emulator:5555" >> .env
  {{sudo}} docker compose build

_build-macos:
  grep -qF "emulator" .env || echo "emulator=emulator-5554" >> .env
  {{sudo}} docker compose build pulse desktop qrcode avatar pocket
  {{sudo}} docker compose -f docker-compose.mac.yml build emulator-web

emulator:
  just _emulator-{{os()}}

_emulator-linux:
  mkdir -p emulator/data
  touch desktop/qrcode.jpg
  {{sudo}} docker compose up -d emulator emulator-web

_emulator-macos:
  touch /tmp/qrcode.jpg
  cp emulator/Toren1BD.posters $ANDROID_HOME/emulator/resources/Toren1BD.posters
  {{sudo}} docker compose -f docker-compose.mac.yml up -d emulator-web
  ./emulator/start-emulator-mac.sh

signal:
  curl -o emulator/signal.apk -L https://updates.signal.org/android/Signal-Android-website-prod-universal-release-8.0.4.apk
  just _signal-{{os()}}

_signal-linux:
  {{sudo}} docker compose up install-signal

_signal-macos:
  {{sudo}} docker compose -f docker-compose.mac.yml up install-signal

desktop:
  mkdir -p desktop/data
  {{sudo}} docker compose up -d desktop

qrcode:
  {{sudo}} docker compose up -d qrcode

loop:
  {{sudo}} docker rm -f emulator qrcode > /dev/null 2>&1
  {{sudo}} docker compose up -d pocket
  mkdir -p debug/
  just _loop-{{os()}}

_loop-linux:
  grep -qF "emulator" .env || echo "emulator=emulator:5555" >> .env
  {{sudo}} prompt=$([ -f prompt.txt ] && echo ./prompt.txt || echo ./default.txt) docker compose up loop

_loop-macos:
  grep -qF "emulator" .env || echo "emulator=emulator-5554" >> .env
  grep -qF "pocket" .env || echo "pocket=localhost:8084" >> .env
  node src/loop.js

camera:
  just _camera-{{os()}}

_camera-linux:
  echo "camera=$(ls -l /dev | grep video | tail -n1 | awk '{print "/dev/"$NF}')"

_camera-macos:
  echo "noop"

video:
  {{sudo}} docker compose up -d avatar

stop:
  {{sudo}} docker compose down

obss:
  flatpak run com.obsproject.Studio
