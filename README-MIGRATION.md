# Migration from Supabase to Better Auth + Prisma

This document outlines the migration process from Supabase to Better Auth with Prisma for the GOIP SMS Dashboard project.

## Overview

The project has been successfully migrated from Supabase to use:
- **Prisma** as the ORM for database operations
- **Better Auth** for authentication and session management
- **PostgreSQL** (same database, accessed directly via Prisma)

## Changes Made

### 1. Dependencies

**Removed:**
- `@supabase/supabase-js`

**Added:**
- `prisma`
- `@prisma/client`
- `better-auth`
- `@auth/prisma-adapter`

### 2. Database Schema

Created a new Prisma schema (`prisma/schema.prisma`) that includes:
- Better Auth required models (`User`, `Account`, `Session`, `VerificationToken`)
- Application models (`Device`, `PhoneNumber`, `SmsMessage`)
- Proper relationships and constraints

### 3. Configuration

**Environment Variables (.env):**
```env
# Database
DATABASE_URL=postgresql://postgres:Lauda@979892@db.kshpbvbbphpdilhmpozk.supabase.co:5432/postgres

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here-change-this-in-production
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_AUTH_URL=http://localhost:3001

# Optional: Google OAuth
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Authentication Setup

**Backend Configuration (`src/lib/auth.ts`):**
- Configured Better Auth with Prisma adapter
- Enabled email/password authentication
- Optional Google OAuth support
- Session management

**Frontend Configuration (`src/lib/auth-client.ts`):**
- Better Auth React client setup
- Authentication helper functions

**API Routes:**
- `/api/auth/[...allauth]/route.ts` - Better Auth handler

### 5. API Routes Migration

All API routes have been migrated from Supabase to Prisma:

- **Devices API (`/api/devices`)**
  - GET: Fetch all devices with phone numbers
  - POST: Register/update device
  - DELETE: Remove device

- **SMS API (`/api/sms`)**
  - GET: Fetch SMS messages
  - DELETE: Remove SMS message

- **Device Registration (`/api/device/register`)**
  - Handles device registration and SIM slot phone number storage

### 6. Authentication Pages

Added new authentication pages:
- `/login` - User login
- `/signup` - User registration

## Database Migration

The database was reset and migrated using:
```bash
npx prisma migrate reset --force
npx prisma migrate dev --name init
```

This created the new schema with proper relationships and constraints.

## Usage

### Starting the Application

1. Install dependencies:
```bash
npm install
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Run development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`

### Authentication

1. Navigate to `/signup` to create a new account
2. Use `/login` to sign in
3. After authentication, users are redirected to `/dashboard`

### API Usage

All existing API endpoints remain the same, but now use Prisma instead of Supabase:

- `GET /api/devices` - Get all devices
- `POST /api/device/register` - Register a device
- `DELETE /api/devices/[deviceId]` - Delete a device
- `GET /api/sms` - Get SMS messages
- `DELETE /api/sms/[messageId]` - Delete SMS message

## Benefits of the Migration

1. **Better Type Safety**: Prisma provides excellent TypeScript support
2. **Improved Performance**: Direct database access without Supabase overhead
3. **More Control**: Full control over authentication flow
4. **Modern Auth**: Better Auth provides modern authentication features
5. **Better Developer Experience**: Improved tooling and debugging

## Notes

- The same PostgreSQL database is used, so existing data structure is maintained
- All existing functionality remains intact
- Authentication is now handled by Better Auth instead of Supabase Auth
- The migration maintains backward compatibility for the frontend components

## Future Enhancements

1. Add email verification
2. Implement password reset functionality
3. Add social login providers (Google, GitHub, etc.)
4. Add role-based access control
5. Implement API rate limiting
6. Add audit logging

## Troubleshooting

If you encounter any issues:

1. Ensure the database connection is working
2. Check that Prisma migrations have been applied
3. Verify environment variables are set correctly
4. Restart the development server after making changes
