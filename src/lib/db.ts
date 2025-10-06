import mongoose from 'mongoose';

// Connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/goip_messages?directConnection=true';

// Connection state
let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected, return mongoose instance
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // If connection is in progress, wait for it
  if (mongoose.connection.readyState === 2) {
    console.log('MongoDB connection already in progress, waiting...');
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => {
        isConnected = true;
        resolve(mongoose);
      });
      mongoose.connection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
  }

  try {
    console.log('Attempting to connect to MongoDB:', MONGODB_URI);

    // Connect to MongoDB using Mongoose
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10, // Connection pool size
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take
      bufferCommands: true, // Enable mongoose buffering to prevent timing issues
    });

    isConnected = true;
    console.log('Connected to MongoDB successfully');
    console.log('Connection details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });

    // Initialize models (this will create collections if they don't exist)
    await initializeModels();

    return mongoose;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error('MONGODB_URI:', MONGODB_URI);
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Initialize models and create indexes
async function initializeModels(): Promise<void> {
  try {
    // Import models to ensure they're registered
    const { Device, PhoneNumber, SmsMessage, SmsForwarding, Message, SmsForwardingConfig } = await import('../models');

    // Create indexes for better performance
    await Promise.all([
      Device.createIndexes(),
      PhoneNumber.createIndexes(),
      SmsMessage.createIndexes(),
      SmsForwarding.createIndexes(),
      Message.createIndexes(),
      SmsForwardingConfig.createIndexes()
    ]);

    console.log('MongoDB models and indexes initialized successfully');
  } catch (error) {
    console.error('Error initializing MongoDB models:', error);
    throw error;
  }
}

export async function closeDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB connection closed');
  }
}

// Check database connection status
export function getConnectionStatus(): {
  isConnected: boolean;
  readyState: number;
  host?: string;
  port?: number;
  name?: string;
} {
  return {
    isConnected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
}

// Export for direct Mongoose access if needed
export { mongoose };