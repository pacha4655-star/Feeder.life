'use client';

import React, { useState } from 'react';
import { Award, CheckCircle2, Lock, Sparkles, ShieldCheck, Flame } from 'lucide-react';
import type { BadgeItem, MilestoneItem } from '@/lib/services/impact';

interface BadgesMilestonesSectionProps {
  badges: BadgeItem[];
  milestones: MilestoneItem[];
}

export default function BadgesMilestonesSection({
  badges,
  milestones,
}: BadgesMilestonesSectionProps) {
  const [activeTab, setActiveTab] = useState<'BADGES' | 'MILESTONES'>('BADGES');

  const earnedBadges = badges.filter((b) => b.isEarned);
  const lockedBadges = badges.filter((b) => !b.isEarned);

  const unlockedMilestones = milestones.filter((m) => m.isUnlocked);

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
      {/* Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('BADGES')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'BADGES' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
            color: activeTab === 'BADGES' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Award size={15} />
          <span>Welfare Badges ({earnedBadges.length}/{badges.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MILESTONES')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'MILESTONES' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
            color: activeTab === 'MILESTONES' ? '#ffffff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={15} />
          <span>Milestones Progress ({unlockedMilestones.length}/{milestones.length})</span>
        </button>
      </div>

      {activeTab === 'BADGES' ? (
        <div>
          {/* Earned Badges Grid */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>Earned & Verified Badges ({earnedBadges.length})</span>
            </h4>

            {earnedBadges.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Complete your first verified feeding round or rescue action to unlock your first badge!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: '1px solid #BBF7D0',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '24px' }}>{badge.icon}</div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#DCFCE7',
                          color: '#166534',
                        }}
                      >
                        ✓ {badge.verificationStatus}
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {badge.name}
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      {badge.description}
                    </p>

                    <div style={{ marginTop: 'auto', fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                      Criteria: {badge.criteria}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Locked Badges */}
          {lockedBadges.length > 0 && (
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={15} />
                <span>Locked Badges ({lockedBadges.length})</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {lockedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      opacity: 0.75,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '24px', filter: 'grayscale(100%)' }}>{badge.icon}</div>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        Locked
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {badge.name}
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      {badge.description}
                    </p>

                    <div style={{ marginTop: 'auto', fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                      Goal: {badge.criteria}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MILESTONES TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {milestones.map((m) => {
            const pct = Math.min(100, Math.round((m.currentCount / m.targetCount) * 100));

            return (
              <div
                key={m.id}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  border: m.isUnlocked ? '1px solid #BBF7D0' : '1px solid var(--border-subtle)',
                  background: m.isUnlocked ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{m.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {m.description}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: m.isUnlocked ? '#DCFCE7' : 'var(--bg-secondary)',
                      color: m.isUnlocked ? '#166534' : 'var(--text-muted)',
                    }}
                  >
                    {m.isUnlocked ? '✓ Achieved' : `${m.currentCount} / ${m.targetCount}`}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '9999px', overflow: 'hidden', marginTop: '8px' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: m.isUnlocked ? '#059669' : 'var(--brand-primary)',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
