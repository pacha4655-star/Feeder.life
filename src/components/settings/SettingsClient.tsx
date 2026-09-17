'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Settings,
  User,
  Bell,
  Shield,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Camera,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import type { UserSession } from '@/lib/auth/session';

interface SettingsClientProps {
  user: UserSession | null;
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'privacy'>('profile');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [areaName, setAreaName] = useState(user?.areaName || '');
  const [city, setCity] = useState(user?.city || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [sosAlerts, setSosAlerts] = useState(true);
  const [feedingReminders, setFeedingReminders] = useState(true);
  const [publicDirectory, setPublicDirectory] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: '580px', margin: '40px auto' }}>
        <Settings size={48} color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Sign in to manage settings</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Please log into your real Feeder.life account to customize your profile, privacy, and SOS alert radius.
        </p>
        <Link href="/login" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 24px' }}>
          Sign In
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          bio,
          areaName,
          city,
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.error || 'Failed to update settings');
      }
    } catch {
      setSaveError('Network error while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(2, 9);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
          }}
        >
          <Settings size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Settings & Privacy</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage your account credentials, welfare profile, and emergency alert radius
          </div>
        </div>
      </div>

      <div className="settings-layout-grid">
        {/* Settings Navigation Sidebar */}
        <div className="card settings-nav-sidebar">
          <button
            onClick={() => setActiveSection('profile')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeSection === 'profile' ? 'var(--bg-secondary)' : 'transparent',
              color: activeSection === 'profile' ? 'var(--primary)' : 'var(--text-primary)',
              fontWeight: activeSection === 'profile' ? 700 : 500,
              fontSize: '13.5px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <User size={16} />
            <span>Profile Details</span>
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeSection === 'notifications' ? 'var(--bg-secondary)' : 'transparent',
              color: activeSection === 'notifications' ? 'var(--primary)' : 'var(--text-primary)',
              fontWeight: activeSection === 'notifications' ? 700 : 500,
              fontSize: '13.5px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Bell size={16} />
            <span>Alerts & SOS</span>
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeSection === 'privacy' ? 'var(--bg-secondary)' : 'transparent',
              color: activeSection === 'privacy' ? 'var(--primary)' : 'var(--text-primary)',
              fontWeight: activeSection === 'privacy' ? 700 : 500,
              fontSize: '13.5px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Shield size={16} />
            <span>Privacy & Safety</span>
          </button>

          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />

          <button
            onClick={async () => {
              try {
                await signOut(auth);
              } catch (e) {
                console.warn('Firebase signout notice:', e);
              }
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '13.5px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Form Content */}
        <div className="card" style={{ padding: '24px' }}>
          {saveSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(5, 150, 105, 0.1)',
                color: '#059669',
                fontSize: '13.5px',
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {saveError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '13.5px',
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} />
              <span>{saveError}</span>
            </div>
          )}

          {activeSection === 'profile' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0' }}>Profile Appearance</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Your public guardian profile info seen across the social feed and emergency desk.
                </p>
              </div>

              {/* Avatar Preview & URL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <img
                  src={avatarUrl || user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={fullName}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--border)',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleRandomAvatar}
                    className="btn-secondary"
                    style={{ fontSize: '12.5px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Camera size={14} />
                    <span>Generate Avatar</span>
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Or provide a direct image URL below
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Avatar Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                  }}
                />
              </div>

              <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    Username (Unique Handle)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`@${user.username}`}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-muted)',
                      fontSize: '13.5px',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Guardian Bio & Welfare Statement
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Street animal feeder, community cat rescuer, volunteer..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={areaName}
                    onChange={(e) => setAreaName(e.target.value)}
                    placeholder="e.g. Indiranagar, Anna Nagar"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. City, District, or Province"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '13.5px',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  fontSize: '13.5px',
                }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </form>
          )}

          {activeSection === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0' }}>Alerts & Notification Preferences</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Configure real-time animal emergency broadcasts and daily welfare reminders.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Critical Animal SOS Alerts</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Receive instant notifications when an injured or emergency animal is reported within 5km of your area.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sosAlerts}
                    onChange={(e) => setSosAlerts(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Daily Feeding Streak Reminders</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Evening reminder to log your street animal feeding rounds and maintain your guardian streak.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={feedingReminders}
                    onChange={(e) => setFeedingReminders(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                </label>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0' }}>Privacy & Discovery</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                  Manage visibility of your location and feeding activity.
                </p>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Public Guardian Directory</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Allow verified local animal rescuers to find your profile in the Nearby & Guardian discovery pages.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={publicDirectory}
                  onChange={(e) => setPublicDirectory(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                  fontSize: '12.5px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                <strong>Location Privacy Note:</strong> Exact GPS coordinates of your home or feeding spots are NEVER shared publicly. Feeder.life applies coordinate obfuscation (±500m jitter) to protect vulnerable street animal feeding colonies.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
