'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  connected: boolean;
  error: string | null;
}

export const useSocket = () => {
  const [state, setState] = useState<SocketState>({
    connected: false,
    error: null,
  });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io({
      path: '/api/socket/io',
      addTrailingSlash: false,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Connected to socket server');
      setState({ connected: true, error: null });
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      setState(prev => ({ ...prev, connected: false }));
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setState({ connected: false, error: error.message });
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Helper functions for room management
  const joinDeviceRoom = (deviceId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-device-room', deviceId);
    }
  };

  const leaveDeviceRoom = (deviceId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-device-room', deviceId);
    }
  };

  const joinDashboard = () => {
    if (socketRef.current) {
      socketRef.current.emit('join-dashboard');
    }
  };

  // Event listener registration
  const onDeviceHeartbeat = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('device-heartbeat', callback);
    }
  };

  const onSmsReceived = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('sms-received', callback);
    }
  };

  const onDeviceStatusChange = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('device-status-change', callback);
    }
  };

  const onStatsUpdate = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('stats-update', callback);
    }
  };

  // Event listener cleanup
  const offDeviceHeartbeat = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off('device-heartbeat', callback);
    }
  };

  const offSmsReceived = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off('sms-received', callback);
    }
  };

  const offDeviceStatusChange = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off('device-status-change', callback);
    }
  };

  const offStatsUpdate = (callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off('stats-update', callback);
    }
  };

  return {
    socket: socketRef.current,
    connected: state.connected,
    error: state.error,
    joinDeviceRoom,
    leaveDeviceRoom,
    joinDashboard,
    onDeviceHeartbeat,
    onSmsReceived,
    onDeviceStatusChange,
    onStatsUpdate,
    offDeviceHeartbeat,
    offSmsReceived,
    offDeviceStatusChange,
    offStatsUpdate,
  };
};
