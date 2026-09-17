'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import type { StoryView } from '@/lib/services/story';
import StoryViewerModal from './StoryViewerModal';

interface StoriesRailProps {
  user: UserSession | null;
  onOpenCreateStory: () => void;
}

export default function StoriesRail({ user, onOpenCreateStory }: StoriesRailProps) {
  const [stories, setStories] = useState<StoryView[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      if (data.success && Array.isArray(data.stories)) {
        setStories(data.stories);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStories();

    const handleRefresh = () => {
      fetchStories();
    };

    window.addEventListener('feeder:stories-refresh', handleRefresh);
    return () => window.removeEventListener('feeder:stories-refresh', handleRefresh);
  }, []);

  const handleScrollRight = () => {
    if (railRef.current) {
      railRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ position: 'relative', marginBottom: '16px', minWidth: 0, width: '100%' }}>
      <div
        ref={railRef}
        className="stories-rail-scroll"
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && railRef.current) {
            railRef.current.scrollLeft += e.deltaY;
          }
        }}
      >
        {/* 1. Create Story Card */}
        <div
          onClick={onOpenCreateStory}
          role="button"
          tabIndex={0}
          aria-label="Create welfare story"
          className="story-card-item"
          style={{
            background: user?.avatarUrl
              ? `url(${user.avatarUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.8) 100%)',
            }}
          />
          {/* Center Floating Green Button */}
          <div
            style={{
              position: 'absolute',
              bottom: '36px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--brand-primary, #059669)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #ffffff',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            }}
          >
            <Plus size={20} strokeWidth={2.5} />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'white',
              fontSize: '11.5px',
              fontWeight: 700,
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            Create story
          </div>
        </div>

        {/* 2. Active Stories Cards */}
        {stories.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
            }}
          >
            No stories yet.
          </div>
        )}
        {stories.map((story: StoryView, index: number) => (
          <div
            key={story.id}
            onClick={() => setActiveStoryIndex(index)}
            className="story-card-item"
          >
            {story.media_type === 'VIDEO' ? (
              <video
                src={story.media_url}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
                playsInline
              />
            ) : (
              <img
                src={story.media_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {/* Dark gradient for text readability */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)',
              }}
            />
            {/* Author Avatar with Ring */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: story.has_viewed ? '2px solid rgba(255,255,255,0.6)' : '2.5px solid #10b981',
                padding: '1.5px',
                background: 'white',
              }}
            >
              <img
                src={story.author_avatar || '/avatars/default.png'}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
            {/* Story Title / Author Name */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '6px',
                right: '6px',
                textAlign: 'center',
                color: 'white',
                fontSize: '11.5px',
                fontWeight: 700,
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {story.author_name}
            </div>
          </div>
        ))}
        {/* Trailing spacer to guarantee last card is scrollable with full rounded corners and margin */}
        <div style={{ width: '12px', minWidth: '12px', flexShrink: 0 }} aria-hidden="true" />
      </div>

      {/* Floating Right Scroll Arrow Button */}
      {stories.length > 3 && (
        <button
          onClick={handleScrollRight}
          aria-label="Scroll stories"
          className="story-floating-next-btn"
          style={{
            position: 'absolute',
            right: '-8px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 5,
            color: 'var(--text-primary)',
          }}
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      )}

      {/* Story Viewer Modal */}
      {activeStoryIndex !== null && stories.length > 0 && (
        <StoryViewerModal
          stories={stories}
          initialIndex={activeStoryIndex}
          isOpen={activeStoryIndex !== null}
          currentUser={user}
          onStoryDeleted={(deletedId) => {
            setStories((prev) => prev.filter((s) => s.id !== deletedId));
          }}
          onClose={() => {
            setActiveStoryIndex(null);
            fetchStories();
          }}
        />
      )}
    </div>
  );
}
