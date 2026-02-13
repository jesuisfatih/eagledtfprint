import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['rrweb-player', '@rrweb/replay', 'rrweb'],
};

export default nextConfig;
