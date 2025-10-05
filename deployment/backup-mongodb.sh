#!/bin/bash

# MongoDB Backup Script for androidgoipasia.shop
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="goip_db"

echo "🗄️ Starting MongoDB backup for androidgoipasia.shop..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --host localhost --port 27017 \
  --username goip_user --password YOUR_APP_PASSWORD \
  --authenticationDatabase goip_db \
  --db $DB_NAME --out $BACKUP_DIR/backup_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;

echo "✅ MongoDB backup completed: backup_$DATE"
echo "📁 Backup location: $BACKUP_DIR/backup_$DATE"