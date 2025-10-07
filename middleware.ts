import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Add CORS headers to all responses
  const response = NextResponse.next();
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle redirects for old iframe URLs
  if (request.url.includes('/dashboard/sms-forwarding')) {
    const url = new URL(request.url);
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  
  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/sms-forwarding/:path*'
  ],
};