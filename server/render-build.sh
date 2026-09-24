#!/bin/bash
# Red News Render Build Script
# © 2026 Yuriy Orekhov. All rights reserved.

set -e  # Exit on any error

echo "🏗️  Building Red News Backend for Render..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Step 2: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Step 3: Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Step 4: Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo "✅ Build complete! Ready for deployment."
