'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users2,
  MapPin,
  AlertTriangle,
  Utensils,
  Bookmark,
  Users,
  Bell,
  Settings,
  HelpCircle,
  Heart,
  Sparkles,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import FeederAvatar from '@/components/common/FeederAvatar';

interface LeftSidebarProps {
  user: UserSession | null;
  onOpenComposer?: () => void;
  onOpenSos?: () => void;
  onOpenFeeding?: () => void;
}

export default function LeftSidebar({
  user,
  onOpenComposer,
  onOpenSos,
  onOpenFeeding,
}: LeftSidebarProps) {
  const pathname = usePathname();

  const primaryNavItems = [
    { label: 'Feed', href: '/', icon: Home, color: 'var(--brand-primary)' },
    { label: 'Communities', href: '/communities', icon: Users2, color: 'var(--brand-primary)' },
    { label: 'Nearby Map', href: '/nearby', icon: MapPin, color: 'var(--brand-primary)' },
    { label: 'SOS Emergencies', href: '/sos', icon: AlertTriangle, color: 'var(--brand-sos)' },
    { label: 'Feeding', href: '/feeding', icon: Utensils, color: 'var(--brand-primary)' },
  ];

  const secondaryNavItems = [
    { label: 'Saved', href: '/saved', icon: Bookmark, color: '#4B5563' },
    { label: 'Notifications', href: '/notifications', icon: Bell, color: '#4B5563' },
    { label: 'Settings', href: '/settings', icon: Settings, color: '#4B5563' },
    { label: 'Help & Support', href: '/ask-feeder', icon: HelpCircle, color: '#4B5563' },
  ];

  return (
    <aside className="app-left-sidebar" style={{ width: 'var(--left-sidebar-width)' }}>
      {/* 1. User Profile Mini Card or Guest Welcome Card */}
      {user ? (
        <div
          className="card"
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <Link
            href={`/profile/${user.username}`}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', minWidth: 0, textDecoration: 'none' }}
          >
            <FeederAvatar
              src={user.avatarUrl}
              alt={user.fullName}
              size={42}
              className="avatar-img"
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '14.5px',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.fullName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                {user.feederLevel || 'Animal Guardian'}
              </div>
            </div>
          </Link>
        </div>
      ) : (
        <div
          className="card"
          style={{
            padding: '14px',
            marginBottom: '14px',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Welcome to Feeder
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
            Join local animal guardians to share feeding logs and emergency SOS rescues.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link
              href="/login"
              className="btn-secondary"
              style={{ flex: 1, padding: '6px', fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="btn-primary"
              style={{ flex: 1, padding: '6px', fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}

      {/* 2. Primary Navigation List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {primaryNavItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '14.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--brand-primary)' : 'var(--text-primary)',
                background: isActive ? 'var(--brand-primary-light)' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
            >
              {Icon && (
                <Icon
                  size={20}
                  color={isActive ? 'var(--brand-primary)' : item.color}
                  fill={isActive && item.href === '/' ? 'currentColor' : 'none'}
                />
              )}
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '12px 6px' }} />

      {/* 3. Secondary Navigation List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {secondaryNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '14.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--brand-primary)' : 'var(--text-primary)',
                background: isActive ? 'var(--brand-primary-light)' : 'transparent',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
            >
              <Icon size={20} color={isActive ? 'var(--brand-primary)' : item.color} />
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 4. Bottom Promo Card: Together for a kinder tomorrow */}
      <div
        style={{
          marginTop: '16px',
          background: '#EBF7EE',
          borderRadius: '16px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #D8EEDC',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, paddingRight: '8px', zIndex: 1 }}>
          <div
            style={{
              fontSize: '13.5px',
              fontWeight: 800,
              color: '#1B5E20',
              lineHeight: 1.3,
              marginBottom: '6px',
            }}
          >
            Together for a kinder tomorrow
          </div>
          <Heart size={16} color="#2E7D32" strokeWidth={2} />
        </div>

        <div style={{ width: '82px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
          <img
            src="https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop&q=80"
            alt="Dog and Cat together"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>
    </aside>
  );
}
