'use client';

import React, { useState, useEffect } from 'react';
import PostComposerTrigger from './PostComposerTrigger';
import PostCard from './PostCard';
import StoriesRail from './StoriesRail';
import type { PostWithAuthor } from '@/lib/services/feed-ranking';
import type { UserSession } from '@/lib/auth/session';
import { Sparkles, RefreshCw, AlertCircle, HeartHandshake, Loader2, CheckCircle2, SlidersHorizontal } from 'lucide-react';

interface FeedListProps {
  user: UserSession | null;
  onOpenComposer: (type?: string) => void;
  onOpenStory?: () => void;
}

export default function FeedList({ user, onOpenComposer, onOpenStory }: FeedListProps) {
  const [activeTab, setActiveTab] = useState<'FOR_YOU' | 'FOLLOWING' | 'NEARBY' | 'FEEDING' | 'SOS'>('FOR_YOU');
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const fetchFeed = async (tab = activeTab, reset = true) => {
    if (reset) {
      setIsLoading(true);
      setError('');
    } else {
      setIsLoadingMore(true);
    }

    try {
      const cursorParam = !reset && nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : '';
      const res = await fetch(`/api/feed?tab=${tab}&limit=10${cursorParam}`);
      const data = await res.json();

      if (data.success) {
        if (reset) {
          setPosts(data.posts || []);
        } else {
          setPosts((prev) => [...prev, ...(data.posts || [])]);
        }
        setNextCursor(data.nextCursor || null);
        setHasMore(!!data.hasMore);
      } else {
        setError(data.error || 'Failed to load feed');
      }
    } catch (err: any) {
      setError('Network error: Could not reach Feeder.life feed service');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed(activeTab, true);

    const handleRefresh = () => {
      fetchFeed(activeTab, true);
    };

    window.addEventListener('feeder:feed-refresh', handleRefresh);
    return () => window.removeEventListener('feeder:feed-refresh', handleRefresh);
  }, [activeTab]);

  return (
    <div>
      {/* 1. Top Post Composer Trigger (Matching Reference UI) */}
      <PostComposerTrigger user={user} onOpen={onOpenComposer} />

      {/* 2. Facebook-Style Stories Rail (24h Animal Welfare Highlights) */}
      <StoriesRail
        user={user}
        onOpenCreateStory={onOpenStory || (() => onOpenComposer('NORMAL'))}
      />

      {/* 3. Feed Tab Switcher & Filter matching reference */}
      <div
        className="feed-tabs-header-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          padding: '0 4px',
          minWidth: 0,
          gap: '8px',
        }}
      >
        <div
          className="feed-tabs-bar"
          style={{
            margin: 0,
            padding: '0 0 0 0',
            flex: 1,
            minWidth: 0,
          }}
        >
          {[
            { id: 'FOR_YOU', label: 'For You' },
            { id: 'FOLLOWING', label: 'Following' },
            { id: 'NEARBY', label: 'Nearby' },
            { id: 'COMMUNITIES', label: 'Communities' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={(e) => {
                  setActiveTab(tab.id as any);
                  (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className={`feed-tab-btn ${isActive ? 'active' : ''}`}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {tab.label}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'var(--brand-primary)',
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Filter button on right */}
        <button
          onClick={() => {}}
          aria-label="Filter feed"
          className="feed-filter-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '6px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <SlidersHorizontal size={15} />
          <span>Filter</span>
        </button>
      </div>

      {/* 4. Error State */}
      {error && (
        <div
          className="card"
          style={{
            padding: '20px',
            textAlign: 'center',
            marginBottom: '16px',
            border: '1px solid #fecdd3',
            background: '#fff1f2',
          }}
        >
          <AlertCircle size={32} color="#e11d48" style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontWeight: 700, color: '#9f1239' }}>{error}</div>
          <button
            onClick={() => fetchFeed(activeTab, true)}
            className="btn-secondary"
            style={{ marginTop: '10px', fontSize: '13px' }}
          >
            <RefreshCw size={14} /> Retry Feed
          </button>
        </div>
      )}

      {/* 5. Loading State Skeletons */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2].map((i) => (
            <div key={i} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '40%', height: '14px', background: 'var(--bg-secondary)', borderRadius: '4px', marginBottom: '6px' }} />
                  <div style={{ width: '25%', height: '10px', background: 'var(--bg-secondary)', borderRadius: '4px' }} />
                </div>
              </div>
              <div style={{ width: '100%', height: '60px', background: 'var(--bg-secondary)', borderRadius: '6px', marginBottom: '12px' }} />
              <div style={{ width: '100%', height: '180px', background: 'var(--bg-secondary)', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      )}

      {/* 6. Empty Feed State */}
      {!isLoading && !error && posts.length === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <HeartHandshake size={44} color="var(--brand-primary)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
            No posts yet.
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            Be the first to share something with the Feeder community.
          </p>
          {user ? (
            <button className="btn-primary" onClick={() => onOpenComposer('NORMAL')}>
              Share First Update
            </button>
          ) : (
            <a href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
              Sign In to Participate
            </a>
          )}
        </div>
      )}

      {/* 7. Real Post Cards Feed */}
      {!isLoading && !error && posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              onPostUpdated={() => fetchFeed(activeTab, true)}
            />
          ))}

          {/* Cursor Pagination Trigger */}
          {hasMore && (
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <button
                className="btn-secondary"
                onClick={() => fetchFeed(activeTab, false)}
                disabled={isLoadingMore}
                style={{ padding: '10px 24px', fontSize: '13.5px', fontWeight: 600 }}
              >
                {isLoadingMore ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={16} />
                    Loading updates...
                  </span>
                ) : (
                  'Load More Updates'
                )}
              </button>
            </div>
          )}

          {/* Caught Up Banner */}
          {!hasMore && posts.length > 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: 'var(--text-muted)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} color="var(--brand-primary)" />
              <span>You&apos;re all caught up on recent welfare updates in your circle.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
