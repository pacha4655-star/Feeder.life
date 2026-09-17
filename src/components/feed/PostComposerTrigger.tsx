'use client';

import React from 'react';
import { User } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

interface PostComposerTriggerProps {
  user: UserSession | null;
  onOpen?: (type?: string) => void;
}

export default function PostComposerTrigger({ user }: PostComposerTriggerProps) {
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : null;
  const avatarUrl = user?.avatarUrl;

  return (
    <div
      className="card"
      style={{
        background: 'var(--bg-card)',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        padding: '14px 16px',
        marginBottom: '16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Avatar + Pill Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={firstName || 'User'}
            className="avatar-img"
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <User size={20} />
          </div>
        )}
        <div
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            borderRadius: '9999px',
            padding: '11px 20px',
            color: 'var(--text-muted)',
            fontSize: '14px',
            cursor: 'default',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {firstName ? `What would you like to share, ${firstName}?` : 'What would you like to share? Sign in to post...'}
        </div>
      </div>
    </div>
  );
}
