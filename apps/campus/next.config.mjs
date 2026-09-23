/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.0.85'],

  // Paquetes del monorepo (packages/*): son TS fuente, no JS compilado, así
  // que Next tiene que transpilarlos como si fueran parte de la app.
  transpilePackages: ['@home/services', '@home/db-types'],

  // Server Actions (entregas del alumno a R2) traen un límite de body de
  // 1 MB por defecto → un archivo grande devuelve 403 / "unexpected response".
  // Lo subimos para cubrir el máximo de una entrega: 8 archivos × 5 MB = 40 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
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
      // Cloudflare R2 — avatars de perfil y portadas de curso
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

      // Conexiones: Supabase (REST + Realtime) + Cloudflare Insights reporting.
      // Campus no usa Google Maps — eso es sólo de la landing.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com https://*.cloudflareinsights.com",

      // Imágenes: Supabase Storage, Google avatars, YouTube thumbs, Unsplash, Picsum, R2
      "img-src 'self' data: blob: https://*.supabase.co https://drive.google.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://img.youtube.com https://images.unsplash.com https://picsum.photos https://pub-a623949342a84338a70f5a9f083bcc04.r2.dev",

      // Video: sólo YouTube embed de las clases (no hay fondo de Cloudinary acá).
      "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",

      // iframes: reproductor de YouTube en las clases.
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",

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
