/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase Storage
        protocol: 'https',
        hostname: 'qvdjpmcprbinvrcczyhp.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // YouTube Thumbnails
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/vi/**',
      },
      {
        // Lorem Picsum
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        // Google User Content (Avatars)
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig


import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
