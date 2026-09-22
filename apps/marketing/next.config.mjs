/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.85'],

  // Paquetes del monorepo (packages/*): son TS fuente, no JS compilado, así
  // que Next tiene que transpilarlos como si fueran parte de la app.
  transpilePackages: ['@home/services', '@home/db-types'],

  // Server Actions (incl. uploads de entregas a R2) traen un límite de body de
  // 1 MB por defecto → un archivo grande devuelve 403 / "unexpected response".
  // Lo subimos para cubrir el máximo de una entrega: 8 archivos × 5 MB = 40 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  // El campus se mudó a su propio Worker (apps/campus). Estos paths existían
  // acá antes de la separación — cualquier bookmark, mail viejo o link
  // indexado que todavía apunte a ellos tiene que seguir funcionando.
  // Fallback a la URL de prod: en build-time CI hace falta setear
  // NEXT_PUBLIC_CAMPUS_URL igual (ver README), esto es sólo por las dudas.
  async redirects() {
    const CAMPUS_URL = process.env.NEXT_PUBLIC_CAMPUS_URL || 'https://campus.siendohome.com';
    return [
      { source: '/dashboard', destination: `${CAMPUS_URL}/dashboard`, permanent: true },
      { source: '/cursos', destination: `${CAMPUS_URL}/cursos`, permanent: true },
      { source: '/cursos/:path*', destination: `${CAMPUS_URL}/cursos/:path*`, permanent: true },
      { source: '/comunidad', destination: `${CAMPUS_URL}/comunidad`, permanent: true },
      { source: '/calendario', destination: `${CAMPUS_URL}/calendario`, permanent: true },
      { source: '/perfil', destination: `${CAMPUS_URL}/perfil`, permanent: true },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qvdjpmcprbinvrcczyhp.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Cloudflare R2 — avatars de perfil
      {
        protocol: 'https',
        hostname: 'pub-a623949342a84338a70f5a9f083bcc04.r2.dev',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    const csp = [
      "default-src 'self'",

      // Scripts: propios + Cloudflare Insights (beacon analytics inyectado por CF)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
      "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com",

      // Conexiones: Supabase (REST + Realtime), Google Maps API, Cloudflare Insights reporting
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://cloudflareinsights.com https://*.cloudflareinsights.com",

      // Imágenes: Supabase Storage, Google Drive thumbnails, Google avatars, YouTube thumbs, Unsplash, Picsum, Google Maps, R2 avatars
      "img-src 'self' data: blob: https://*.supabase.co https://drive.google.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://img.youtube.com https://images.unsplash.com https://picsum.photos https://maps.gstatic.com https://s3-us-west-2.amazonaws.com https://pub-a623949342a84338a70f5a9f083bcc04.r2.dev",

      // Videos: YouTube embed + Cloudinary (videos de fondo en la landing)
      "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://res.cloudinary.com",

      // iframes: YouTube player + Google Maps
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://maps.google.com https://www.google.com",

      // Fuentes: propias + Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",

      // Estilos: propios + Google Fonts CSS + inline (Tailwind)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Workers: Cloudflare service workers
      "worker-src 'self' blob:",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
