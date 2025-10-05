# Real-time Socket.IO Implementation

This document describes the Socket.IO real-time features implemented in the GOIP Dashboard.

## Overview

The GOIP Dashboard now supports real-time updates using Socket.IO, eliminating the need for periodic polling and providing instant updates for device status changes and SMS messages.

## Features Implemented

### 1. Real-time Device Updates
- **Device Heartbeat**: Instant updates when devices send heartbeat data
- **Status Changes**: Real-time online/offline status updates
- **Battery Level**: Live battery percentage updates
- **Signal Strength**: Real-time signal status changes
- **SIM Slot Updates**: Instant SIM card information updates

### 2. Real-time SMS Updates
- **SMS Reception**: Instant notification when SMS messages are received
- **Message Delivery**: Real-time delivery confirmations
- **Statistics Updates**: Live SMS count updates

### 3. Dashboard Features
- **Connection Status Indicator**: Visual indicator showing real-time connection status
- **Fallback Polling**: Automatic fallback to polling if socket connection fails
- **Room-based Broadcasting**: Efficient targeting of updates to specific devices

## Architecture

### Socket Server Configuration
- **Location**: `src/app/api/socket/io/route.ts`
- **Path**: `/api/socket/io`
- **CORS**: Enabled for all origins
- **Rooms**: 
  - `dashboard` - Global dashboard updates
  - `device-{deviceId}` - Device-specific updates

### Client Socket Hook
- **Location**: `src/hooks/useSocket.ts`
- **Features**:
  - Automatic connection management
  - Room joining/leaving
  - Event listener registration
  - Connection status tracking

### Socket Utilities
- **Location**: `src/lib/socket.ts`
- **Functions**:
  - `getSocketIO()` - Get socket instance on server
  - `emitToDashboard()` - Broadcast to all dashboard clients
  - `emitToDevice()` - Send to specific device room
  - `emitToAll()` - Broadcast to all connected clients

## API Enhancements

### Device Heartbeat API
**File**: `src/app/api/device/heartbeat/route.ts`
- Emits `device-heartbeat` event with updated device data
- Emits `device-status-change` when device status changes
- Emits `stats-update` with device statistics

### SMS Receive API
**File**: `src/app/api/sms/receive/route.ts`
- Emits `sms-received` event with new SMS data
- Emits `stats-update` with SMS statistics

## Socket Events

### Client to Server Events
- `join-dashboard` - Join global dashboard room
- `join-device-room` - Join device-specific room
- `leave-device-room` - Leave device-specific room

### Server to Client Events
- `device-heartbeat` - Device heartbeat update
- `device-status-change` - Device status change
- `sms-received` - New SMS received
- `stats-update` - Statistics update

## React Integration

### Dashboard Component
**File**: `src/app/dashboard/page.tsx`
- Uses `useSocket` hook for real-time updates
- Handles socket events with useCallback hooks
- Automatic cleanup of event listeners
- Fallback polling when socket disconnected

### Connection Status Component
**File**: `src/components/connection-status.tsx`
- Visual indicator of socket connection status
- Shows "Real-time Connected" when connected
- Shows "Connecting..." when connecting
- Shows "Connection Error" when failed

## Usage Examples

### Client-side Event Handling
```typescript
const socket = useSocket();

useEffect(() => {
  if (socket.connected) {
    socket.joinDashboard();
    socket.onDeviceHeartbeat((data) => {
      console.log('Device heartbeat:', data);
    });
  }
}, [socket.connected]);
```

### Server-side Event Emission
```typescript
import { emitToDashboard } from '@/lib/socket';

// Emit to all dashboard clients
emitToDashboard('device-heartbeat', deviceData);

// Emit to specific device room
emitToDevice(deviceId, 'sms-received', smsData);
```

## Benefits

1. **Reduced Server Load**: Eliminates 30-second polling intervals
2. **Instant Updates**: Real-time device status and SMS delivery
3. **Better UX**: Immediate feedback for all user actions
4. **Scalability**: Efficient broadcasting to multiple clients
5. **Reliability**: Automatic reconnection and fallback mechanisms

## Troubleshooting

### Connection Issues
- Check browser console for socket connection errors
- Verify socket server is running at `/api/socket/io`
- Ensure CORS is properly configured

### Real-time Updates Not Working
- Verify socket connection status in dashboard header
- Check if events are being emitted from API endpoints
- Ensure client is joined to appropriate rooms

### Performance Issues
- Monitor socket event frequency
- Check for memory leaks in event listeners
- Verify proper cleanup in useEffect hooks

## Development Notes

- Socket.IO server runs alongside Next.js API routes
- Global socket instance stored in `global.io`
- Room-based broadcasting ensures efficient updates
- Fallback polling ensures functionality during socket disconnection
