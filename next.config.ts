import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Configuración para producción
  poweredByHeader: false,
  compress: true,
  // Optimizaciones de imágenes
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'db.loopia.cl',
      },
    ],
  },
  // Deshabilitar static pages para páginas con datos dinámicos
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // ⚙️ Headers de seguridad personalizados para permitir navegador integrado
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Permite iframes del mismo origen
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
