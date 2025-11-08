'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, AlertCircle, Shield } from 'lucide-react';
import { validateAdminAccess } from '@/lib/admin-auth';

interface AdminAuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminAuthWrapper({ children, fallback }: AdminAuthWrapperProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Check user session
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();

      if (!sessionData?.user) {
        setError('You must be logged in to access the admin panel');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      // Check admin access
      const hasAdminAccess = validateAdminAccess(sessionData);

      if (!hasAdminAccess) {
        setError('You do not have permission to access the admin panel');
        setTimeout(() => router.push('/dashboard'), 3000);
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      console.error('Error checking admin access:', err);
      setError('Failed to verify admin access');
      setTimeout(() => router.push('/login'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Verifying Admin Access</CardTitle>
            <CardDescription>
              Please wait while we verify your permissions...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <AlertCircle className="w-4 h-4" />
                <span>You will be redirected automatically...</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return fallback || null;
  }

  return <>{children}</>;
}