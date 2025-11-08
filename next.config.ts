import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable Pages Router for socket.io API
  serverExternalPackages: ['socket.io'],
  // Ensure Pages Router works alongside App Router
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'mdx'],
  // Add CORS headers for production deployment
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  // Security headers for production
  async rewrites() {
    return [
      {
        source: '/dashboard/sms-forwarding',
        destination: '/dashboard',
      },
    ];
  },
};

export default nextConfig;
