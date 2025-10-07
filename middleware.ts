import { NextRequest, NextResponse } from 'next/server';
import { auth } from "./lib/auth";

export default auth((req) => {
  // Add CORS headers to all responses
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle redirects for old iframe URLs
  if (req.url.includes('/dashboard/sms-forwarding')) {
    const url = new URL(req.url);
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
});

export const config = {
  matcher: [
    // Include all routes except static files, API routes that don't need auth, and auth routes
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};