FROM node:25-alpine3.22 as builder

RUN apk add --no-cache wget unzip

WORKDIR /root
RUN wget https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.3.0/maestro.zip
RUN unzip -q maestro.zip -d . && rm maestro.zip

RUN apk add --no-cache cargo
RUN mkdir -p /app/src
WORKDIR /app
COPY Cargo.toml .
COPY Cargo.lock .
COPY src/earshot.rs src/earshot.rs
RUN cargo build --release

FROM node:25-alpine3.22 as runner
COPY --from=builder /root/maestro /root/maestro
COPY --from=builder /app/target/release/earshot-pipe /app/target/release/earshot-pipe
ENV PATH="/root/maestro/bin:${PATH}"

RUN apk add --no-cache ffmpeg openjdk17-jre android-tools

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY default.txt default.txt
COPY src src

CMD ["node", "src/loop.js"]
