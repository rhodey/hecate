# Hecate (Mac)
I bought a MacBook Neo to try to make this work and got close:
+ Emulator has to run native instead of docker
+ Voice calls 100% working
+ Video calls not working

## Voice calls
The Android emulator cannot run in docker because macOS does not support `kvm`.

So you need to install the Android emulator on macOS and this is not so bad:
```
brew install openjdk@17
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc

mkdir -p ~/android-sdk/cmdline-tools
cd ~/android-sdk

curl -o cmdline-tools.zip -L https://dl.google.com/android/repository/commandlinetools-mac-14742923_latest.zip
unzip cmdline-tools.zip
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest 2>/dev/null

echo 'export ANDROID_HOME=$HOME/android-sdk' >> ~/.zshrc
echo 'export ANDROID_SDK_ROOT=$ANDROID_HOME' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/platform-tools:$PATH' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/emulator:$PATH' >> ~/.zshrc

source ~/.zshrc

yes | sdkmanager --licenses

sdkmanager \
  "platform-tools" \
  "emulator" \
  "platforms;android-30" \
  "system-images;android-30;google_apis;arm64-v8a"

echo "no" | avdmanager create avd -n android30 -k "system-images;android-30;google_apis;arm64-v8a"
```

All the docs in main README now apply to what you have.

## Video calls
MacOS docker support works by shipping a linux VM. This VM has many things available but `v4l2loopback` is not available. Video calls with macOS should work if you get `v4l2loopback` into a linux VM and run Hecate containers from there. The thing to do is to have OBS Studio send a UDP video stream into the VM and to have ffmpeg accept that stream and present it as a `v4l2loopback` device at `/dev/video0` where Signal Desktop will find it.

If you get this working and with a happy setup path please share and I will update the docs.

## License
mike@rhodey.org

MIT
