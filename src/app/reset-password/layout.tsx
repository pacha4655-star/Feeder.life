import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Feeder.life',
  description: 'Reset your Feeder.life account password securely.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
