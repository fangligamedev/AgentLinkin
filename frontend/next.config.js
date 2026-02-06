/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://doors-visibility-exclusively-presents.trycloudflare.com/api/:path*'
      }
    ];
  }
};

module.exports = nextConfig;
