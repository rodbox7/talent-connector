/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // ⬇ ONLY build JS/JSX pages (ignore TS/TSX completely)
  pageExtensions: ['js', 'jsx'],
};
module.exports = nextConfig;
