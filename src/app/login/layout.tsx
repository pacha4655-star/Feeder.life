import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In | Feeder.life',
  description: 'Log in to your Feeder.life account to connect with animal feeders, report rescues, and care for community animals.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
