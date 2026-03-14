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
  grep -qF "pocket" .env || echo "pocket=localhost:8001" >> .env
  npm install
  cargo build --release
  {{sudo}} docker compose build avatar pocket
  {{sudo}} docker compose -f docker-compose.mac.yml build emulator-web

camera:
  just _camera-{{os()}}

_camera-linux:
  echo "camera=$(ls -l /dev | grep video | tail -n1 | awk '{print "/dev/"$NF}')"

_camera-macos:
  echo "noop"

video:
  {{sudo}} docker compose up -d avatar

emulator:
  just _emulator-{{os()}}

_emulator-linux:
  {{sudo}} docker compose up -d emulator-web pocket
  {{sudo}} docker exec -it emulator bash -c 'adb emu avd hostmicon'
  sleep 20

_emulator-macos:
  {{sudo}} docker compose up -d pocket
  {{sudo}} docker compose -f docker-compose.mac.yml up -d emulator-web
  ./emulator/start-emulator-mac.sh

signal:
  curl -o emulator/signal.apk -L https://updates.signal.org/android/Signal-Android-website-prod-universal-release-8.0.4.apk
  just _signal-{{os()}}

_signal-linux:
  {{sudo}} docker compose up install-signal

_signal-macos:
  {{sudo}} docker compose -f docker-compose.mac.yml up install-signal

loop:
  mkdir -p debug/
  just _loop-{{os()}}

_loop-linux:
  {{sudo}} prompt=$([ -f prompt.txt ] && echo ./prompt.txt || echo ./default.txt) docker compose up loop

_loop-macos:
  adb emu avd hostmicon
  node src/loop.js

stop:
  {{sudo}} docker compose down

obss:
  flatpak run com.obsproject.Studio
