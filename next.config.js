/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Only proxy API in local development when no external backend is configured.
    if (process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_API_BASE) {
      return [];
    }

    // Local dev fallback: proxy to FastAPI at 127.0.0.1:8000
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
