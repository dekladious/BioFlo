/** @type {import("next").NextConfig} */
const nextConfig = {
  // Disable Turbopack to avoid OneDrive sync issues
  // Use webpack instead (slower but more stable)
  experimental: {
    turbo: false,
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
