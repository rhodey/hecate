FROM ubuntu:22.04

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      pulseaudio \
      pulseaudio-utils && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY default.pa /etc/pulse/default.pa
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]
