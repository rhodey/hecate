# Hecate (Mac)
I bought a MacBook Neo to try to make this work and got close:
+ Emulator has to run native instead of docker
+ Loop.js / main has to run native instead of docker
+ [Loopback audio app](https://rogueamoeba.com/loopback/) needs to be installed

Voice calls status:
+ user speech is quiet (but STT is working)
+ user speech is missing about 500ms from begin
+ AI speech is choppy

Video calls status:
+ video works using OBS Studio
+ when OBS Studio is running user speech is not received

## Things I tried
[Loopback](https://rogueamoeba.com/loopback/) is not open source. My first attempt was [BlackHole](https://github.com/ExistentialAudio/BlackHole) but the install only provides 1 audio device and we need 2. I tried to install the "BlackHole 2ch" driver and the "BlackHole 16ch" driver also and to use 1 for emulator in and the other for emulator out but the emulator does not want to work with BlackHole 16ch it wants 2 channel devices or 1 channel devices. I tried also [VB-Cable](https://vb-audio.com/Cable/) and this went nowhere.

From what I have seen it should be attempted to succeed with Loopback and only after that maybe try and replace it. There is a Loopback free download and [they claim](https://rogueamoeba.com/support/knowledgebase/?showArticle=Misc-AboutAppTrials&product=Loopback) it operates exactly like the paid version except noise is added to the audio device after 20 minutes and to close and re-open the app after 20 minutes to avoid this. Stop the emulator and quit Loopback with each test cycle. Loopback should be re-opened before restart emulator.

## Setup because we cant use 100% docker
We cant use 100% docker because macOS does audio and `kvm` very differently than linux.

Start by installing Android emulator
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
```

Now create an android virtual device
```
echo "no" | avdmanager create avd -n android30 -k "system-images;android-30;google_apis;arm64-v8a"
```

Now install [Loopback](https://rogueamoeba.com/loopback/) and add 2 virtual devices and name them Loopback1 and Loopback2 and default settings

Now we need four more things from brew
```
brew install just switchaudio-osx ffmpeg sox
```

Now we need to query the audio drivers and look for "[N] Loopback2"
```
cp example.env .env
ffmpeg -hide_banner -f avfoundation -list_devices true -i ""
echo 'mic_idx=N' >> .env
```
You need also `node` and `cargo` installed and then finally we start the emulator
```
just build
just emulator
```

All the docs in main README now apply to what you have

## License
mike@rhodey.org

MIT
