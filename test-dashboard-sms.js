const { io } = require('socket.io-client');

// Test dashboard SMS listener
console.log('🖥️ Starting dashboard SMS listener test...');

// Create socket connection as dashboard
const socket = io('http://localhost:3000', {
  path: '/api/socket/io',
  transports: ['polling'],
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

// Connection events
socket.on('connect', () => {
  console.log('✅ Dashboard socket connected successfully:', socket.id);
  
  // Join dashboard room
  console.log('🏠 Joining dashboard room...');
  socket.emit('join-dashboard');
});

socket.on('connect_error', (error) => {
  console.error('❌ Dashboard socket connection error:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Dashboard socket disconnected:', reason);
});

// Listen for SMS events
socket.on('sms-received', (data) => {
  console.log('📨 SMS RECEIVED EVENT:', data);
  console.log('--- SMS Details ---');
  console.log('Device ID:', data.deviceId);
  console.log('Sender:', data.sender);
  console.log('Recipient:', data.recipient);
  console.log('Message:', data.message);
  console.log('Timestamp:', data.timestamp);
  console.log('------------------');
});

socket.on('sms-sent', (data) => {
  console.log('📤 SMS SENT EVENT:', data);
});

socket.on('sms-status-updated', (data) => {
  console.log('📊 SMS STATUS UPDATED EVENT:', data);
});

// Listen for device events too
socket.on('device-heartbeat', (data) => {
  console.log('💓 Device heartbeat event received:', data.deviceId);
});

console.log('🚀 Dashboard SMS listener test started. Waiting for connection...');
console.log('📝 Now run the SMS test client in another terminal to see events...');

// Keep the connection alive
setInterval(() => {
  if (socket.connected) {
    console.log('🟢 Dashboard still connected, listening for SMS events...');
  } else {
    console.log('🔴 Dashboard disconnected, attempting to reconnect...');
  }
}, 10000);
