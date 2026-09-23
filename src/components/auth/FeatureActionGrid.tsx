'use client';

import React from 'react';
import {
  LifeBuoy,
  PawPrint,
  Utensils,
  Scale,
  Compass,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface FeatureItem {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  icon: LucideIcon;
  alt: string;
}

const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: 'find-help',
    label: 'Find Help',
    line1: 'Find Help',
    icon: LifeBuoy,
    alt: 'Find Help',
  },
  {
    id: 'adopt',
    label: 'Adopt',
    line1: 'Adopt',
    icon: PawPrint,
    alt: 'Adopt',
  },
  {
    id: 'support-feeding',
    label: 'Support Feeding',
    line1: 'Support',
    line2: 'Feeding',
    icon: Utensils,
    alt: 'Support Feeding',
  },
  {
    id: 'know-your-rights',
    label: 'Know Your Rights',
    line1: 'Know Your',
    line2: 'Rights',
    icon: Scale,
    alt: 'Know Your Rights',
  },
  {
    id: 'learn-explore',
    label: 'Learn & Explore',
    line1: 'Learn &',
    line2: 'Explore',
    icon: Compass,
    alt: 'Learn & Explore',
  },
  {
    id: 'join-community',
    label: 'Join a Community',
    line1: 'Join a',
    line2: 'Community',
    icon: Users,
    alt: 'Join a Community',
  },
];

interface FeatureActionGridProps {
  onItemClick?: (id: string) => void;
}

export default function FeatureActionGrid({ onItemClick }: FeatureActionGridProps) {
  return (
    <nav className="feeder-feature-grid" aria-label="Quick features">
      {FEATURE_ITEMS.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick?.(item.id)}
            className="feeder-feature-item-btn"
            aria-label={item.label}
          >
            <div className="feeder-feature-icon-wrapper" aria-hidden="true">
              <IconComponent className="feeder-feature-icon-svg" />
            </div>
            <span className="feeder-feature-item-label">
              <span>{item.line1}</span>
              {item.line2 && <span>{item.line2}</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
