import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { Server as NetServer } from 'http';

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
    socket.on('device:authenticate', (data: any) => {
      console.log('Device authentication:', data);
      // You can add authentication logic here
    });
    
    // Handle device heartbeat
    socket.on('device:heartbeat', (data: any) => {
      console.log('Device heartbeat:', data);
      // Broadcast to dashboard
      io.to('dashboard').emit('device-heartbeat', data);
    });
    
    // Handle SMS receive
    socket.on('sms:receive', (data: any) => {
      console.log('SMS received via Socket.IO:', data);
      // Broadcast to dashboard
      io.to('dashboard').emit('sms-received', data);
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
