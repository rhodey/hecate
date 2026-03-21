FROM node:25-alpine3.22 AS builder

RUN apk add --no-cache cargo

RUN mkdir -p /app/src
WORKDIR /app
COPY Cargo.toml .
COPY Cargo.lock .
COPY src/earshot.rs src/earshot.rs
RUN cargo build --release

FROM node:25-alpine3.22 AS runner
COPY --from=builder /app/target/release/earshot-pipe /app/target/release/earshot-pipe

RUN apk add --no-cache imagemagick imagemagick-svg rsvg-convert imagemagick-jpeg
RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY default.txt default.txt
COPY src src

CMD ["node", "src/loop.js"]
