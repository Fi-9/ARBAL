# ARBAL NestJS Backend — Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache postgresql-client unzip su-exec

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./prisma.config.js
COPY --from=builder /app/scripts ./scripts
COPY --from=builder "/app/BACKUPS TEST" "./BACKUPS TEST"
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# Create folders and set ownership to node user
RUN mkdir -p /app/uploads /app/backups /app/backups/db-only && chown -R node:node /app

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/main"]
