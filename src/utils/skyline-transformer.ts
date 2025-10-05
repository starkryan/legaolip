import { Device, IDevice, PhoneNumber, IPhoneNumber } from '@/models';

// Skyline device status interface
export interface SkylineDeviceStatus {
  type: 'dev-status';
  seq: number;
  expires: number;
  mac: string;
  ip: string;
  ver: string;
  'max-ports': number;
  'max-slot': number;
  status: SkylinePortStatus[];
}

export interface SkylinePortStatus {
  port: string;
  sim: string;
  seq: number;
  st: number; // Status: 0=empty, 2=ready, 3=active
  imei: string;
  active: number;
  inserted: number;
  slot_active: number;
  led: number;
  network: number; // Network type: 0=no signal, 2=2G, 4=4G
  iccid?: string;
  imsi?: string;
  sn?: string;
  opr?: string; // Operator name
  bal?: string; // Balance
  sig?: number; // Signal strength
}

// Interface for our current device data
export interface DeviceWithPhoneNumbers extends IDevice {
  phoneNumbers: IPhoneNumber[];
}

// Configuration
const SKYLINE_CONFIG = {
  DEFAULT_SEQ: 102,
  DEFAULT_EXPIRES: -1,
  DEFAULT_MAX_PORTS: 32,
  DEFAULT_MAX_SLOTS: 16,
  MAC_PREFIX: '00-31-f1-01-ed',
  DEFAULT_VERSION: '632-801-900-941-100-000',
  DEFAULT_BATTERY_IP: '192.168.0.100',
  DEFAULT_IMEI: '35393644',
  SIGNAL_THRESHOLD: 2 // minutes
};

// Generate a realistic MAC address
function generateMacAddress(deviceId: string): string {
  // Create a deterministic but varied MAC based on device ID
  const hash = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const suffix = hash.toString(16).padStart(6, '0').slice(-6);
  return `${SKYLINE_CONFIG.MAC_PREFIX}-${suffix.slice(0, 2)}-${suffix.slice(2, 4)}-${suffix.slice(4, 6)}`;
}

// Generate a realistic ICCID
function generateICCID(phoneNumber: string, slotIndex: number): string {
  // Generate deterministic ICCID based on phone number and slot
  const baseNumber = phoneNumber.replace(/\D/g, '').slice(-10);
  const slotCode = (slotIndex + 1).toString().padStart(2, '0');
  const checksum = (baseNumber.length + slotIndex) % 10;
  return `8991027${baseNumber.slice(0, 6)}${slotCode}${baseNumber.slice(6, 8)}${checksum}`;
}

// Generate a realistic IMSI
function generateIMSI(phoneNumber: string, slotIndex: number): string {
  // Generate deterministic IMSI based on phone number and slot
  const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-9);
  const slotCode = (slotIndex + 1).toString().padStart(3, '0');
  return `40567${cleanNumber.slice(0, 3)}${slotCode}${cleanNumber.slice(3, 6)}`;
}

// Generate a realistic phone number (SN)
function generateSN(phoneNumber: string): string {
  // Use last 10 digits of phone number as SN
  const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);
  return cleanNumber;
}

// Determine network type based on signal strength and carrier
function getNetworkType(carrierName: string, signalStatus: string): number {
  if (!signalStatus || signalStatus === 'Poor') return 0;
  if (signalStatus === 'Fair') return 2;
  if (signalStatus === 'Excellent' || signalStatus === 'Good') return 4;
  return 2; // Default to 2G
}

// Determine port status based on device status and last seen
function getPortStatus(device: DeviceWithPhoneNumbers, portIndex: number): number {
  const now = new Date();
  const lastSeen = new Date(device.lastSeen);
  const diffInMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

  // Check if device is offline
  if (diffInMinutes > SKYLINE_CONFIG.SIGNAL_THRESHOLD) {
    return 0; // Empty/offline
  }

  // Check if this port has a phone number
  const phoneNumber = device.phoneNumbers.find(pn => pn.slotIndex === portIndex);
  if (!phoneNumber) {
    return 0; // Empty
  }

  // Check battery level
  if (device.batteryLevel !== null && device.batteryLevel < 5) {
    return 2; // Ready but low battery
  }

  return 3; // Active
}

// Generate signal strength (0-15)
function getSignalStrength(signalStatus: string): number {
  switch (signalStatus) {
    case 'Excellent': return 15;
    case 'Good': return 12;
    case 'Fair': return 8;
    case 'Poor': return 4;
    default: return 0;
  }
}

