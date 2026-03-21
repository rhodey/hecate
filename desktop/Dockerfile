FROM debian:bookworm-slim

EXPOSE 9222

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV DBUS_SESSION_BUS_ADDRESS=unix:path=/tmp/dbus-session
ENV XDG_RUNTIME_DIR=/tmp/runtime-hecate

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    gnupg \
    xvfb \
    dbus-x11 \
    xauth \
    tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /root
RUN wget -O- https://updates.signal.org/desktop/apt/keys.asc | gpg --dearmor > signal-desktop-keyring.gpg
RUN cat signal-desktop-keyring.gpg | tee /usr/share/keyrings/signal-desktop-keyring.gpg > /dev/null
RUN wget -O signal-desktop.sources https://updates.signal.org/static/desktop/apt/signal-desktop.sources
RUN cat signal-desktop.sources | tee /etc/apt/sources.list.d/signal-desktop.sources > /dev/null
RUN apt update && apt install -y signal-desktop

RUN useradd -m -u 1000 hecate \
 && mkdir -p /home/hecate/.config /home/hecate/.cache /tmp/runtime-hecate \
 && chown -R hecate:hecate /home/hecate /tmp/runtime-hecate

RUN mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix
RUN apt install -y socat

USER hecate
WORKDIR /home/hecate

COPY --chown=hecate:hecate entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
