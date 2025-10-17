'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { SMSModal } from '@/components/sms-modal';
import { ConnectionStatus } from '@/components/connection-status';
import { useSocket } from '@/hooks/useSocket';
import SmsForwardingTab from '@/components/sms-forwarding-tab';
import { AuthWrapper } from '@/components/auth-wrapper';
import { signOut } from '@/lib/auth-client';
import {
  Trash2,
  Smartphone,
  MessageSquare,
  Activity,
  Settings,
  RefreshCw,
  Search,
  Eye,
  Wifi,
  WifiOff,
  Battery,
  Clock,
  Signal,
  SignalHigh,
  SignalLow,
  SignalZero,
  AlertCircle,
  ExternalLink,
  LogOut
} from 'lucide-react';

interface SimSlot {
  slotIndex: number;
  carrierName: string;
  phoneNumber: string;
  signalStatus?: string;
}

interface DeviceBrandInfo {
  brand: string;      // Build.MANUFACTURER (e.g., "Xiaomi")
  model: string;      // Build.MODEL (e.g., "Redmi Note 12")
  product: string;    // Build.PRODUCT (e.g., "sunstone")
  board: string;      // Build.BOARD (e.g., "sunstone")
  device: string;     // Build.DEVICE (e.g., "sunstone")
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
  deviceBrandInfo?: DeviceBrandInfo;
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
  slotIndex?: number;
  carrierName?: string;
  slotInfo?: {
    slotIndex: number;
    carrierName: string;
    phoneNumber: string;
  };
}

