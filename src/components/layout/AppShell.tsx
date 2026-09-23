'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import TopNavigation from './TopNavigation';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MobileNavigation from './MobileNavigation';
import type { UserSession } from '@/lib/auth/session';

const PostComposerModal = dynamic(() => import('../feed/PostComposerModal'), { ssr: false });
const StoryModal = dynamic(() => import('../feed/StoryModal'), { ssr: false });
const SOSModal = dynamic(() => import('../sos/SOSModal'), { ssr: false });
const FeedingLogModal = dynamic(() => import('../feeding/FeedingLogModal'), { ssr: false });
const GlobalChatbot = dynamic(() => import('../chatbot/GlobalChatbot'), { ssr: false });

interface AppShellProps {
  user: UserSession | null;
  children: React.ReactNode;
  showRightSidebar?: boolean;
  activeTab?: string;
  onRefreshFeed?: () => void;
}

export default function AppShell({
  user,
  children,
  showRightSidebar = true,
  activeTab,
  onRefreshFeed,
}: AppShellProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState('NORMAL');
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isFeedingOpen, setIsFeedingOpen] = useState(false);

  const handleOpenComposer = (type = 'NORMAL') => {
    setComposerType(type);
    setIsComposerOpen(true);
  };

  const handleActionSuccess = () => {
    if (onRefreshFeed) onRefreshFeed();
  };

  return (
    <div className="app-layout">
      {/* 1. Sticky Top Navigation */}
      <TopNavigation
        user={user}
        activeTab={activeTab}
        onOpenComposer={handleOpenComposer}
        onOpenStory={() => setIsStoryOpen(true)}
        onOpenSos={() => setIsSosOpen(true)}
        onOpenFeeding={() => setIsFeedingOpen(true)}
      />

      {/* 2. Main 3-Column Layout Container */}
      <div className="app-container">
        {/* Left Persistent Navigation */}
        <LeftSidebar
          user={user}
          onOpenComposer={() => handleOpenComposer('NORMAL')}
          onOpenSos={() => setIsSosOpen(true)}
          onOpenFeeding={() => setIsFeedingOpen(true)}
        />

        {/* Center Content Column */}
        <main className={`app-center-feed ${!showRightSidebar ? 'app-center-feed-wide' : ''}`}>{children}</main>

        {/* Right Contextual Sidebar */}
        {showRightSidebar && <RightSidebar />}
      </div>

      {/* 3. Mobile Responsive Bottom Navigation */}
      <MobileNavigation />

      {/* 4. Global Floating Feeder Chatbot */}
      <GlobalChatbot user={user} />

      {/* Global Modals */}
      <PostComposerModal
        user={user}
        isOpen={isComposerOpen}
        initialType={composerType}
        onClose={() => setIsComposerOpen(false)}
        onPostCreated={handleActionSuccess}
      />

      <SOSModal
        user={user}
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onSosCreated={handleActionSuccess}
      />

      <FeedingLogModal
        user={user}
        isOpen={isFeedingOpen}
        onClose={() => setIsFeedingOpen(false)}
        onFeedLogged={handleActionSuccess}
      />

      <StoryModal
        user={user}
        isOpen={isStoryOpen}
        onClose={() => setIsStoryOpen(false)}
        onStoryCreated={handleActionSuccess}
      />
    </div>
  );
}
