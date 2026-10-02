'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MapPin,
  Flag,
  Plus,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import type { PostWithAuthor } from '@/lib/services/feed-ranking';

interface ReelsClientProps {
  user: UserSession | null;
  initialReels: PostWithAuthor[];
  onOpenComposer?: () => void;
}

export default function ReelsClient({
  user,
  initialReels,
  onOpenComposer,
}: ReelsClientProps) {
  const [reels, setReels] = useState<PostWithAuthor[]>(initialReels);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [shareToast, setShareToast] = useState(false);

  const currentReel = reels[currentIndex];

  const handleReact = async (reelId: string, type = 'SUPPORT') => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      const res = await fetch(`/api/posts/${reelId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType: type }),
      });
      const data = await res.json();
      if (data.success) {
        setReels((prev) =>
          prev.map((r) =>
            r.id === reelId
              ? {
                  ...r,
                  reaction_count: data.reactionCount,
                  user_reaction: data.userReaction,
                }
              : r
          )
        );
      }
    } catch {}
  };

  const handleShare = (reelId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/reels#${reelId}`);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '80px', width: '100%' }}>
      {/* Header */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Film size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Animal Welfare Reels</h1>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Short rescue stories, feeding rounds & rehabilitation videos
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => (onOpenComposer ? onOpenComposer() : (window.location.href = '/?action=create'))}
          style={{ padding: '7px 14px', fontSize: '12.5px' }}
        >
          <Plus size={16} />
          <span>Upload Reel</span>
        </button>
      </div>

      {shareToast && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            padding: '8px 18px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 700,
            zIndex: 9999,
          }}
        >
          Link copied to clipboard!
        </div>
      )}

      {/* Reels List or Empty State */}
      {reels.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Film size={48} color="#8b5cf6" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>No Welfare Reels Published Yet</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
            Capture authentic video moments of street animal feedings, puppy rescues, and veterinary care rounds in your city.
          </p>
          <button
            className="btn-primary"
            onClick={() => (onOpenComposer ? onOpenComposer() : (window.location.href = '/?action=create'))}
          >
            Create First Reel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="card"
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#000',
                position: 'relative',
                height: 'min(620px, calc(100vh - 160px))',
                minHeight: '440px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {/* Video or Preview Poster */}
              {reel.media_urls && reel.media_urls[0]?.endsWith('.mp4') ? (
                <video
                  src={reel.media_urls[0]}
                  loop
                  autoPlay
                  muted={isMuted}
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <img
                  src={reel.media_urls?.[0] || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&auto=format&fit=crop&q=80'}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}

              {/* Dark Gradient Overlays */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 60%, rgba(0,0,0,0.85) 100%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Sound Toggle Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              {/* Right Vertical Action Bar (Facebook/TikTok Pattern) */}
              <div
                style={{
                  position: 'absolute',
                  right: '14px',
                  bottom: '30px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  zIndex: 20,
                }}
              >
                {/* Like / React */}
                <button
                  onClick={() => handleReact(reel.id, 'SUPPORT')}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: reel.user_reaction ? '#ef4444' : 'white',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Heart size={22} fill={reel.user_reaction ? '#ef4444' : 'none'} />
                  <span style={{ fontSize: '10.5px', fontWeight: 700, marginTop: '2px', color: 'white' }}>
                    {reel.reaction_count || 0}
                  </span>
                </button>

                {/* Comments */}
                <Link
                  href={`/#${reel.id}`}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <MessageCircle size={22} />
                  <span style={{ fontSize: '10.5px', fontWeight: 700, marginTop: '2px' }}>
                    {reel.comment_count || 0}
                  </span>
                </Link>

                {/* Share */}
                <button
                  onClick={() => handleShare(reel.id)}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <Share2 size={20} />
                </button>
              </div>

              {/* Bottom Author & Caption Info */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '16px',
                  right: '70px',
                  color: 'white',
                  zIndex: 20,
                }}
              >
                <Link
                  href={`/profile/${encodeURIComponent(reel.author_username || reel.author_id)}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', textDecoration: 'none', marginBottom: '8px' }}
                >
                  <img
                    src={reel.author_avatar}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid white', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                      {reel.author_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                      @{reel.author_username}
                    </div>
                  </div>
                </Link>

                <p style={{ fontSize: '13.5px', lineHeight: 1.4, margin: '0 0 6px 0', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                  {reel.body}
                </p>

                {reel.location_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                    <MapPin size={13} color="var(--brand-primary)" />
                    <span>{reel.location_name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
