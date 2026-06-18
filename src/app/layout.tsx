import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono, Roboto_Slab } from 'next/font/google'
import { headers } from 'next/headers'
import Script from 'next/script'
import { GoogleAnalytics } from '@next/third-parties/google'
import { AutoLogoutProvider } from '@/components/providers/AutoLogoutProvider'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import { SmoothScroll } from '@/components/effects/SmoothScroll'
import { CustomCursor } from '@/components/effects/CustomCursor'
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  getMetadataBase,
} from '@/constants/site'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono-var',
  display: 'swap',
})

// Serif acentuado pra editorial moments (citações, números grandes) —
// inspirado no mix Roc Grotesk + Roboto Slab do aerukart.com
const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto-slab',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    // Google Search Console (visível em qualquer HTML, é proof token público)
    google: '9mH1Vpd5vvubT77mOe-MiFM7m2OOULn6rJvNGx2Yd3E',
    other: {
      // Bing Webmaster Tools
      'msvalidate.01': 'A2BAD1758DCF0A854CDE46F0EFC85546',
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html
      lang="pt-BR"
      data-theme="dark"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${robotoSlab.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script id="simulamei-theme-init" strategy="beforeInteractive" nonce={nonce}>
          {`
            (function() {
              try {
                var t = localStorage.getItem('simulamei-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            })();
          `}
        </Script>
      </head>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        <SmoothScroll />
        <CustomCursor />
        <PostHogProvider>
          <AutoLogoutProvider>{children}</AutoLogoutProvider>
        </PostHogProvider>
        {/* Google Analytics 4 — carrega async, respeita CSP (next/third-parties trata nonce) */}
        <GoogleAnalytics gaId="G-RJ38K5YZ8W" />
      </body>
    </html>
  )
}
