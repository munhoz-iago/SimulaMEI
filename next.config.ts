import type { NextConfig } from 'next'

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
]

const nextConfig: NextConfig = {
  // P2: remove "X-Powered-By: Next.js" — fingerprint desnecessário para o cliente
  // e útil para atacantes mapearem versão do framework (atalho para CVE matching).
  poweredByHeader: false,
  // A TTF do relatório vive em src/ e é lida via readFileSync(process.cwd()+...).
  // O NFT não rastreia paths construídos em runtime, então sem isto o arquivo
  // some do bundle serverless (Vercel) e o PDF cai pra Helvetica silenciosamente.
  // Força a inclusão da fonte nas lambdas das duas rotas de relatório.
  outputFileTracingIncludes: {
    '/api/relatorio/gerar': ['./src/lib/reports/fonts/SpaceGrotesk.ttf'],
    '/api/relatorio-premium': ['./src/lib/reports/fonts/SpaceGrotesk.ttf'],
  },
  async headers() {
    return [
      {
        // Aplica em todas as rotas
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
