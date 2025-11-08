'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminUser {
  email: string;
  name: string;
  role: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    try {
      // Check if we have a stored admin session
      const adminSession = localStorage.getItem('adminSession');

      if (adminSession) {
        const sessionData = JSON.parse(adminSession);

        // Check if session is still valid (not expired)
        if (sessionData.expiresAt && new Date(sessionData.expiresAt) > new Date()) {
          setAdminUser(sessionData.user);
        } else {
          // Session expired, clean up
          localStorage.removeItem('adminSession');
        }
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
      localStorage.removeItem('adminSession');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store admin session
        const sessionData = {
          token: data.data.token,
          user: data.data.user,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        localStorage.setItem('adminSession', JSON.stringify(sessionData));
        setAdminUser(data.data.user);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    // Clear admin session
    localStorage.removeItem('adminSession');
    setAdminUser(null);

    // Optionally call logout API
    fetch('/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(console.error);
  };

  const value: AdminAuthContextType = {
    adminUser,
    isLoading,
    login,
    logout,
    isAuthenticated: !!adminUser
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}