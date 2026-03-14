FROM ubuntu:22.04

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      pulseaudio \
      pulseaudio-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY default.pa /etc/pulse/default.pa
COPY start-pulseaudio.sh /usr/local/bin/start-pulseaudio.sh
RUN chmod +x /usr/local/bin/start-pulseaudio.sh

CMD ["/usr/local/bin/start-pulseaudio.sh"]
