import type { NextConfig } from 'next'

const securityHeaders = [
  // Impede o painel de ser embedado em iframe de outro site (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Evita o browser tentar adivinhar o MIME (ataques de upload)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Restringe quais APIs do navegador outras origens podem usar via iframe
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Limita o que o Referer leva pra outros domínios
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Reforço: não indexar (além do robots.txt e meta)
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ]
  },
}

export default nextConfig
