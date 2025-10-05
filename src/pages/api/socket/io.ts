import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';
import { prisma } from '../../../lib/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Socket.IO handler for Next.js Pages Router
export default function SocketHandler(req: NextApiRequest, res: NextApiResponse & { socket: any }) {
  if (res.socket.server.io) {
    console.log('Socket.IO is already running');
    res.end();
    return;
  }

  console.log('Socket.IO is initializing');
  
  const httpServer: NetServer = res.socket.server as any;
  const io = new ServerIO(httpServer, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  
  // Store io instance on the server
  res.socket.server.io = io;
  
  // Handle connections
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join device-specific rooms
    socket.on('join-device-room', (deviceId: string) => {
      socket.join(`device-${deviceId}`);
      console.log(`Socket ${socket.id} joined device room: ${deviceId}`);
    });
    
    // Leave device-specific rooms
    socket.on('leave-device-room', (deviceId: string) => {
      socket.leave(`device-${deviceId}`);
      console.log(`Socket ${socket.id} left device room: ${deviceId}`);
    });
    
    // Join global dashboard room
    socket.on('join-dashboard', () => {
      socket.join('dashboard');
      console.log(`Socket ${socket.id} joined dashboard room`);
    });
    
    // Handle device authentication
    socket.on('device:authenticate', async (data: any) => {
      try {
        console.log('Device authentication:', data);
        
        const { deviceId, platform, version } = data;
        
        if (deviceId) {
          // Check if device exists, if not create it
          let device = await prisma.device.findUnique({
            where: { deviceId: deviceId }
          });
          
          if (!device) {
            // Create new device
            device = await prisma.device.create({
              data: {
                deviceId: deviceId,
                deviceStatus: 'online',
                batteryLevel: 0,
                lastSeen: new Date(),
                registeredAt: new Date(),
                simSlots: []
              }
            });
            console.log(`New device registered: ${deviceId}`);
          } else {
            // Update existing device status
            await prisma.device.update({
              where: { deviceId: deviceId },
              data: {
                deviceStatus: 'online',
                lastSeen: new Date()
              }
            });
            console.log(`Device ${deviceId} authenticated and updated`);
          }
          
          // Join device-specific room
          socket.join(`device-${deviceId}`);
          
          // Confirm authentication
          socket.emit('device:registered', {
            deviceId: deviceId,
            status: 'authenticated',
            timestamp: new Date()
          });
        }
        
      } catch (error) {
        console.error('Error during device authentication:', error);
        socket.emit('device:registered', {
          deviceId: data.deviceId,
          status: 'error',
          error: 'Authentication failed',
          timestamp: new Date()
        });
      }
    });
    
    // Handle device heartbeat
    socket.on('device:heartbeat', async (data: any) => {
      try {
        console.log('Device heartbeat received:', data);
        
        const { deviceId, batteryLevel, deviceStatus, simSlots, timestamp } = data;
        
        if (deviceId) {
          // Update device heartbeat in database
          await prisma.device.update({
            where: { deviceId: deviceId },
            data: {
              batteryLevel: batteryLevel,
              deviceStatus: deviceStatus || 'online',
              lastSeen: new Date(),
              simSlots: simSlots || []
            }
          });
          
          console.log(`Device ${deviceId} heartbeat updated in database`);
        }
        
        // Broadcast to dashboard with enhanced data
        const enhancedData = {
          ...data,
          lastSeen: new Date(),
          isOnline: true
        };
        
        io.to('dashboard').emit('device-heartbeat', enhancedData);
        
        // Acknowledge heartbeat
        socket.emit('heartbeat:ack', { 
          deviceId: deviceId, 
          timestamp: new Date(),
          status: 'received'
        });
        
      } catch (error) {
        console.error('Error handling device heartbeat:', error);
        socket.emit('heartbeat:ack', { 
          deviceId: data.deviceId, 
          error: 'Failed to process heartbeat',
          timestamp: new Date()
        });
      }
    });
    
    // Handle SMS receive
    socket.on('sms:receive', async (data: any) => {
      try {
        console.log('SMS received via Socket.IO:', data);
        
        const { deviceId, sender, message, timestamp, recipient, receivedAt, slotIndex } = data;
        
        if (deviceId && sender && message) {
          // First, ensure the device exists
          let device = await prisma.device.findUnique({
            where: { deviceId: deviceId }
          });
          
          if (!device) {
            console.log(`Device ${deviceId} not found, creating it...`);
            device = await prisma.device.create({
              data: {
                deviceId: deviceId,
                deviceStatus: 'online',
                batteryLevel: 0,
                lastSeen: new Date(),
                registeredAt: new Date(),
                simSlots: []
              }
            });
          }
          
          // Save SMS to database
          const smsData = {
            deviceId: deviceId,
            sender: sender,
            recipient: recipient || 'Unknown',
            message: message,
            timestamp: new Date(timestamp || Date.now()),
            receivedAt: new Date(receivedAt || Date.now()),
            status: 'received',
            slotIndex: slotIndex || 0
          };
          
          const createdSms = await prisma.smsMessage.create({
            data: smsData
          });
          
          console.log(`SMS saved to database with ID: ${createdSms.id}`);
          
          console.log(`SMS from ${sender} saved to database for device ${deviceId}`);
          
          // Broadcast to dashboard with enhanced data
          const enhancedSmsData = {
            ...smsData,
            id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          io.to('dashboard').emit('sms-received', enhancedSmsData);
          
          // Acknowledge SMS receipt
          socket.emit('sms:ack', {
            deviceId: deviceId,
            messageId: enhancedSmsData.id,
            status: 'received',
            timestamp: new Date()
          });
        } else {
          console.warn('Invalid SMS data received:', data);
          socket.emit('sms:ack', {
            deviceId: deviceId,
            status: 'error',
            error: 'Invalid SMS data',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error handling SMS receive:', error);
        socket.emit('sms:ack', {
          deviceId: data.deviceId,
          status: 'error',
          error: 'Failed to process SMS',
          timestamp: new Date()
        });
      }
    });
    
    // Handle SMS sent confirmation
    socket.on('sms:sent', async (data: any) => {
      try {
        console.log('SMS sent confirmation via Socket.IO:', data);
        
        const { deviceId, recipient, message, timestamp, sentAt, status, slotIndex } = data;
        
        if (deviceId && recipient && message) {
          // Update SMS status in database
          const smsData = {
            deviceId: deviceId,
            sender: deviceId, // Device sends SMS
            recipient: recipient,
            message: message,
            timestamp: new Date(timestamp || Date.now()),
            sentAt: new Date(sentAt || Date.now()),
            status: status || 'sent',
            slotIndex: slotIndex || 0
          };
          
          await prisma.smsMessage.create({
            data: smsData
          });
          
          console.log(`SMS to ${recipient} saved to database for device ${deviceId}`);
          
          // Broadcast to dashboard
          const enhancedSmsData = {
            ...smsData,
            id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          io.to('dashboard').emit('sms-sent', enhancedSmsData);
          
          // Acknowledge SMS sent
          socket.emit('sms:ack', {
            deviceId: deviceId,
            messageId: enhancedSmsData.id,
            status: 'sent',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error handling SMS sent confirmation:', error);
        socket.emit('sms:ack', {
          deviceId: data.deviceId,
          status: 'error',
          error: 'Failed to process sent SMS',
          timestamp: new Date()
        });
      }
    });
    
    // Handle SMS status updates
    socket.on('sms:status', async (data: any) => {
      try {
        console.log('SMS status update via Socket.IO:', data);
        
        const { deviceId, messageId, status, timestamp } = data;
        
        if (deviceId && messageId && status) {
          // Update SMS status in database
          await prisma.smsMessage.updateMany({
            where: {
              deviceId: deviceId,
              id: messageId
            },
            data: {
              status: status,
              updatedAt: new Date()
            }
          });
          
          console.log(`SMS ${messageId} status updated to ${status} for device ${deviceId}`);
          
          // Broadcast to dashboard
          io.to('dashboard').emit('sms-status-updated', {
            deviceId: deviceId,
            messageId: messageId,
            status: status,
            timestamp: new Date(timestamp || Date.now())
          });
          
          // Acknowledge status update
          socket.emit('sms:ack', {
            deviceId: deviceId,
            messageId: messageId,
            status: 'status-updated',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error handling SMS status update:', error);
        socket.emit('sms:ack', {
          deviceId: data.deviceId,
          status: 'error',
          error: 'Failed to update SMS status',
          timestamp: new Date()
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  // Make io instance available globally for API routes
  (global as any).io = io;
  
  console.log('Socket.IO server initialized successfully');
  res.end();
}
