'use client';

import React, { useState } from 'react';
import TopNavigation from './TopNavigation';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MobileNavigation from './MobileNavigation';
import PostComposerModal from '../feed/PostComposerModal';
import StoryModal from '../feed/StoryModal';
import SOSModal from '../sos/SOSModal';
import FeedingLogModal from '../feeding/FeedingLogModal';
import GlobalChatbot from '../chatbot/GlobalChatbot';
import type { UserSession } from '@/lib/auth/session';

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
