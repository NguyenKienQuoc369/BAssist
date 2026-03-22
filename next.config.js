/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    // On Vercel, set NEXT_PUBLIC_API_BASE to external backend; disable rewrites there.
    if (process.env.NEXT_PUBLIC_API_BASE) {
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
