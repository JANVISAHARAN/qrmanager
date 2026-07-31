/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp works natively in Node.js API routes; no special webpack config needed.
  experimental: {
    serverComponentsExternalPackages: ["sharp", "mongoose"],
  },
};

module.exports = nextConfig;
