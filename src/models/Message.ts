import { Schema, model, Document, mongoose } from 'mongoose';
import { connectDB } from '@/lib/db';

// Define the interface for the Message document
export interface IMessage extends Document {
  sender: string;
  receiver: string;
  port: string;
  time: Date;
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Create the schema
const MessageSchema = new Schema<IMessage>({
  sender: {
    type: String,
    required: true,
    trim: true
  },
  receiver: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: Date,
    required: true,
    default: Date.now
  },
  message: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  collection: 'messages'
});

// Add indexes for better query performance
MessageSchema.index({ sender: 1 });
MessageSchema.index({ receiver: 1 });
MessageSchema.index({ time: -1 });
MessageSchema.index({ port: 1 });

// Create and export the model (prevent overwrite error)
export const Message = mongoose.models.Message || model<IMessage>('Message', MessageSchema);

// Helper function to create a message with the provided pattern
export async function createMessage(data: {
  sender: string;
  receiver: string;
  port: string;
  time: Date;
  message: string;
}): Promise<IMessage> {
  try {
    // Ensure database connection
    await connectDB();

    // Create and save the message
    const message = new Message(data);
    return await message.save();
  } catch (error) {
    console.error('Failed to create message:', error);
    throw error;
  }
}

// Helper function to query messages
export async function findMessages(query: any = {}, limit: number = 100): Promise<IMessage[]> {
  try {
    await connectDB();
    return await Message.find(query)
      .sort({ time: -1 })
      .limit(limit)
      .exec();
  } catch (error) {
    console.error('Failed to find messages:', error);
    throw error;
  }
}

// Export the schema for advanced usage
export { MessageSchema };