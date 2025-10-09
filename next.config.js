/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  pageExtensions: ['js', 'jsx'], // build only JS/JSX pages
};
module.exports = nextConfig;

