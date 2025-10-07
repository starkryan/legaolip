# GOIP SMS Gateway Deployment Guide

## Quick Deployment (VPS)

### 1. Push Your Changes to GitHub
```bash
git add .
git commit -m "Fix SMS message truncation and status validation"
git push origin main
```

### 2. Deploy on VPS
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to project directory
cd /var/www/goip

# Run the deployment script
./deploy.sh
```

### 3. Manual Deployment (if script fails)
```bash
cd /var/www/goip

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Restart PM2
pm2 restart goip-server

# Check status
pm2 status
pm2 logs goip-server --lines 20
```

## What Gets Deployed

### Recent Changes:
1. ✅ **SMS Message Length Fix**: Removed `maxlength` constraint
2. ✅ **Status Validation Fix**: Added `'received'` to status enum
3. ✅ **Auto Status Handling**: Better status management in middleware

### Files Changed:
- `src/models/SmsMessage.ts` - Database schema fixes
- `deploy.sh` - New deployment script
- `DEPLOYMENT_GUIDE.md` - This guide

## Verification Steps

After deployment, verify the changes:

### 1. Check PM2 Status
```bash
pm2 status
# Should show: goip-server ✓ online
```

### 2. Check Recent Logs
```bash
pm2 logs goip-server --lines 20
# Should show no validation errors
```

### 3. Test SMS Reception
- Send a long SMS to your device
- Check if it stores completely in database
- Verify web dashboard shows full message

### 4. Check Database Schema (Optional)
```bash
# Connect to MongoDB and verify
mongo your_database_name
db.sms_messages.findOne().message.length
# Should show full message length
```

## Troubleshooting

### Build Failures:
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

### PM2 Issues:
```bash
# Reset PM2
pm2 delete goip-server
pm2 start ecosystem.config.js --name goip-server

# Monitor
pm2 monit
```

### Database Connection Issues:
```bash
# Check MongoDB connection
pm2 logs goip-server --err

# Verify environment variables
cat .env
```

## Environment Variables Required

Make sure your `.env` file on VPS contains:
```env
DATABASE_URL=mongodb://localhost:27017/goip_sms
DIRECT_URL=mongodb://localhost:27017/goip_sms
NEXTAUTH_URL=http://your-domain.com
NEXTAUTH_SECRET=your-secret-key
```

## Automatic Deployment (Optional)

For automated deployments, you can set up a webhook:

1. Add webhook to GitHub repository
2. Create webhook handler on VPS
3. Trigger `deploy.sh` on push to main branch

This ensures your VPS always has the latest changes automatically.