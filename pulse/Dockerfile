FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    pulseaudio \
    pulseaudio-utils && \
  rm -rf /var/lib/apt/lists/*

COPY default.pa /etc/pulse/default.pa
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

CMD ["/usr/local/bin/entrypoint.sh"]
