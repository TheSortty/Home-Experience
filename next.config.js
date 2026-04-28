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
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Permite que Cloudflare Insights cargue su beacon sin bloqueo CORS/SRI
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://cloudflareinsights.com",
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://img.youtube.com https://picsum.photos https://maps.gstatic.com",
              "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
