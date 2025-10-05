import { Server as ServerIO } from 'socket.io';

declare global {
  var io: ServerIO | undefined;
}

export const getSocketIO = (): ServerIO | null => {
  if (typeof window !== 'undefined') {
    // Client-side - socket is not available
    return null;
  }
  
  // Server-side - get the global io instance
  return global.io || null;
};

export const emitToDashboard = (event: string, data: any) => {
  const io = getSocketIO();
  if (io) {
    io.to('dashboard').emit(event, data);
  }
};

export const emitToDevice = (deviceId: string, event: string, data: any) => {
  const io = getSocketIO();
  if (io) {
    io.to(`device-${deviceId}`).emit(event, data);
  }
};

export const emitToAll = (event: string, data: any) => {
  const io = getSocketIO();
  if (io) {
    io.emit(event, data);
  }
};
