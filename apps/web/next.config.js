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
  // Server Actions origin validation for Replit environment
  experimental: {
    serverActions: {
      allowedOrigins: [
        '8eb1efba-61c4-4661-8cb0-7025370b5dfd-00-21cmsqubekbye.riker.replit.dev',
        '8eb1efba-61c4-4661-8cb0-7025370b5dfd-00-21cmsqubekbye.riker.replit.dev:5000',
        '*.replit.dev',
        '*.replit.dev:5000',
        '*.riker.replit.dev',
        '*.riker.replit.dev:5000',
        'localhost:5000'
      ]
    }
  },
  // This tells Next.js to trust the Replit preview window
  // Use exact domain pattern or wildcard pattern that matches Replit domains
  allowedDevOrigins: [
    "localhost:3000",
    "localhost:5000", // Keep for local development
    "*.replit.dev",
    "*.repl.co",
    "*.riker.replit.dev",
    // Add your exact Replit domain if wildcards don't work
    "8eb1efba-61c4-4661-8cb0-7025370b5dfd-00-21cmsqubekbye.riker.replit.dev"
  ],
};

module.exports = nextConfig;
