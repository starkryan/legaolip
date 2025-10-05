import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint:{
    ignoreDuringBuilds: true,
  },
  // Enable Pages Router for socket.io API
  serverExternalPackages: ['socket.io'],
  // Ensure Pages Router works alongside App Router
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'mdx'],
};

export default nextConfig;
