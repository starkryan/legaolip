'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Search, Filter } from 'lucide-react';

export function UserManagement() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage and monitor user accounts</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Statistics</CardTitle>
          <CardDescription>Overview of user accounts and activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Total Users</h3>
              <p className="text-2xl font-bold text-blue-600">1,234</p>
              <p className="text-sm text-gray-500">+12% from last month</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Active Today</h3>
              <p className="text-2xl font-bold text-green-600">456</p>
              <p className="text-sm text-gray-500">37% of total users</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">New This Week</h3>
              <p className="text-2xl font-bold text-purple-600">78</p>
              <p className="text-sm text-gray-500">+23% from last week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>User management coming soon...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Advanced user management features will be available in the next update.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}