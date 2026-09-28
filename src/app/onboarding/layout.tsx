import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome to Feeder.life — Onboarding',
  description: 'Complete your Feeder profile and set your neighborhood.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