// Generate device-specific port number
function generatePortNumber(deviceId: string, slotIndex: number): string {
  // Format: {deviceId}-{slotNumber}.{subSlot}
  // Example: "734f57f5a8e63148-1.01", "734f57f5a8e63148-2.01"
  const slotNumber = (slotIndex + 1).toString();
  const subSlot = '01'; // Always use .01 for now, can be extended later
  return `${deviceId}-${slotNumber}.${subSlot}`;
}

// Parse device ID and slot from port number
export function parsePortNumber(port: string): { deviceId: string; slotIndex: number; subSlot: string } | null {
  // Parse format: {deviceId}-{slotNumber}.{subSlot}
  const match = port.match(/^(.+)-(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    deviceId: match[1],
    slotIndex: parseInt(match[2]) - 1, // Convert back to 0-based index
    subSlot: match[3]
  };
}

// Transform a single device to Skyline format with dynamic port generation
export function transformDeviceToSkyline(device: DeviceWithPhoneNumbers): SkylineDeviceStatus {
  const ports: SkylinePortStatus[] = [];

  // Sort phone numbers by slotIndex to ensure consistent port ordering
  const sortedPhoneNumbers = device.phoneNumbers
    .filter(pn => pn.slotIndex !== null && pn.slotIndex !== undefined)
    .sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));

  // Generate ports only for actual SIM slots that exist
  for (const phoneNumber of sortedPhoneNumbers) {
    const slotIndex = phoneNumber.slotIndex || 0;
    const portStatus = getPortStatus(device, slotIndex);
    const networkType = getNetworkType(phoneNumber.carrierName || '', phoneNumber.signalStatus || '');

    const portNumber = generatePortNumber(device.deviceId, slotIndex);

    const port: SkylinePortStatus = {
      port: portNumber,
      sim: '',
      seq: SKYLINE_CONFIG.DEFAULT_SEQ,
      st: portStatus,
      imei: SKYLINE_CONFIG.DEFAULT_IMEI,
      active: phoneNumber.active ? 1 : 1,
      inserted: phoneNumber.inserted ? 1 : 1,
      slot_active: phoneNumber.slotActive ? 1 : 1,
      led: phoneNumber.led ? 1 : 0,
      network: networkType
    };

    // Add additional fields for the phone number
    port.iccid = phoneNumber.iccid || generateICCID(phoneNumber.phoneNumber, slotIndex);
    port.imsi = phoneNumber.imsi || generateIMSI(phoneNumber.phoneNumber, slotIndex);
    port.sn = phoneNumber.sn || generateSN(phoneNumber.phoneNumber);
    port.opr = phoneNumber.carrierName || 'Unknown';
    port.bal = phoneNumber.balance || '0.00';
    port.sig = phoneNumber.signal !== null ? phoneNumber.signal : getSignalStrength(phoneNumber.signalStatus || '');

    ports.push(port);
  }

  // If device has no phone numbers, generate a minimal empty port for Skyline compatibility
  if (ports.length === 0) {
    const portNumber = generatePortNumber(device.deviceId, 0);
    ports.push({
      port: portNumber,
      sim: '',
      seq: SKYLINE_CONFIG.DEFAULT_SEQ,
      st: 0, // Empty status
      imei: SKYLINE_CONFIG.DEFAULT_IMEI,
      active: 0,
      inserted: 0,
      slot_active: 0,
      led: 0,
      network: 0
    });
  }

  const actualPortCount = ports.length;

  return {
    type: 'dev-status',
    seq: SKYLINE_CONFIG.DEFAULT_SEQ,
    expires: SKYLINE_CONFIG.DEFAULT_EXPIRES,
    mac: generateMacAddress(device.deviceId),
    ip: SKYLINE_CONFIG.DEFAULT_BATTERY_IP,
    ver: SKYLINE_CONFIG.DEFAULT_VERSION,
    'max-ports': actualPortCount, // Use actual port count instead of fixed 32
    'max-slot': Math.max(actualPortCount, 1), // At least 1 slot
    status: ports
  };
}

