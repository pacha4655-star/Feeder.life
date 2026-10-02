'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AlertTriangle, Users2, MapPin, Utensils } from 'lucide-react';

export default function MobileNavigation() {
  const pathname = usePathname();

  const items = [
    { label: 'Home', href: '/', icon: Home, ariaLabel: 'Home Feed' },
    { label: 'Communities', href: '/communities', icon: Users2, ariaLabel: 'Communities' },
    { label: 'SOS', href: '/sos', icon: AlertTriangle, isSos: true, ariaLabel: 'Animal SOS Emergency' },
    { label: 'Nearby', href: '/nearby', icon: MapPin, ariaLabel: 'Nearby Animals and Feeders' },
    { label: 'Feeding', href: '/feeding', icon: Utensils, ariaLabel: 'Feeding Logs and Rosters' },
  ];

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Bottom Navigation">
      {items.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;

        if (item.isSos) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="mobile-nav-sos-item"
              title="Animal SOS Emergency"
              aria-label={item.ariaLabel}
            >
              <div className="mobile-nav-sos-icon-wrap">
                <Icon size={22} strokeWidth={2.25} />
              </div>
              <span className="mobile-nav-sos-label">SOS</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            title={item.label}
            aria-label={item.ariaLabel}
          >
            <div className="mobile-nav-icon-wrap">
              <Icon
                size={22}
                strokeWidth={isActive ? 2.25 : 1.85}
                color="currentColor"
              />
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

