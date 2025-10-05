const { io } = require('socket.io-client');

// Test SMS Socket.IO client to simulate Android app SMS functionality
console.log('📱 Starting SMS Socket.IO client test...');

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
  
  // Step 1: Authenticate device
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
    // Step 2: Join device room
    console.log('🏠 Joining device room...');
    socket.emit('join-device-room', testDeviceId);
    
    // Step 3: Start SMS simulation
    console.log('📨 Starting SMS simulation...');
    setTimeout(() => {
      simulateIncomingSMS();
    }, 2000);
  } else {
    console.error('❌ Device authentication failed:', data);
  }
});

// SMS acknowledgment handler
socket.on('sms:ack', (data) => {
  console.log('✅ SMS acknowledged:', data);
});

// Simulate incoming SMS
function simulateIncomingSMS() {
  const smsData = {
    deviceId: testDeviceId,
    sender: '+919876543210',
    message: 'Hello! This is a test SMS from real-time Socket.IO',
    timestamp: Date.now(),
    recipient: '9334198143',
    receivedAt: Date.now(),
    slotIndex: 0
  };
  
  console.log('📨 Simulating incoming SMS:', smsData);
  socket.emit('sms:receive', smsData);
}

// Simulate outgoing SMS
function simulateOutgoingSMS() {
  const smsData = {
    deviceId: testDeviceId,
    recipient: '+919123456789',
    message: 'This is a test outgoing SMS via Socket.IO',
    timestamp: Date.now(),
    sentAt: Date.now(),
    status: 'sent',
    slotIndex: 1
  };
  
  console.log('📤 Simulating outgoing SMS:', smsData);
  socket.emit('sms:sent', smsData);
}

// Simulate SMS status update
function simulateSMSStatusUpdate() {
  const statusData = {
    deviceId: testDeviceId,
    messageId: `sms_${Date.now()}_test123`,
    status: 'delivered',
    timestamp: Date.now()
  };
  
  console.log('📊 Simulating SMS status update:', statusData);
  socket.emit('sms:status', statusData);
}

// Test sequence
setTimeout(() => {
  simulateOutgoingSMS();
}, 5000);

setTimeout(() => {
  simulateSMSStatusUpdate();
}, 8000);

// Send multiple test SMS messages
const testMessages = [
  { sender: '+919876543210', message: 'Test message 1: Real-time SMS working!', recipient: '9334198143' },
  { sender: '+91911222333', message: 'Test message 2: Battery level at 45%', recipient: '+917501359430' },
  { sender: 'BANK', message: 'Your account balance is Rs. 10,000', recipient: '9334198143' },
  { sender: '+919988776655', message: 'System rebooted successfully', recipient: '+917501359430' }
];

let messageIndex = 0;
setInterval(() => {
  if (socket.connected && messageIndex < testMessages.length) {
    const msg = testMessages[messageIndex];
    const smsData = {
      deviceId: testDeviceId,
      sender: msg.sender,
      message: msg.message,
      timestamp: Date.now(),
      recipient: msg.recipient,
      receivedAt: Date.now(),
      slotIndex: messageIndex % 2 // Alternate between SIM slots
    };
    
    console.log(`📨 Sending test SMS ${messageIndex + 1}:`, msg.sender, '-', msg.message.substring(0, 30) + '...');
    socket.emit('sms:receive', smsData);
    messageIndex++;
  }
}, 3000);

console.log('🚀 SMS Socket.IO client test started. Waiting for connection...');
