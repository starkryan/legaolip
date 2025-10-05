const { io } = require('socket.io-client');

// Test Socket.IO client to simulate Android app connection
console.log('🔧 Starting Socket.IO client test to simulate Android app...');

// Create socket connection with same configuration as Android app
const socket = io('http://localhost:3000', {
  path: '/api/socket/io',
  transports: ['polling'], // Use polling only to avoid websocket issues
  upgrade: false,
  rememberUpgrade: false,
  timeout: 10000,
  forceNew: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5
});

const testDeviceId = 'f095193f438bcf0b';

// Connection events
socket.on('connect', () => {
  console.log('✅ Socket connected successfully:', socket.id);
  
  // Step 1: Authenticate device (same as Android app)
  console.log('📱 Sending device authentication...');
  socket.emit('device:authenticate', {
    deviceId: testDeviceId,
    timestamp: Date.now(),
    platform: 'android',
    version: '2.0.1'
  });
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket disconnected:', reason);
});

// Device authentication response
socket.on('device:registered', (data) => {
  console.log('📋 Device registration response:', data);
  
  if (data.status === 'authenticated') {
    // Step 2: Join device room (same as Android app)
    console.log('🏠 Joining device room...');
    socket.emit('join-device-room', testDeviceId);
    
    // Step 3: Start sending heartbeats (same as Android app)
    console.log('💓 Starting heartbeat simulation...');
    sendHeartbeat();
  } else {
    console.error('❌ Device authentication failed:', data);
  }
});

// Heartbeat acknowledgment
socket.on('heartbeat:ack', (data) => {
  console.log('✅ Heartbeat acknowledged:', data);
});

// Send heartbeat function
function sendHeartbeat() {
  const heartbeatData = {
    deviceId: testDeviceId,
    batteryLevel: Math.floor(Math.random() * 30) + 10, // Random battery 10-40%
    deviceStatus: 'online',
    timestamp: Date.now(),
    simSlots: [
      {
        slotIndex: 0,
        carrierName: 'Jio',
        phoneNumber: '9334198143',
        signalStatus: 'Good'
      },
      {
        slotIndex: 1,
        carrierName: 'airtel',
        phoneNumber: '+917501359430',
        signalStatus: 'Good'
      }
    ],
    networkConnectivity: {
      wifiEnabled: true,
      mobileDataEnabled: true,
      signalStrength: 'strong'
    }
  };
  
  console.log('💓 Sending heartbeat:', heartbeatData);
  socket.emit('device:heartbeat', heartbeatData);
}

// Send heartbeats every 5 seconds to simulate real Android app
setInterval(() => {
  if (socket.connected) {
    sendHeartbeat();
  } else {
    console.log('⚠️ Socket not connected, skipping heartbeat');
  }
}, 5000);

// Handle connection events for debugging
socket.on('device:command', (command) => {
  console.log('📨 Received device command:', command);
});

console.log('🚀 Socket.IO client test started. Waiting for connection...');
