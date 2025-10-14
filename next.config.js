/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    appDir: true,
  },
  // IMPORTANT: Do NOT set `output: 'export'`.
};

module.exports = nextConfig;
