'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Trash2 } from 'lucide-react';

interface SimSlot {
  slotIndex: number;
  carrierName: string;
  phoneNumber: string;
}

interface Device {
  deviceId: string;
  phoneNumber: string;
  simSlots: SimSlot[] | number;
  batteryLevel: number;
  deviceStatus: string;
  lastSeen: string;
  registeredAt: string;
  isOnline: boolean;
}

interface SMSMessage {
  id: number;
  deviceId: string;
  sender?: string;
  recipient?: string;
  message: string;
  timestamp?: string;
  receivedAt?: string;
  sentAt?: string;
  status?: string;
}

export default function GOIPDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [smsMessages, setSmsMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalSms: 0,
    receivedSms: 0
  });

  const API_BASE = '/api';

  const refreshData = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadDevices(),
        loadSms()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const response = await fetch(`${API_BASE}/devices`);
      const data = await response.json();
      
      const devices = data.devices || [];
      setDevices(devices);
      
      // Update stats using isOnline field
      const onlineDevices = devices.filter((d: Device) => d.isOnline).length;
      setStats(prev => ({
        ...prev,
        totalDevices: devices.length,
        onlineDevices
      }));
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadSms = async () => {
    try {
      const response = await fetch(`${API_BASE}/sms`);
      const data = await response.json();
      
      const messages = data.messages || [];
      setSmsMessages(messages);
      
      // Update stats
      const receivedMessages = messages.filter((m: SMSMessage) => m.sender).length;
      setStats(prev => ({
        ...prev,
        totalSms: messages.length,
        receivedSms: receivedMessages
      }));
    } catch (error) {
      console.error('Error loading SMS:', error);
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/devices/${deviceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove device from local state
        setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalDevices: prev.totalDevices - 1,
          onlineDevices: prev.onlineDevices - 1
        }));
      } else {
        console.error('Failed to delete device');
        alert('Failed to delete device');
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Error deleting device');
    }
  };

  const deleteSms = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/sms/${messageId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove message from local state
        setSmsMessages(prev => prev.filter(m => m.id !== messageId));
        // Update stats
        setStats(prev => ({
          ...prev,
          totalSms: prev.totalSms - 1,
          receivedSms: prev.receivedSms - 1
        }));
      } else {
        console.error('Failed to delete message');
        alert('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Error deleting message');
    }
  };

  const getBatteryClass = (level: number) => {
    if (level >= 70) return 'high';
    if (level >= 30) return 'medium';
    return 'low';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  // Function to format multiple phone numbers from device data
  const formatPhoneNumbers = (device: Device) => {
    const numbers: string[] = [];

    // Add main phone number if available
    if (device.phoneNumber && device.phoneNumber.trim() !== '') {
      numbers.push(device.phoneNumber.trim());
    }

    // Add SIM slot phone numbers if available
    if (Array.isArray(device.simSlots)) {
      device.simSlots.forEach((slot) => {
        if (slot.phoneNumber && slot.phoneNumber.trim() !== '') {
          // Only add if not already in the list to avoid duplicates
          if (!numbers.includes(slot.phoneNumber.trim())) {
            numbers.push(slot.phoneNumber.trim());
          }
        }
      });
    }

    // Return formatted string or 'Unknown' if no numbers found
    return numbers.length > 0 ? numbers.join(', ') : 'Unknown';
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mb-8">
        <h1 className="text-3xl font-bold">GOIP SMS Dashboard</h1>
        <p className="text-blue-100">Real-time monitoring of SMS devices and messages</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalDevices}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.onlineDevices}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total SMS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSms}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Received SMS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.receivedSms}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <Button 
          onClick={refreshData} 
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Connected Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Phone Numbers</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {loading ? 'Loading devices...' : 'No devices connected'}
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.deviceId}>
                      <TableCell className="font-medium">
                        {device.deviceId?.substring(0, 8) || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatPhoneNumbers(device)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={device.batteryLevel || 0} className="w-16" />
                          <span className="text-sm">{device.batteryLevel !== undefined ? `${device.batteryLevel}%` : 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.isOnline ? 'default' : 'destructive'}>
                          {device.isOnline ? 'online' : 'offline'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(device.lastSeen)}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteDevice(device.deviceId)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>SMS Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {smsMessages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {loading ? 'Loading messages...' : 'No messages'}
                    </TableCell>
                  </TableRow>
                ) : (
                  smsMessages.slice(-50).reverse().map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-medium">
                        {msg.deviceId?.substring(0, 8) || 'Unknown'}
                      </TableCell>
                      <TableCell>{msg.sender || 'Unknown'}</TableCell>
                      <TableCell>{msg.recipient || 'Unknown'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {msg.message || ''}
                      </TableCell>
                      <TableCell>{formatDate(msg.timestamp || msg.receivedAt || msg.sentAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteSms(msg.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
