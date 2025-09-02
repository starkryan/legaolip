// Shared in-memory storage for devices and SMS messages
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

// Use global to persist data across hot reloads
const globalForStorage = globalThis as unknown as {
  storage: Storage | undefined;
};

class Storage {
  private devices: Map<string, Device>;
  private smsMessages: SMSMessage[];

  constructor() {
    // Initialize from global if exists, otherwise create new
    if (globalForStorage.storage) {
      const existingStorage = globalForStorage.storage;
      this.devices = existingStorage.devices;
      this.smsMessages = existingStorage.smsMessages;
    } else {
      this.devices = new Map();
      this.smsMessages = [];
      globalForStorage.storage = this;
    }
  }

  // Device methods
  getDevices(): Map<string, Device> {
    return this.devices;
  }

  getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  setDevice(deviceId: string, device: Device): void {
    this.devices.set(deviceId, device);
  }

  hasDevice(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  // SMS methods
  getSMSMessages(): SMSMessage[] {
    return this.smsMessages;
  }

  addSMSMessage(message: SMSMessage): void {
    this.smsMessages.push(message);
  }

  // Clear methods (for testing)
  clearDevices(): void {
    this.devices.clear();
  }

  clearSMSMessages(): void {
    this.smsMessages = [];
  }
}

// Export a singleton instance
export const storage = globalForStorage.storage || new Storage();
