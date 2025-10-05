# Vercel Deployment Guide

## Database Configuration for Supabase

The application has been configured to work with Supabase's transaction pooler for Vercel deployment using the latest Prisma driver adapter approach. Here's how to set it up properly:

### Environment Variables

You need to set these environment variables in your Vercel project:

#### 1. Database URLs
```bash
# Connect to Supabase via connection pooling with Supavisor (transaction pooler)
DATABASE_URL=postgres://postgres.kshpbvbbphpdilhmpozk:Lauda@979892@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection to the database used for migrations
DIRECT_URL=postgresql://postgres.kshpbvbbphpdilhmpozk:Lauda@979892@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

#### 2. Authentication
```bash
BETTER_AUTH_SECRET=your-secret-key-here-change-this-in-production
BETTER_AUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_AUTH_URL=https://your-domain.vercel.app
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
```

### Supabase Connection Details

The configuration uses:

- **Port 6543**: Transaction pooler with `pgbouncer=true` for application queries
- **Port 5432**: Direct connection for database migrations

This setup resolves the "prepared statement does not exist" errors that occur when using connection poolers with Prisma.

### Technical Solution Implemented

The application now uses Prisma's **driver adapter** approach for serverless environments:

#### 1. Prisma Schema Configuration
```prisma
generator client {
  provider   = "prisma-client-js"
  engineType = "client"  # Uses JavaScript engine instead of Rust
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      # Transaction pooler
  directUrl = env("DIRECT_URL")        # Direct connection for migrations
}
```

#### 2. Prisma Client with Driver Adapter
```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const prisma = new PrismaClient({
  adapter,  // PostgreSQL driver adapter
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  transactionOptions: {
    timeout: 10000,
    maxWait: 5000,
  },
})
```

#### 3. Key Benefits
- **No Rust Binaries**: Reduces bundle size and deployment complexity
- **Driver Adapter**: Native PostgreSQL connection handling
- **Transaction Pooler Compatible**: Works seamlessly with Supabase's pooler
- **Serverless Optimized**: Perfect for Vercel's serverless functions

### Deployment Steps

1. **Push Schema to Production**
   ```bash
   npx prisma db push
   ```

2. **Set Environment Variables in Vercel**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add all the variables listed above

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Troubleshooting

#### If you get "prepared statement already exists" errors:
- Ensure you're using the correct DATABASE_URL (port 5432 for direct connection)
- The application is configured to handle pooler limitations

#### If database connection fails:
- Verify your Supabase credentials are correct
- Check that your IP is whitelisted in Supabase
- Ensure the database is accessible from Vercel's network

### API Endpoints

After deployment, these endpoints will be available:

- `POST /api/device/register` - Register new devices
- `POST /api/device/heartbeat` - Update device status
- `GET /api/devices` - List all devices
- `POST /api/sms/receive` - Receive SMS messages
- `GET /api/sms` - Get SMS messages

### Monitoring

Check your Vercel function logs for any database connection issues. The application now includes proper error handling for connection pooler limitations.

## Production Considerations

1. **Database Security**: Use environment-specific secrets
2. **Connection Limits**: Monitor Supabase connection usage
3. **Performance**: The transaction pooler helps with serverless function scaling
4. **Backup**: Ensure Supabase backups are configured

The application is now fully compatible with Vercel's serverless environment and Supabase's transaction pooler.
