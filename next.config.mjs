/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/api/projects/*/pendientes/pdf': ['./src/lib/pendientes/fonts/**/*'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
