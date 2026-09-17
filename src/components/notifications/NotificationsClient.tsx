'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  AlertTriangle,
  Users,
  Award,
  Sparkles,
} from 'lucide-react';
import { formatShortDate } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';
import FeederAvatar from '@/components/common/FeederAvatar';

export interface NotificationItem {
  id: string;
  recipient_id: string;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  type: string;
  title: string;
  body: string;
  target_url?: string;
  is_read: number;
  created_at: string;
}

interface NotificationsClientProps {
  user: UserSession | null;
  initialNotifications: NotificationItem[];
}

export default function NotificationsClient({
  user,
  initialNotifications,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!user) {
    return (
      <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '580px', margin: '40px auto' }}>
        <Bell size={48} color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Stay Updated on Animal Welfare</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Sign in to receive real-time notifications about local rescues, community comments, and feeding reminders.
        </p>
        <Link href="/login" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 24px' }}>
          Sign In
        </Link>
      </div>
    );
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return n.is_read === 0;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'REACTION':
        return <Heart size={16} color="#ef4444" />;
      case 'COMMENT':
        return <MessageCircle size={16} color="#059669" />;
      case 'SOS_ALERT':
        return <AlertTriangle size={16} color="#dc2626" />;
      case 'COMMUNITY':
        return <Users size={16} color="#3b82f6" />;
      default:
        return <Sparkles size={16} color="#8b5cf6" />;
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <Bell size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Notifications</h1>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Rescue alerts, mentions, and community activity
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', gap: '4px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: filter === 'all' ? 'var(--bg-card)' : 'transparent',
                color: filter === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: filter === 'all' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: filter === 'unread' ? 'var(--bg-card)' : 'transparent',
                color: filter === 'unread' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: filter === 'unread' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
              }}
            >
              Unread
            </button>
          </div>

          {notifications.some((n) => n.is_read === 0) && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary"
              style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <CheckCheck size={14} />
              <span>Mark read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List or Empty State */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Bell size={44} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet.'}
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {filter === 'unread'
              ? 'You have caught up with all welfare announcements, reactions, and rescue logs.'
              : 'As animal guardians interact with your posts, feedings, or report SOS cases in your area, alerts will appear here.'}
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((item, idx) => {
            const isLast = idx === filtered.length - 1;
            return (
              <Link
                key={item.id}
                href={item.target_url || '/notifications'}
                onClick={async () => {
                  if (item.is_read === 0) {
                    try {
                      await fetch(`/api/notifications/${item.id}`, { method: 'PATCH' });
                      setNotifications((prev) =>
                        prev.map((n) => (n.id === item.id ? { ...n, is_read: 1 } : n))
                      );
                    } catch {}
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '16px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
                  background: item.is_read === 0 ? 'rgba(5, 150, 105, 0.05)' : 'transparent',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <FeederAvatar
                    src={item.sender_avatar}
                    alt={item.sender_name || item.title}
                    size={42}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--bg-card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getIcon(item.type)}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: item.is_read === 0 ? 800 : 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatShortDate(item.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                    {item.body}
                  </div>
                </div>

                {item.is_read === 0 && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--brand-primary)',
                      alignSelf: 'center',
                      flexShrink: 0,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
