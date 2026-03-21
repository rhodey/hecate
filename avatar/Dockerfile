FROM node:25-alpine3.22 AS builder

EXPOSE 8082

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY public public
COPY src src
COPY index.html .
COPY vite.config.js .
RUN npm run build

FROM node:25-alpine3.22 AS runner
COPY --from=builder /app/dist /app

WORKDIR /app
RUN npm install -g serve

CMD ["serve", "-l", "tcp://0.0.0.0:8082"]
