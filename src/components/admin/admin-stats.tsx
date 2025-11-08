'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Smartphone,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export function AdminStats() {
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);

  // Sample data for charts
  const revenueData = [
    { month: 'Jan', revenue: 45000, target: 48000 },
    { month: 'Feb', revenue: 52000, target: 50000 },
    { month: 'Mar', revenue: 48000, target: 52000 },
    { month: 'Apr', revenue: 61000, target: 55000 },
    { month: 'May', revenue: 55000, target: 58000 },
    { month: 'Jun', revenue: 67000, target: 62000 },
    { month: 'Jul', revenue: 72000, target: 68000 },
  ];

  const userGrowthData = [
    { date: '2024-01', users: 1200, newUsers: 120 },
    { date: '2024-02', users: 1450, newUsers: 250 },
    { date: '2024-03', users: 1680, newUsers: 230 },
    { date: '2024-04', users: 1920, newUsers: 240 },
    { date: '2024-05', users: 2150, newUsers: 230 },
    { date: '2024-06', users: 2480, newUsers: 330 },
    { date: '2024-07', users: 2820, newUsers: 340 },
  ];

  const withdrawalData = [
    { status: 'Approved', value: 65, amount: 2800000 },
    { status: 'Pending', value: 25, amount: 850000 },
    { status: 'Rejected', value: 10, amount: 320000 },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const transactionVolumeData = [
    { day: 'Mon', transactions: 450, amount: 125000 },
    { day: 'Tue', transactions: 520, amount: 145000 },
    { day: 'Wed', transactions: 480, amount: 132000 },
    { day: 'Thu', transactions: 610, amount: 178000 },
    { day: 'Fri', transactions: 580, amount: 165000 },
    { day: 'Sat', transactions: 320, amount: 95000 },
    { day: 'Sun', transactions: 280, amount: 82000 },
  ];

  const deviceData = [
    { device: 'Samsung S23', count: 342, percentage: 28.5 },
    { device: 'Xiaomi Redmi', count: 286, percentage: 23.8 },
    { device: 'OnePlus Nord', count: 198, percentage: 16.5 },
    { device: 'Realme GT', count: 156, percentage: 13.0 },
    { device: 'Others', count: 218, percentage: 18.2 },
  ];

  const systemMetrics = {
    apiResponseTime: 124,
    uptime: 99.9,
    errorRate: 0.2,
    activeConnections: 1247,
    databaseConnections: 89,
    cacheHitRate: 94.6,
    avgQueryTime: 45,
    storageUsed: 68.3,
  };

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const exportData = () => {
    // Simulate data export
    alert('Analytics data exported successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive analytics and business insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹3,94,000</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-green-600" />
                  <span className="text-sm text-green-600">+12.5%</span>
                  <span className="text-xs text-gray-500">from last month</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">2,820</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-blue-600" />
                  <span className="text-sm text-blue-600">+8.2%</span>
                  <span className="text-xs text-gray-500">from last month</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Avg. Transactions</p>
                <p className="text-2xl font-bold text-gray-900">463</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3 h-3 text-red-600" />
                  <span className="text-sm text-red-600">-3.1%</span>
                  <span className="text-xs text-gray-500">from last week</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Connected Devices</p>
                <p className="text-2xl font-bold text-gray-900">1,247</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-purple-600" />
                  <span className="text-sm text-purple-600">+15.3%</span>
                  <span className="text-xs text-gray-500">from last month</span>
                </div>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">Revenue & Growth</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="devices">Device Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Revenue Overview
                </CardTitle>
                <CardDescription>Monthly revenue vs target performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                    target: {
                      label: "Target",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Growth
                </CardTitle>
                <CardDescription>Total users and new user acquisition trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    users: {
                      label: "Total Users",
                      color: "hsl(var(--chart-1))",
                    },
                    newUsers: {
                      label: "New Users",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line yAxisId="left" type="monotone" dataKey="users" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="newUsers" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Daily Transaction Volume
              </CardTitle>
              <CardDescription>Transaction count and monetary volume by day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  transactions: {
                    label: "Transactions",
                    color: "hsl(var(--chart-1))",
                  },
                  amount: {
                    label: "Amount (₹)",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[400px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactionVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="left" dataKey="transactions" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Withdrawal Status Distribution
                </CardTitle>
                <CardDescription>Breakdown of withdrawal requests by status</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    approved: {
                      label: "Approved",
                      color: "#10b981",
                    },
                    pending: {
                      label: "Pending",
                      color: "#f59e0b",
                    },
                    rejected: {
                      label: "Rejected",
                      color: "#ef4444",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={withdrawalData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {withdrawalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Summary</CardTitle>
                <CardDescription>Key withdrawal metrics and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {withdrawalData.map((item) => (
                    <div key={item.status} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            item.status === 'Approved'
                              ? 'bg-green-500'
                              : item.status === 'Pending'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                        />
                        <div>
                          <p className="font-medium">{item.status}</p>
                          <p className="text-sm text-gray-500">₹{item.amount.toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant={item.status === 'Approved' ? 'default' : 'secondary'}>
                        {item.value}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Device Distribution
              </CardTitle>
              <CardDescription>Most popular device models among users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deviceData.map((device, index) => (
                  <div key={device.device} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{device.device}</p>
                        <p className="text-sm text-gray-500">{device.count} devices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{device.percentage}%</p>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${device.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance</CardTitle>
          <CardDescription>Real-time system health and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">API Response</h3>
                <Badge className="bg-green-100 text-green-700">Excellent</Badge>
              </div>
              <p className="text-2xl font-bold text-green-600">{systemMetrics.apiResponseTime}ms</p>
              <p className="text-sm text-gray-500">Average response time</p>
            </div>

            <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Uptime</h3>
                <Badge className="bg-blue-100 text-blue-700">Healthy</Badge>
              </div>
              <p className="text-2xl font-bold text-blue-600">{systemMetrics.uptime}%</p>
              <p className="text-sm text-gray-500">Last 30 days</p>
            </div>

            <div className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Error Rate</h3>
                <Badge className="bg-yellow-100 text-yellow-700">Low</Badge>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{systemMetrics.errorRate}%</p>
              <p className="text-sm text-gray-500">Last 24 hours</p>
            </div>

            <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Cache Hit Rate</h3>
                <Badge className="bg-purple-100 text-purple-700">Optimal</Badge>
              </div>
              <p className="text-2xl font-bold text-purple-600">{systemMetrics.cacheHitRate}%</p>
              <p className="text-sm text-gray-500">Cache efficiency</p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Active Connections</h3>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics.activeConnections}</p>
              <p className="text-sm text-gray-500">Current sessions</p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">DB Connections</h3>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics.databaseConnections}</p>
              <p className="text-sm text-gray-500">Database pool</p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Query Time</h3>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics.avgQueryTime}ms</p>
              <p className="text-sm text-gray-500">Average query</p>
            </div>

            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">Storage Used</h3>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics.storageUsed}%</p>
              <p className="text-sm text-gray-500">Disk utilization</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}