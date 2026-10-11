/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // Turbopack is default bundler in Next.js 16 — migrate webpack alias @→./src
  // Keep webpack for fallback when using --webpack flag
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': new URL('./src', import.meta.url).pathname,
    };
    return config;
  },
  // Next.js 16 image defaults changed: minimumCacheTTL 60s→4h, qualities [1..100]→[75], imageSizes drops 16, maximumRedirects unlimited→3
  // Explicit config to adopt new defaults intentionally (we don't use next/image heavily, but set for clarity)
  images: {
    minimumCacheTTL: 14400, // 4h new default
    qualities: [75], // new default, coerce quality prop to closest
    // dangerouslyAllowLocalIP: false — blocks local IP optimization by default (security)
    // maximumRedirects: 3 — new default
  },
};

export default nextConfig;
