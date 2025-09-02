import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SimSlot {
  slotIndex: number;
  carrierName: string;
  phoneNumber: string;
}

export interface Device {
  deviceId: string;
  phoneNumber: string;
  simSlots: SimSlot[] | number;
  batteryLevel: number;
  deviceStatus: string;
  lastSeen: Date;
  registeredAt: Date;
}

export interface SMSMessage {
  id: number;
  deviceId: string;
  sender?: string;
  recipient?: string;
  message: string;
  timestamp?: Date;
  receivedAt?: Date;
  sentAt?: Date;
  status?: string;
}

// Function to determine online/offline status based on last seen timestamp
export function getDeviceStatus(lastSeen: Date | string): { status: string; lastSeen: Date } {
  const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
  const now = new Date();
  const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
  
  return {
    status: diffInMinutes <= 2 ? 'online' : 'offline', // Consider online if last seen within 2 minutes
    lastSeen: lastSeenDate
  };
}
