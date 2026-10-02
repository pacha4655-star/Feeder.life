'use client';

import React, { useState } from 'react';
import {
  Share2,
  Check,
  Flame,
  Award,
  Utensils,
  Heart,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import type { UserImpactSummary } from '@/lib/services/impact';

interface ShareableImpactCardProps {
  impact: UserImpactSummary;
}

export default function ShareableImpactCard({ impact }: ShareableImpactCardProps) {
  const [copied, setCopied] = useState(false);

  const streakDays = impact.streak?.currentStreak || 0;
  const earnedBadgesCount = impact.badges.filter((b) => b.isEarned).length;

  const handleShare = async () => {
    const text = `🐾 My Feeder.life Impact:\n🍲 ${impact.totalAnimalsFed} Animals Fed\n🔥 ${streakDays}-Day Feeding Streak\n🏆 ${earnedBadgesCount} Badges Earned\n\nJoin me in caring for community animals at https://feeder.life`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${impact.userName}'s Welfare Impact on Feeder.life`,
          text,
          url: 'https://feeder.life',
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      style={{
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        color: '#ffffff',
        padding: '24px',
        boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.4)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      {/* Decorative Background Circles */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.06)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          left: -20,
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={18} fill="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85, fontWeight: 700 }}>
              Feeder.life Welfare Impact
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>
              {impact.userName}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '11px',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontWeight: 700,
            backdropFilter: 'blur(4px)',
          }}
        >
          {impact.feederLevel}
        </span>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.15)',
          padding: '14px',
          borderRadius: '14px',
          marginBottom: '18px',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#6ee7b7' }}>
            {impact.totalAnimalsFed}
          </div>
          <div style={{ fontSize: '10.5px', opacity: 0.85, fontWeight: 600 }}>Animals Fed</div>
        </div>

        <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.15)', borderRight: '1px solid rgba(255, 255, 255, 0.15)' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <Flame size={18} fill="#f59e0b" color="#f59e0b" />
            <span>{streakDays}</span>
          </div>
          <div style={{ fontSize: '10.5px', opacity: 0.85, fontWeight: 600 }}>Day Streak</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#93c5fd' }}>
            {impact.totalFeedingActivities}
          </div>
          <div style={{ fontSize: '10.5px', opacity: 0.85, fontWeight: 600 }}>Rounds Logged</div>
        </div>
      </div>

      {/* Earned Badges Mini Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.9 }}>
          <Award size={14} color="#fef08a" />
          <span>{earnedBadgesCount} Verified Badges &bull; {impact.milestones.filter(m => m.isUnlocked).length} Milestones</span>
        </div>
        <div style={{ fontSize: '11px', opacity: 0.75 }}>
          feeder.life
        </div>
      </div>

      {/* Share Action Button */}
      <button
        type="button"
        onClick={handleShare}
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: '12px',
          border: 'none',
          background: '#ffffff',
          color: '#065f46',
          fontWeight: 800,
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'transform 0.15s ease',
        }}
      >
        {copied ? (
          <>
            <Check size={16} />
            <span>Impact Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <Share2 size={16} />
            <span>Share My Animal Impact</span>
          </>
        )}
      </button>
    </div>
  );
}
