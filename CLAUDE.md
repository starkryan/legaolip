# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GOIP SMS Gateway platform built with Next.js 15, providing real-time monitoring and management of SMS devices and messages. The application features a dashboard for device monitoring, SMS forwarding capabilities, and real-time WebSocket communication with GOIP devices.

## Tech Stack

- **Framework**: Next.js 15 with App Router and Pages Router hybrid
- **Frontend**: React 19, TypeScript, TailwindCSS 4, Radix UI components
- **Backend**: Next.js API routes, Socket.IO for real-time communication
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Better Auth with email/password and Google OAuth
- **Deployment**: PM2 with ecosystem configuration

## Common Development Commands

```bash
# Development
npm run dev              # Start development server on localhost:3000

# Build and Production
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint (ignores during builds per config)
```

## Architecture Overview

### Hybrid Routing Structure

The project uses both Next.js App Router and Pages Router:

- **App Router** (`src/app/`): Main application pages, layout, and components
- **Pages Router** (`src/pages/api/`): API routes, specifically for Socket.IO implementation

### Key Directories

- `src/app/` - App Router pages and global layout
- `src/components/` - Reusable React components and UI library
- `src/lib/` - Utility functions, database connection, authentication
- `src/models/` - Mongoose database schemas and model definitions
- `src/pages/api/` - API routes, including Socket.IO server
- `src/hooks/` - Custom React hooks
- `src/services/` - Business logic services
- `deployment/` - Deployment scripts and configurations

### Database Models

The application uses MongoDB with the following core models:

- `Device` - GOIP device management and status tracking
- `SmsMessage` - SMS message storage and status
- `PhoneNumber` - Phone number management
- `SmsForwarding` - SMS forwarding configuration
- `Message` - General messaging system
- `SmsForwardingConfig` - Forwarding configuration settings

### Real-time Communication

Socket.IO is implemented via Pages Router at `/api/socket/io` and handles:

- Device authentication and heartbeat monitoring
- Real-time SMS message reception and broadcasting
- Device status updates to dashboard clients
- Room-based communication for device-specific updates

## Key Configuration Files

### Next.js Configuration (`next.config.ts`)

- Enables Pages Router alongside App Router
- Configures CORS headers for API routes
- Sets up server external packages for Socket.IO
- Includes security headers and rewrites for old routes

### Database Connection (`src/lib/db.ts`)

- MongoDB connection with Mongoose
- Connection pooling and timeout configuration
- Automatic model initialization and indexing
- Connection state management

### Authentication (`src/lib/auth.ts`)

- Better Auth configuration with MongoDB adapter
- Email/password authentication with optional verification
- Google OAuth integration
- Session management with 7-day expiration

### PM2 Configuration (`ecosystem.config.js`)

- Production deployment setup
- Process monitoring and auto-restart
- Memory limits and log configuration
- Optimized for `/var/www/goip` deployment path

## Development Workflow

### SMS Gateway Features

- Real-time device monitoring via WebSocket
- SMS message reception and forwarding
- Device status tracking and heartbeat management
- Multi-device support with room-based communication

### Socket.IO Events

Key socket events handled by the system:

- `device:authenticate` - Device registration and authentication
- `device:heartbeat` - Device status updates
- `sms:receive` - Incoming SMS message processing
- `sms:sent` - SMS sent confirmation
- `sms:status` - SMS status updates

### Deployment

The project includes automated deployment via `deploy.sh` script:

- Git pull and dependency installation
- Next.js build process
- PM2 process restart
- Comprehensive logging and error handling

## Environment Variables

Required for development and production:
MONGODB_URI=mongodb://127.0.0.1:27017/gfhf?directConnection=true
MONGODB_DATABASE=gfhf

# Better Auth

BETTER_AUTH_SECRET=rajuraj
BETTER_AUTH_URL=<http://localhost:3000>
NEXT_PUBLIC_AUTH_URL=<http://localhost:3000>

# Optional: Google OAuth (if you want to enable Google sign-in)

# GOOGLE_CLIENT_ID=your-google-client-id

# GOOGLE_CLIENT_SECRET=your-google-client-secret

# Next.js

NEXTAUTH_URL=<http://localhost:3000>
NEXTAUTH_SECRET=secret

# Skyline Gateway Configuration

SKYLINE_MAC_PREFIX=00-31-f1-01-ed
SKYLINE_DEFAULT_VERSION=632-801-900-941-100-000
SKYLINE_DEFAULT_IP=192.168.0.100
SMS_FORWARDING_ENABLED=true

## Important Notes

- The project uses TypeScript strict mode throughout
- ESLint is configured to ignore errors during builds (`ignoreDuringBuilds: true`)
- Socket.IO requires Pages Router due to Next.js App Router limitations
- Database connection includes automatic retry logic and timeout handling
- All models include proper indexing for performance optimization
