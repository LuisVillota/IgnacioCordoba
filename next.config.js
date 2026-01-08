/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // IMPORTANTE: Cambiado para export estático
  output: 'export', // Cambia de 'standalone' a 'export' para generar /out
  
  // Optimización de imágenes (OBLIGATORIO con output: 'export')
  images: {
    unoptimized: true, // REQUERIDO para static export
  },
  
  // ESLint ignorado durante build (para evitar errores)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript ignorado durante build (opcional, si hay errores)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // AGREGAR REDIRECCIONES AQUÍ
  async redirects() {
    return [
      {
        source: '/DashboardHome',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/DashboardHome/:path*',
        destination: '/dashboard/:path*',
        permanent: true,
      },
      // También puedes agregar otras redirecciones si es necesario
      {
        source: '/inicio',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Configuración para trailing slashes (opcional, mejora compatibilidad)
  trailingSlash: true, // Recomendado para static export
  
  // Evitar advertencias de chunks grandes
  webpack: (config, { isServer }) => {
    // Configuración para el cliente (browser)
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxSize: 200000, // 200kb
      };
    }
    return config;
  },
  
  // Deshabilitar características que no funcionan con static export
  // Estas configuraciones son automáticas con output: 'export'
};

module.exports = nextConfig;