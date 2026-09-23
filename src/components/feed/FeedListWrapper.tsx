'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import FeedList from './FeedList';
import type { UserSession } from '@/lib/auth/session';

const PostComposerModal = dynamic(() => import('./PostComposerModal'), { ssr: false });
const StoryModal = dynamic(() => import('./StoryModal'), { ssr: false });

interface FeedListWrapperProps {
  user: UserSession | null;
}

export default function FeedListWrapper({ user }: FeedListWrapperProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [composerType, setComposerType] = useState('NORMAL');
  const [feedKey, setFeedKey] = useState(0);

  const handleOpenComposer = (type = 'NORMAL') => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setComposerType(type);
    setIsComposerOpen(true);
  };

  const handleOpenStory = () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setIsStoryOpen(true);
  };

  const handlePostCreated = () => {
    setFeedKey((k) => k + 1);
  };

  return (
    <>
      <FeedList
        key={feedKey}
        user={user}
        onOpenComposer={handleOpenComposer}
        onOpenStory={handleOpenStory}
      />

      {user && (
        <>
          <PostComposerModal
            user={user}
            isOpen={isComposerOpen}
            initialType={composerType}
            onClose={() => setIsComposerOpen(false)}
            onPostCreated={handlePostCreated}
          />
          <StoryModal
            user={user}
            isOpen={isStoryOpen}
            onClose={() => setIsStoryOpen(false)}
            onStoryCreated={handlePostCreated}
          />
        </>
      )}
    </>
  );
}
