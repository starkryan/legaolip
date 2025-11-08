'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Smartphone,
  CreditCard,
  UserPlus,
  BarChart3,
  Settings,
  Menu,
  Search,
  Bell,
  LogOut
} from 'lucide-react';
import { AdminAuthProvider, useAdminAuth } from '@/contexts/admin-auth-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { WithdrawalManagement } from '@/components/admin/withdrawal-management';
import { UserManagement } from '@/components/admin/user-management';
import { AdminStats } from '@/components/admin/admin-stats';
import { RecentActivity } from '@/components/admin/recent-activity';

function AdminDashboardContent() {
  const { adminUser, logout, isAuthenticated, isLoading } = useAdminAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingWithdrawals: 0,
    totalWithdrawals: 0,
    todayRevenue: 0,
    activeDevices: 0,
    systemHealth: 'healthy'
  });

  useEffect(() => {
    // Fetch dashboard stats from API
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Fallback values if API fails
          setStats({
            totalUsers: 0,
            pendingWithdrawals: 0,
            totalWithdrawals: 0,
            todayRevenue: 0,
            activeDevices: 0,
            systemHealth: 'healthy'
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set safe default values
        setStats({
          totalUsers: 0,
          pendingWithdrawals: 0,
          totalWithdrawals: 0,
          todayRevenue: 0,
          activeDevices: 0,
          systemHealth: 'healthy'
        });
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    return null;
  }

  // Sidebar navigation items
  const sidebarItems = [
    {
      title: "Dashboard",
      url: "#dashboard",
      icon: BarChart3,
      isActive: true,
    },
    {
      title: "Withdrawals",
      url: "#withdrawals",
      icon: CreditCard,
      isActive: false,
    },
    {
      title: "Users",
      url: "#users",
      icon: Users,
      isActive: false,
    },
    {
      title: "Analytics",
      url: "#analytics",
      icon: TrendingUp,
      isActive: false,
    },
    {
      title: "Devices",
      url: "#devices",
      icon: Smartphone,
      isActive: false,
    },
    {
      title: "Activity",
      url: "#activity",
      icon: Activity,
      isActive: false,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BarChart3 className="h-4 w-4" />
              </div>
              <span className="font-semibold text-lg">GOIP Admin</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.isActive}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Settings">
                    <Settings />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Logout"
                    onClick={logout}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="px-3 py-2">
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {adminUser?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {adminUser?.email || 'Admin'}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <Badge variant="outline" className="flex items-center gap-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                System Healthy
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Clock className="w-4 h-4" />
                Last Sync: Just now
              </Button>

              <Button variant="outline" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  3
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-6 p-6 bg-gray-50">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Users"
              value={stats.totalUsers.toLocaleString()}
              icon={Users}
              trend="+12%"
              trendDirection="up"
              description="from last month"
            />

            <StatCard
              title="Active Devices"
              value={stats.activeDevices.toLocaleString()}
              icon={Smartphone}
              trend="+5%"
              trendDirection="up"
              description="online now"
            />

            <StatCard
              title="Pending Withdrawals"
              value={stats.pendingWithdrawals.toString()}
              icon={AlertCircle}
              trend="Requires attention"
              trendDirection="neutral"
              description="needs review"
              variant="warning"
            />

            <StatCard
              title="Total Withdrawals"
              value={`₹${(stats.totalWithdrawals / 1000).toFixed(1)}K`}
              icon={CreditCard}
              trend="+8%"
              trendDirection="up"
              description="from last week"
            />

            <StatCard
              title="Today's Revenue"
              value={`₹${stats.todayRevenue.toLocaleString()}`}
              icon={DollarSign}
              trend="-2%"
              trendDirection="down"
              description="from yesterday"
              variant="success"
            />
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="withdrawals" className="flex-1 space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-white p-1 rounded-lg shadow-sm">
              <TabsTrigger
                value="withdrawals"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all"
              >
                Withdrawals
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all"
              >
                Users
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="devices"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all"
              >
                Devices
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all"
              >
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="withdrawals" className="space-y-6 bg-white rounded-lg p-6 shadow-sm">
              <WithdrawalManagement />
            </TabsContent>

            <TabsContent value="users" className="space-y-6 bg-white rounded-lg p-6 shadow-sm">
              <UserManagement />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 bg-white rounded-lg p-6 shadow-sm">
              <AdminStats />
            </TabsContent>

            <TabsContent value="devices" className="space-y-6 bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center py-12">
                <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Device Management</h3>
                <p className="text-gray-500 mb-6">Monitor and manage connected GOIP devices</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.activeDevices}</div>
                      <p className="text-sm text-gray-600">Active Devices</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-blue-600">98.5%</div>
                      <p className="text-sm text-gray-600">Uptime</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-purple-600">12ms</div>
                      <p className="text-sm text-gray-600">Avg Response</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6 bg-white rounded-lg p-6 shadow-sm">
              <RecentActivity />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Stat Card Component for consistent styling
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection,
  description,
  variant = "default"
}: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  description: string;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const getTrendIcon = () => {
    if (trendDirection === "up") return <ArrowUpRight className="w-3 h-3" />;
    if (trendDirection === "down") return <ArrowDownRight className="w-3 h-3" />;
    return null;
  };

  const getTrendColor = () => {
    if (trendDirection === "up") return "text-green-600";
    if (trendDirection === "down") return "text-red-600";
    return "text-gray-600";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "bg-card border-green-200 dark:border-green-800";
      case "warning":
        return "bg-card border-orange-200 dark:border-orange-800";
      case "error":
        return "bg-card border-red-200 dark:border-red-800";
      default:
        return "bg-card border-border";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "success": return "text-green-600 dark:text-green-400";
      case "warning": return "text-orange-600 dark:text-orange-400";
      case "error": return "text-red-600 dark:text-red-400";
      default: return "text-primary";
    }
  };

  return (
    <Card className={`relative overflow-hidden ${getVariantStyles()} border hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={`text-xs ${getTrendColor()}`}>{trend}</span>
              <span className="text-xs text-gray-500">{description}</span>
            </div>
          </div>
          <div className={`h-12 w-12 rounded-lg bg-white/70 flex items-center justify-center ${getIconColor()}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  return (
    <AdminAuthProvider>
      <AdminDashboardContent />
    </AdminAuthProvider>
  );
}