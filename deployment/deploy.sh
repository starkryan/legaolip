#!/bin/bash

# GOIP Production Deployment Script for androidgoipasia.shop
echo "🚀 Starting deployment for androidgoipasia.shop"

# Navigate to project directory
cd /var/www/goip/goip-fullstack

# Backup current version
echo "📦 Creating backup..."
cp -r . ../backup-$(date +%Y%m%d_%H%M%S)

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📚 Installing dependencies..."
npm ci --production

# Build application
echo "🔨 Building application..."
npm run build

# Restart PM2
echo "🔄 Restarting application..."
pm2 restart goip-server

# Check status
echo "✅ Checking application status..."
pm2 status

echo "🎉 Deployment completed at $(date)"
echo "🌐 Your application is running at: https://androidgoipasia.shop"