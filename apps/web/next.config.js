/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eydnmdgxyqrwfrecoylb.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        '*.replit.dev',
        '*.replit.dev:5000',
        '*.riker.replit.dev',
        '*.riker.replit.dev:5000',
        'localhost:5000'
      ]
    }
  },
  allowedDevOrigins: [
    "localhost:3000",
    "localhost:5000",
    "*.replit.dev",
    "*.repl.co",
    "*.riker.replit.dev",
  ],
};

module.exports = nextConfig;
