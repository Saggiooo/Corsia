# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- dipendenze ---------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- stage con sorgenti + toolchain (migrate, seed, scraping) -----------
FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# --- build --------------------------------------------------------------
FROM tools AS builder
RUN npm run build

# --- runtime ------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