export default function GOIPDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [smsMessages, setSmsMessages] = useState<SMSMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<SMSMessage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    totalSms: 0,
    receivedSms: 0
  });

  const API_BASE = '/api';
  const socket = useSocket();

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

      const deviceList = data.devices || [];
      setDevices(deviceList);
      
      // Update stats using isOnline field
      const onlineDevices = deviceList.filter((d: Device) => d.isOnline).length;
      setStats(prev => ({
        ...prev,
        totalDevices: deviceList.length,
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

  // Filter messages based on search term
  useEffect(() => {
    const filtered = smsMessages.filter(msg => 
      msg.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.sender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.deviceId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMessages(filtered);
  }, [searchTerm, smsMessages]);

  const deleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    
    try {
      const response = await fetch(`${API_BASE}/devices/${deviceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
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
        setSmsMessages(prev => prev.filter(m => m.id !== messageId));
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

  const openMessageModal = (message: SMSMessage) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const formatTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Function to get signal icon and color based on signal status
  const getSignalIcon = (signalStatus?: string) => {
    if (!signalStatus || signalStatus === 'null' || signalStatus === 'Unknown') {
      return <SignalZero className="h-4 w-4 text-gray-400" />;
    }
    
    const signalLower = signalStatus.toLowerCase();
    if (signalLower.includes('excellent') || signalLower.includes('great') || signalLower.includes('4') || signalLower.includes('5')) {
      return <SignalHigh className="h-4 w-4 text-green-500" />;
    } else if (signalLower.includes('good') || signalLower.includes('3')) {
      return <Signal className="h-4 w-4 text-blue-500" />;
    } else if (signalLower.includes('poor') || signalLower.includes('weak') || signalLower.includes('1') || signalLower.includes('2')) {
      return <SignalLow className="h-4 w-4 text-orange-500" />;
    } else if (signalLower.includes('none') || signalLower.includes('0')) {
      return <SignalZero className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Function to format signal status text
  const formatSignalStatus = (signalStatus?: string) => {
    if (!signalStatus || signalStatus === 'null' || signalStatus === 'Unknown') {
      return 'No Signal';
    }
    return signalStatus;
  };

  // Function to format SIM slot information from device data
  const formatSimSlots = (device: Device) => {
    if (Array.isArray(device.simSlots) && device.simSlots.length > 0) {
      // Deduplicate SIM slots based on slotIndex and phoneNumber
      const uniqueSlots = device.simSlots.filter((slot, index, self) =>
        index === self.findIndex((s) =>
          s.slotIndex === slot.slotIndex && s.phoneNumber === slot.phoneNumber
        )
      );

      return uniqueSlots.map(slot =>
        `SIM${slot.slotIndex}: ${slot.phoneNumber} (${slot.carrierName})`
      ).join(' | ');
    }
    return device.phoneNumber && device.phoneNumber.trim() !== ''
      ? device.phoneNumber.trim()
      : 'Unknown';
  };

  // Function to format SIM slot details with signal information
  const formatSimSlotsWithSignal = (device: Device) => {
    if (Array.isArray(device.simSlots) && device.simSlots.length > 0) {
      // Deduplicate SIM slots based on slotIndex and phoneNumber
      const uniqueSlots = device.simSlots.filter((slot, index, self) =>
        index === self.findIndex((s) =>
          s.slotIndex === slot.slotIndex && s.phoneNumber === slot.phoneNumber
        )
      );

      return uniqueSlots.map((slot, index) => (
        <div key={`${slot.slotIndex}-${slot.phoneNumber || ''}-${index}`} className="flex items-center gap-2 text-sm">
          {getSignalIcon(slot.signalStatus)}
          <span className="font-mono">
            SIM{slot.slotIndex}: {slot.phoneNumber} ({slot.carrierName})
          </span>
          <span className="text-xs text-muted-foreground">
            {formatSignalStatus(slot.signalStatus)}
          </span>
        </div>
      ));
    }
    return (
      <div className="flex items-center gap-2 text-sm">
        <SignalZero className="h-4 w-4 text-gray-400" />
        <span className="font-mono">
          {device.phoneNumber && device.phoneNumber.trim() !== '' 
            ? device.phoneNumber.trim() 
            : 'Unknown'}
        </span>
        <span className="text-xs text-muted-foreground">No Signal Info</span>
      </div>
    );
  };

  // Function to format SMS recipient with slot information
  const formatSMSRecipient = (msg: SMSMessage) => {
    if (msg.carrierName && msg.slotIndex !== undefined) {
      return `${msg.recipient} (${msg.carrierName})`;
    }
    return msg.recipient || 'Unknown';
  };

  // Function to format device brand information
  const formatDeviceBrandInfo = (device: Device) => {
    if (!device.deviceBrandInfo) {
      return 'Unknown Device';
    }

    const { brand, model, product, board, device: deviceName } = device.deviceBrandInfo;

    // Create a clean, readable device description
    if (brand && model && model.toLowerCase().includes(brand.toLowerCase())) {
      // Model already includes brand (e.g., "Xiaomi Redmi Note 12")
      return model;
    } else if (brand && model) {
      // Combine brand and model
      return `${brand} ${model}`;
    } else if (model) {
      // Use model only
      return model;
    } else if (brand) {
      // Use brand only
      return brand;
    } else if (product) {
      // Use product as fallback
      return product;
    } else {
      // Final fallback
      return 'Unknown Device';
    }
  };

  // Function to get detailed device brand information for tooltips
  const getDetailedDeviceBrandInfo = (device: Device) => {
    if (!device.deviceBrandInfo) return 'No device information available';
    
    const { brand, model, product, board, device: deviceName } = device.deviceBrandInfo;
    const details = [];
    
    if (brand) details.push(`Brand: ${brand}`);
    if (model) details.push(`Model: ${model}`);
    if (product) details.push(`Product: ${product}`);
    if (board) details.push(`Board: ${board}`);
    if (deviceName) details.push(`Device: ${deviceName}`);
    
    return details.length > 0 ? details.join('\n') : 'No device information available';
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if logout fails
      window.location.href = '/login';
    }
  };

  // Socket event handlers
  const handleDeviceHeartbeat = useCallback((deviceData: any) => {
    setDevices(prev => {
      const existingIndex = prev.findIndex(d => d.deviceId === deviceData.deviceId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...deviceData,
          // Ensure simSlots is properly formatted
          simSlots: deviceData.simSlots || deviceData.phoneNumbers || updated[existingIndex].simSlots
        };
        return updated;
      } else {
        return [...prev, deviceData];
      }
    });
  }, []);

  const handleSmsReceived = useCallback((smsData: any) => {
    setSmsMessages(prev => [smsData, ...prev]);
    setStats(prev => ({
      ...prev,
      totalSms: prev.totalSms + 1,
      receivedSms: prev.receivedSms + 1
    }));
  }, []);

  const handleDeviceStatusChange = useCallback((statusData: any) => {
    setDevices(prev => prev.map(device => 
      device.deviceId === statusData.deviceId 
        ? { ...device, ...statusData }
        : device
    ));
  }, []);

  const handleStatsUpdate = useCallback((statsData: any) => {
    setStats(prev => ({
      ...prev,
      totalDevices: statsData.totalDevices ?? prev.totalDevices,
      onlineDevices: statsData.onlineDevices ?? prev.onlineDevices,
      totalSms: statsData.totalSms ?? prev.totalSms,
      receivedSms: statsData.receivedSms ?? prev.receivedSms
    }));
  }, []);

  // Initialize socket connection and event listeners
  useEffect(() => {
    if (socket.connected) {
      socket.joinDashboard();

      // Set up event listeners
      socket.onDeviceHeartbeat(handleDeviceHeartbeat);
      socket.onSmsReceived(handleSmsReceived);
      socket.onDeviceStatusChange(handleDeviceStatusChange);
      socket.onStatsUpdate(handleStatsUpdate);

      return () => {
        // Cleanup event listeners
        socket.offDeviceHeartbeat(handleDeviceHeartbeat);
        socket.offSmsReceived(handleSmsReceived);
        socket.offDeviceStatusChange(handleDeviceStatusChange);
        socket.offStatsUpdate(handleStatsUpdate);
      };
    }
  }, [socket.connected, socket, handleDeviceHeartbeat, handleSmsReceived, handleDeviceStatusChange, handleStatsUpdate]);

  // Initial data load and fallback polling
  useEffect(() => {
    refreshData();
    
    // Fallback polling every 30 seconds in case socket disconnects
    const interval = setInterval(() => {
      if (!socket.connected) {
        refreshData();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [socket.connected]);

  return (
    <AuthWrapper>
      <SidebarProvider>
        <Sidebar>
        <SidebarHeader className="border-b">
          <div className="flex items-center gap-2 px-2 py-1">
            <Smartphone className="h-6 w-6" />
            <span className="font-semibold">GOIP Dashboard</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
              >
                <Activity className="h-4 w-4" />
                Overview
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeTab === 'devices'}
                onClick={() => setActiveTab('devices')}
              >
                <Smartphone className="h-4 w-4" />
                Devices
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                isActive={activeTab === 'messages'}
                onClick={() => setActiveTab('messages')}
              >
                <MessageSquare className="h-4 w-4" />
                Messages
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeTab === 'sms-forwarding'}
                onClick={() => setActiveTab('sms-forwarding')}
              >
                <ExternalLink className="h-4 w-4" />
                SMS Forwarding
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Settings className="h-4 w-4" />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t">
          <div className="p-2">
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <ConnectionStatus />
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
              title={socket.connected ? "Manual refresh" : "Socket disconnected - using polling"}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDevices}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.onlineDevices}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total SMS</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSms}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Received SMS</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.receivedSms}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="sms-forwarding">SMS Forwarding</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Recent Devices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {devices.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {loading ? 'Loading devices...' : 'No devices connected'}
                          </div>
                        ) : (
                          devices.slice(0, 5).map((device) => (
                            <div key={device.deviceId} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  {device.isOnline ? (
                                    <Wifi className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <WifiOff className="h-4 w-4 text-red-500" />
                                  )}
                                  <div>
                                    <div className="font-medium text-sm" title={getDetailedDeviceBrandInfo(device)}>
                                      {formatDeviceBrandInfo(device)}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {device.deviceId || 'Unknown'} • {formatTimeAgo(device.lastSeen)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <Badge variant={device.isOnline ? 'default' : 'destructive'}>
                                {device.isOnline ? 'online' : 'offline'}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Recent Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {smsMessages.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            {loading ? 'Loading messages...' : 'No messages'}
                          </div>
                        ) : (
                          smsMessages.slice(0, 5).reverse().map((msg) => (
                            <div key={msg.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {msg.sender || 'Unknown'}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 line-clamp-2 break-words" title={msg.message || ''}>
                                  {msg.message || ''}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {formatSMSRecipient(msg)} • {formatTimeAgo(msg.timestamp || msg.receivedAt || msg.sentAt)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openMessageModal(msg)}
                                className="h-8 w-8 p-0 flex-shrink-0 ml-2"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="devices" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Connected Devices</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Device ID</TableHead>
                        <TableHead>SIM Slots</TableHead>
                        <TableHead>Battery</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {loading ? 'Loading devices...' : 'No devices connected'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        devices.map((device) => (
                          <TableRow key={device.deviceId}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium" title={getDetailedDeviceBrandInfo(device)}>
                                  {formatDeviceBrandInfo(device)}
                                </div>
                                {device.deviceBrandInfo?.product && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {device.deviceBrandInfo.product}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium font-mono">
                              {device.deviceId || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              {formatSimSlotsWithSignal(device)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Battery className="h-4 w-4" />
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
            </TabsContent>
            
            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>SMS Messages</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search messages..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8 w-64"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device ID</TableHead>
                        <TableHead>Sender</TableHead>
                        <TableHead>Recipient (SIM)</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            {loading ? 'Loading messages...' : searchTerm ? 'No messages found' : 'No messages'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMessages.slice(-50).reverse().map((msg) => (
                          <TableRow key={msg.id}>
                            <TableCell className="font-medium font-mono">
                              {msg.deviceId || 'Unknown'}
                            </TableCell>
                            <TableCell>{msg.sender || 'Unknown'}</TableCell>
                            <TableCell>{formatSMSRecipient(msg)}</TableCell>
                            <TableCell className="max-w-md">
                              <div className="max-w-md">
                                <p className="text-sm break-words line-clamp-3" title={msg.message || ''}>
                                  {msg.message || ''}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(msg.timestamp || msg.receivedAt || msg.sentAt)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openMessageModal(msg)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteSms(msg.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sms-forwarding" className="space-y-4">
              <SmsForwardingTab />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>

      {/* SMS Modal */}
      <SMSModal
        message={selectedMessage}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMessage(null);
        }}
      />
    </SidebarProvider>
    </AuthWrapper>
  );
}
