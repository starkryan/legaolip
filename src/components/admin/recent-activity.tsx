'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
  AlertTriangle,
  Smartphone,
  CreditCard,
  Users,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Bell
} from 'lucide-react';

export function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const mockActivities = [
    {
      id: 1,
      type: 'withdrawal_approved',
      description: 'Approved withdrawal of ₹2,500 for user-789',
      user: 'Admin',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      status: 'success',
      severity: 'low',
      details: {
        amount: 2500,
        deviceId: 'device-789',
        processingTime: '1.2s'
      }
    },
    {
      id: 2,
      type: 'withdrawal_rejected',
      description: 'Rejected withdrawal of ₹15,000 for user-456 - Insufficient balance',
      user: 'System',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'error',
      severity: 'medium',
      details: {
        amount: 15000,
        deviceId: 'device-456',
        reason: 'Insufficient balance'
      }
    },
    {
      id: 3,
      type: 'device_registered',
      description: 'New device registered: Samsung S23 (device-123)',
      user: 'System',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      status: 'success',
      severity: 'info',
      details: {
        deviceId: 'device-123',
        deviceModel: 'Samsung S23',
        phoneNumber: '+91-98***76'
      }
    },
    {
      id: 4,
      type: 'withdrawal_request',
      description: 'New withdrawal request: ₹8,500 from user-789',
      user: 'System',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'pending',
      severity: 'medium',
      details: {
        amount: 8500,
        deviceId: 'device-789',
        priority: 'medium'
      }
    },
    {
      id: 5,
      type: 'system_alert',
      description: 'High transaction volume detected - 2.3x normal rate',
      user: 'System',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      status: 'warning',
      severity: 'high',
      details: {
        alertType: 'volume_spike',
        currentRate: '2.3x',
        threshold: '2.0x'
      }
    },
    {
      id: 6,
      type: 'api_error',
      description: 'Payment gateway timeout for transaction #txn-9876',
      user: 'System',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      status: 'error',
      severity: 'high',
      details: {
        transactionId: 'txn-9876',
        gateway: 'KukuPay',
        error: 'Connection timeout'
      }
    },
    {
      id: 7,
      type: 'user_login',
      description: 'Admin login from IP 192.168.1.100',
      user: 'Admin',
      timestamp: new Date(Date.now() - 90 * 60 * 1000),
      status: 'success',
      severity: 'info',
      details: {
        ip: '192.168.1.100',
        location: 'Mumbai, India'
      }
    },
    {
      id: 8,
      type: 'database_backup',
      description: 'Automated database backup completed successfully',
      user: 'System',
      timestamp: new Date(Date.now() - 120 * 60 * 1000),
      status: 'success',
      severity: 'low',
      details: {
        backupSize: '2.4GB',
        duration: '4m 32s'
      }
    }
  ];

  useEffect(() => {
    setActivities(mockActivities);
  }, []);

  const getActivityIcon = (type: string, status: string) => {
    const iconClass = "w-5 h-5";

    switch (type) {
      case 'withdrawal_approved':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'withdrawal_rejected':
        return <XCircle className={`${iconClass} text-red-600`} />;
      case 'withdrawal_request':
        return <Clock className={`${iconClass} text-orange-600`} />;
      case 'device_registered':
        return <Smartphone className={`${iconClass} text-blue-600`} />;
      case 'system_alert':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
      case 'api_error':
        return <XCircle className={`${iconClass} text-red-600`} />;
      case 'user_login':
        return <Users className={`${iconClass} text-purple-600`} />;
      case 'database_backup':
        return <Database className={`${iconClass} text-green-600`} />;
      default:
        return <Activity className={`${iconClass} text-gray-600`} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">Warning</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return timestamp.toLocaleDateString();
  };

  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filterType === 'all' || activity.type === filterType;
    const matchesSearch = activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const systemHealth = [
    {
      name: 'Database Connection',
      status: 'healthy',
      value: '99.9%',
      icon: Database,
      color: 'green',
      lastCheck: '2 min ago'
    },
    {
      name: 'API Server',
      status: 'healthy',
      value: '124ms',
      icon: Server,
      color: 'green',
      lastCheck: 'Just now'
    },
    {
      name: 'Payment Gateway',
      status: 'warning',
      value: '2 timeouts',
      icon: CreditCard,
      color: 'yellow',
      lastCheck: '5 min ago'
    },
    {
      name: 'Active Devices',
      status: 'healthy',
      value: '1,247',
      icon: Smartphone,
      color: 'green',
      lastCheck: '1 min ago'
    },
    {
      name: 'Security Systems',
      status: 'healthy',
      value: 'All clear',
      icon: Shield,
      color: 'green',
      lastCheck: '3 min ago'
    },
    {
      name: 'Cache Performance',
      status: 'healthy',
      value: '94.6%',
      icon: Zap,
      color: 'green',
      lastCheck: 'Just now'
    }
  ];

  const refreshData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recent Activity</h2>
          <p className="text-gray-600">Monitor system events and real-time admin actions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="withdrawal_approved">Approved</SelectItem>
              <SelectItem value="withdrawal_rejected">Rejected</SelectItem>
              <SelectItem value="withdrawal_request">Requests</SelectItem>
              <SelectItem value="device_registered">New Devices</SelectItem>
              <SelectItem value="system_alert">Alerts</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">87.5%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Items</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activities">Activity Log</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Real-time Activity Feed</CardTitle>
                  <CardDescription>Latest system events and admin actions</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredActivities.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No activities found matching your criteria</p>
                  </div>
                ) : (
                  filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type, activity.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.description}
                            </p>
                            {activity.details && (
                              <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                                {Object.entries(activity.details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-500">
                                by {activity.user} • {formatTimestamp(activity.timestamp)}
                              </span>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(activity.status)}
                                {getSeverityBadge(activity.severity)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {filteredActivities.length > 0 && (
                <div className="mt-6 text-center">
                  <Button variant="outline">
                    Load More Activities
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  System Health Status
                </CardTitle>
                <CardDescription>Real-time monitoring of system components</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemHealth.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.name}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          item.color === 'green'
                            ? 'bg-green-50 border-green-200'
                            : item.color === 'yellow'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            item.color === 'green'
                              ? 'bg-green-200'
                              : item.color === 'yellow'
                              ? 'bg-yellow-200'
                              : 'bg-red-200'
                          }`}>
                            <Icon className={`w-5 h-5 ${
                              item.color === 'green'
                                ? 'text-green-700'
                                : item.color === 'yellow'
                                ? 'text-yellow-700'
                                : 'text-red-700'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">Last checked: {item.lastCheck}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            item.color === 'green'
                              ? 'text-green-700'
                              : item.color === 'yellow'
                              ? 'text-yellow-700'
                              : 'text-red-700'
                          }`}>
                            {item.value}
                          </p>
                          <Badge
                            variant={item.status === 'healthy' ? 'default' : 'secondary'}
                            className={
                              item.color === 'green'
                                ? 'bg-green-100 text-green-800'
                                : item.color === 'yellow'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>System performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">API Response Time</span>
                      <span className="text-sm text-green-600">124ms</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-600 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Database Query Performance</span>
                      <span className="text-sm text-green-600">45ms</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-600 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Cache Hit Rate</span>
                      <span className="text-sm text-green-600">94.6%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-600 rounded-full" style={{ width: '94.6%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm text-yellow-600">68.3%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-yellow-600 rounded-full" style={{ width: '68.3%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">CPU Load</span>
                      <span className="text-sm text-green-600">42%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-600 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Active Alerts
              </CardTitle>
              <CardDescription>Current system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">High transaction volume detected</p>
                    <p className="text-sm text-yellow-700">Current rate is 2.3x normal - monitor for potential issues</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900">Payment gateway timeouts</p>
                    <p className="text-sm text-red-700">2 timeouts detected in the last hour</p>
                  </div>
                  <Badge variant="destructive">High</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Database className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">Scheduled maintenance</p>
                    <p className="text-sm text-blue-700">Database backup scheduled for tonight at 2:00 AM</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Info</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}