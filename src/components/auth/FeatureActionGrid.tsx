'use client';

import React from 'react';
import Image from 'next/image';

interface FeatureItem {
  id: string;
  label: string;
  iconSrc: string;
  alt: string;
}

const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: 'find-help',
    label: 'Find Help',
    iconSrc: '/assets/feeder-login/find-help.png',
    alt: 'Find Help',
  },
  {
    id: 'adopt',
    label: 'Adopt',
    iconSrc: '/assets/feeder-login/adopt.png',
    alt: 'Adopt',
  },
  {
    id: 'support-feeding',
    label: 'Support Feeding',
    iconSrc: '/assets/feeder-login/support-feeding.png',
    alt: 'Support Feeding',
  },
  {
    id: 'know-your-rights',
    label: 'Know Your Rights',
    iconSrc: '/assets/feeder-login/know-your-rights.png',
    alt: 'Know Your Rights',
  },
  {
    id: 'learn-explore',
    label: 'Learn & Explore',
    iconSrc: '/assets/feeder-login/learn-explore.png',
    alt: 'Learn & Explore',
  },
  {
    id: 'join-community',
    label: 'Join a Community',
    iconSrc: '/assets/feeder-login/join-community.png',
    alt: 'Join a Community',
  },
];

interface FeatureActionGridProps {
  onItemClick?: (id: string) => void;
}

export default function FeatureActionGrid({ onItemClick }: FeatureActionGridProps) {
  return (
    <nav className="feeder-feature-grid" aria-label="Quick features">
      {FEATURE_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick?.(item.id)}
          className="feeder-feature-item-btn"
          aria-label={item.label}
        >
          <div className="feeder-feature-icon-wrapper">
            <Image
              src={item.iconSrc}
              alt=""
              width={48}
              height={48}
              className="feeder-feature-icon-img"
              priority
            />
          </div>
          <span className="feeder-feature-item-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
