import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://feeder.life')
  ),
  title: 'Feeder.life | Social Platform for Animals, Feeders & Rescue Action',
  description:
    'The modern social animal-welfare network connecting street animal feeders, rescuers, volunteers, and communities. Log feedings, respond to emergency SOS, and protect community animals.',
  openGraph: {
    title: 'Feeder.life | Social Platform for Animals, Feeders & Rescue Action',
    description:
      'The modern social animal-welfare network connecting street animal feeders, rescuers, volunteers, and communities.',
    url: '/',
    siteName: 'Feeder.life',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Feeder.life | Social Animal Welfare Network',
    description: 'Empowering community feeders and rescue volunteers.',
  },
  icons: {
    icon: [
      { url: '/images/feeder-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/images/feeder-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import FirebaseAnalytics from '@/components/common/FirebaseAnalytics';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body className={`${outfit.className}`} suppressHydrationWarning>
        <FirebaseAnalytics />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
