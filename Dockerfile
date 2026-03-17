# ---- Abhaengigkeiten ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# better-sqlite3 braucht Build-Tools fuer native Addon
RUN apk add --no-cache python3 make g++ && \
    npm ci --ignore-scripts && \
    npm rebuild better-sqlite3

# ---- Production-Dependencies ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
# better-sqlite3 braucht Build-Tools fuer native Addon
RUN apk add --no-cache python3 make g++ && \
    npm ci --ignore-scripts --omit=dev && \
    npm rebuild better-sqlite3

# ---- Build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Production ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js Standalone-Output kopieren
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Volle Production-Dependencies (socket.io, ssh2, better-sqlite3, drizzle-orm)
COPY --from=prod-deps /app/node_modules ./node_modules

# Custom Server (socket.io)
COPY --from=builder /app/dist-server/server ./server
COPY --from=builder /app/dist-server/src ./src

# Drizzle-Migrationen (SQL-Dateien + Journal)
COPY --from=builder /app/src/lib/db/migrations ./src/lib/db/migrations

# Data-Verzeichnis fuer SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

# Migration ausfuehren, dann Server starten
CMD ["sh", "-c", "node server/migrate.js && node server/index.js"]