// Transform multiple devices into a single Skyline gateway with dynamic port generation
export function transformDevicesToSkyline(devices: DeviceWithPhoneNumbers[]): SkylineDeviceStatus {
  const allPhoneNumbers: Array<{phoneNumber: PhoneNumber; deviceId: string}> = [];

  // Collect all phone numbers from all devices
  for (const device of devices) {
    for (const phone of device.phoneNumbers) {
      allPhoneNumbers.push({
        phoneNumber: phone,
        deviceId: device.deviceId
      });
    }
  }

  // Sort by device ID then slotIndex to maintain consistent order
  allPhoneNumbers.sort((a, b) => {
    const deviceCompare = a.deviceId.localeCompare(b.deviceId);
    if (deviceCompare !== 0) return deviceCompare;
    return (a.phoneNumber.slotIndex || 0) - (b.phoneNumber.slotIndex || 0);
  });

  // Create unified gateway status with dynamic ports
  const ports: SkylinePortStatus[] = [];

  // Generate ports only for actual phone numbers (device-based approach)
  let portCounter = 1;
  for (const phoneData of allPhoneNumbers) {
    const slotIndex = phoneData.phoneNumber.slotIndex || 0;
    const portStatus = getPortStatus(
      devices.find(d => d.deviceId === phoneData.deviceId)!,
      slotIndex
    );

    const networkType = getNetworkType(
      phoneData.phoneNumber.carrierName || '',
      phoneData.phoneNumber.signalStatus || ''
    );

    const port: SkylinePortStatus = {
      port: `${portCounter}.01`, // Skyline format: sequential ports based on actual devices
      sim: '',
      seq: generateSequenceNumber('gateway'),
      st: portStatus,
      imei: SKYLINE_CONFIG.DEFAULT_IMEI,
      active: phoneData.phoneNumber.active ? 1 : 1,
      inserted: phoneData.phoneNumber.inserted ? 1 : 1,
      slot_active: phoneData.phoneNumber.slotActive ? 1 : 1,
      led: phoneData.phoneNumber.led ? 1 : 0,
      network: networkType
    };

    // Add phone number details
    const phone = phoneData.phoneNumber;
    port.iccid = phone.iccid || generateICCID(phone.phoneNumber, slotIndex);
    port.imsi = phone.imsi || generateIMSI(phone.phoneNumber, slotIndex);
    port.sn = phone.sn || generateSN(phone.phoneNumber);

    // Enhanced operator field: "CarrierName (deviceId)" for device identification
    const carrierName = phone.carrierName || 'Unknown';
    const deviceId = phoneData.deviceId;
    port.opr = `${carrierName} (${deviceId})`;
    port.bal = phone.balance || '0.00';
    port.sig = phone.signal !== null ? phone.signal : getSignalStrength(phone.signalStatus || '');

    ports.push(port);
    portCounter++;
  }

  // If no phone numbers exist, create a minimal empty port for Skyline compatibility
  if (ports.length === 0) {
    ports.push({
      port: '1.01',
      sim: '',
      seq: generateSequenceNumber('gateway'),
      st: 0, // Empty status
      imei: SKYLINE_CONFIG.DEFAULT_IMEI,
      active: 0,
      inserted: 0,
      slot_active: 0,
      led: 0,
      network: 0,
      opr: 'No devices connected'
    });
  }

  // Use the most recent device for gateway metadata
  const primaryDevice = devices.sort((a, b) =>
    new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  )[0];

  const actualPortCount = ports.length;

  return {
    type: 'dev-status',
    seq: generateSequenceNumber('gateway'),
    expires: SKYLINE_CONFIG.DEFAULT_EXPIRES,
    mac: generateMacAddress('gateway'),
    ip: SKYLINE_CONFIG.DEFAULT_BATTERY_IP,
    ver: SKYLINE_CONFIG.DEFAULT_VERSION,
    'max-ports': actualPortCount, // Dynamic: based on actual phone numbers
    'max-slot': Math.max(actualPortCount, 1), // At least 1 slot
    status: ports
  };
}

// Legacy function - transform single device (for backward compatibility)
export function transformDevicesToSkylineArray(devices: DeviceWithPhoneNumbers[]): SkylineDeviceStatus[] {
  return devices.map(device => transformDeviceToSkyline(device));
}

// Generate a random but consistent sequence number
function generateSequenceNumber(deviceId: string): number {
  const hash = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 100 + (hash % 900); // Range: 100-999
}

// Update configuration if needed
export function updateSkylineConfig(config: Partial<typeof SKYLINE_CONFIG>): void {
  Object.assign(SKYLINE_CONFIG, config);
}

// Port utility functions for device/port lookup
export function findDeviceByPort(portNumber: string, devices: DeviceWithPhoneNumbers[]): DeviceWithPhoneNumbers | null {
  const parsed = parsePortNumber(portNumber);
  if (!parsed) return null;

  return devices.find(device => device.deviceId === parsed.deviceId) || null;
}

export function findPhoneNumbersByPort(portNumber: string, devices: DeviceWithPhoneNumbers[]): PhoneNumber[] {
  const parsed = parsePortNumber(portNumber);
  if (!parsed) return [];

  const device = findDeviceByPort(portNumber, devices);
  if (!device) return [];

  return device.phoneNumbers.filter(pn => pn.slotIndex === parsed.slotIndex);
}

export function validatePortNumber(portNumber: string): boolean {
  return parsePortNumber(portNumber) !== null;
}

// Export configuration for external use
export { SKYLINE_CONFIG };