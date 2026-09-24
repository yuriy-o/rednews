# Build stage
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /app

# Prisma engines need OpenSSL on Alpine
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json .

# Build application
RUN npm run prisma:generate
RUN npm run build

# Production stage
# Pinned by digest: Cloudflare in front of ForexFactory fingerprints the TLS client, and this
# exact Node build is the one verified to pass. Re-run a reachability check before bumping.
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Apply pending migrations, then start (Render free tier has no pre-deploy step)
CMD ["npm", "run", "start:migrate"]

EXPOSE 3000
