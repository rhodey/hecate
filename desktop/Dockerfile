FROM debian:bookworm-slim

ARG TARGETARCH

EXPOSE 9222

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV DBUS_SESSION_BUS_ADDRESS=unix:path=/tmp/dbus-session
ENV XDG_RUNTIME_DIR=/tmp/runtime-hecate
ENV PULSE_SERVER=unix:/tmp/pulse/native

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    gnupg \
    xvfb \
    dbus-x11 \
    xauth \
    tini \
    socat \
    pulseaudio-utils \
    libasound2-plugins \
    alsa-utils \
 && rm -rf /var/lib/apt/lists/*

# For arm64 (Raspberry Pi): provide a community-built .deb URL at build time.
# See: https://github.com/signalflatpak/signal for arm64 builds.
# Example: docker build --build-arg SIGNAL_DESKTOP_DEB=https://.../signal-desktop_X.Y.Z_arm64.deb
ARG SIGNAL_DESKTOP_DEB=""

WORKDIR /root

RUN apt-get update \
 && if [ "$TARGETARCH" = "arm64" ]; then \
      if [ -z "$SIGNAL_DESKTOP_DEB" ]; then \
        echo "ERROR: arm64 build requires --build-arg SIGNAL_DESKTOP_DEB=<url>" \
         && echo "See: https://github.com/signalflatpak/signal" \
         && exit 1; \
      fi; \
      apt-get install -y --no-install-recommends \
        libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
        libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
        libgbm1 libxkbcommon0 libpangocairo-1.0-0 libgtk-3-0 \
     && wget -O signal-desktop.deb "$SIGNAL_DESKTOP_DEB" \
     && apt-get install -y ./signal-desktop.deb \
     && rm signal-desktop.deb; \
  else \
    wget -O- https://updates.signal.org/desktop/apt/keys.asc | gpg --dearmor > signal-desktop-keyring.gpg \
     && cat signal-desktop-keyring.gpg | tee /usr/share/keyrings/signal-desktop-keyring.gpg > /dev/null \
     && wget -O signal-desktop.sources https://updates.signal.org/static/desktop/apt/signal-desktop.sources \
     && cat signal-desktop.sources | tee /etc/apt/sources.list.d/signal-desktop.sources > /dev/null \
     && apt-get update && apt-get install -y signal-desktop; \
  fi \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 hecate \
 && mkdir -p /home/hecate/.config /home/hecate/.cache /tmp/runtime-hecate /tmp/pulse \
 && chown -R hecate:hecate /home/hecate /tmp/runtime-hecate /tmp/pulse

RUN mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

USER hecate
WORKDIR /home/hecate

COPY --chown=hecate:hecate entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
