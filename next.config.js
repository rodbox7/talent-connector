/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep this minimal. DO NOT set `output: 'export'`.
  reactStrictMode: false,
  experimental: {
    appDir: true, // you're using the /app router
  },
};

module.exports = nextConfig;
