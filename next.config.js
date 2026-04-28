/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },

  async headers() {
    const csp = [
      "default-src 'self'",

      // Scripts: propios + Cloudflare Insights (beacon analytics inyectado por CF)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
      "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com",

      // Conexiones: Supabase (REST + Realtime), Google Maps API, Cloudflare Insights reporting
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://cloudflareinsights.com https://static.cloudflareinsights.com",

      // Imágenes: Supabase Storage, Google avatars, YouTube thumbs, Unsplash (cover de cursos), Picsum, Google Maps
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://img.youtube.com https://images.unsplash.com https://picsum.photos https://maps.gstatic.com https://s3-us-west-2.amazonaws.com",

      // Videos: YouTube embed + Cloudinary (videos de fondo en la landing)
      "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://res.cloudinary.com",

      // iframes: YouTube player
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",

      // Fuentes: propias + Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",

      // Estilos: propios + Google Fonts CSS + inline (Tailwind)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
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
