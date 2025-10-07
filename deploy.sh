#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting GOIP SMS Gateway Deployment...${NC}"

# Navigate to project directory
cd /var/www/goip || {
    echo -e "${RED}❌ Failed to navigate to /var/www/goip${NC}"
    exit 1
}

echo -e "${YELLOW}📍 Current directory: $(pwd)${NC}"

# Stash any local changes
echo -e "${BLUE}📦 Stashing local changes...${NC}"
git stash

# Pull latest changes from main branch
echo -e "${BLUE}⬇️  Pulling latest changes from main...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi

# Show current git status
echo -e "${BLUE}📊 Git status after pull:${NC}"
git status --porcelain

# Install dependencies if package.json changed
echo -e "${BLUE}📋 Checking for dependency updates...${NC}"
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
    echo -e "${YELLOW}📦 package.json changed, running npm install...${NC}"
    npm install
else
    echo -e "${GREEN}✅ No dependency changes detected${NC}"
fi

# Clear caches and build artifacts (ensures fresh build)
echo -e "${BLUE}🧹 Clearing caches and build artifacts...${NC}"

# Remove Next.js build cache
if [ -d ".next" ]; then
    echo -e "${YELLOW}   Removing .next directory...${NC}"
    rm -rf .next
fi

# Clear Node.js modules cache
echo -e "${YELLOW}   Clearing npm cache...${NC}"
npm cache clean --force

# Clear any stale lock files
if [ -f "package-lock.json" ]; then
    echo -e "${YELLOW}   Removing package-lock.json for fresh install...${NC}"
    rm -f package-lock.json
    npm install
fi

echo -e "${GREEN}✅ Cache cleanup completed!${NC}"

# Build the Next.js application
echo -e "${BLUE}🔨 Building Next.js application from scratch...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Restart PM2 processes
echo -e "${BLUE}🔄 Restarting PM2 processes...${NC}"

# Check if PM2 is running
if ! pm2 list | grep -q "goip-server"; then
    echo -e "${YELLOW}⚠️  goip-server not found in PM2, starting it...${NC}"
    pm2 start ecosystem.config.js --name goip-server
else
    echo -e "${BLUE}🔄 Restarting goip-server...${NC}"
    pm2 restart goip-server
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PM2 restart failed!${NC}"
    exit 1
fi

# Show PM2 status
echo -e "${BLUE}📊 PM2 Status after restart:${NC}"
pm2 status

# Show recent logs to verify everything is working
echo -e "${BLUE}📋 Recent logs (last 10 lines):${NC}"
pm2 logs goip-server --lines 10 --nostream

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your GOIP SMS Gateway is now running with the latest changes.${NC}"

# Show useful commands
echo -e "${BLUE}📌 Useful commands:${NC}"
echo -e "   View logs:     pm2 logs goip-server"
echo -e "   View status:   pm2 status"
echo -e "   Restart:       pm2 restart goip-server"
echo -e "   Stop:          pm2 stop goip-server"
echo -e "   Monitor:       pm2 monit"