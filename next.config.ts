import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* No standalone for now to avoid potential Vercel output mismatches */
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
