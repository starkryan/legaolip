import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'your-admin-jwt-secret-key-change-in-production'
);

// Admin-only routes that require authentication
const adminRoutes = ['/admin', '/api/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is an admin route
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  if (!isAdminRoute) {
    // Not an admin route, allow access
    return NextResponse.next();
  }

  // For API routes, check Authorization header
  if (pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Verify this is an admin token
      if (payload.type !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Invalid admin token' },
          { status: 401 }
        );
      }

      // Token is valid, allow request to proceed
      return NextResponse.next();
    } catch (error) {
      console.error('JWT verification error:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
  }

  // For admin page routes, let the client-side handle authentication
  // The admin page will check for stored session and redirect to login if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};