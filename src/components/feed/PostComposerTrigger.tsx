'use client';

import React from 'react';
import GlobalContentSearch from '@/components/search/GlobalContentSearch';
import type { UserSession } from '@/lib/auth/session';

interface PostComposerTriggerProps {
  user?: UserSession | null;
  onOpen?: (type?: string) => void;
}

export default function PostComposerTrigger({}: PostComposerTriggerProps) {
  return (
    <GlobalContentSearch
      variant="home"
      placeholder="Search people, communities, posts, photos, videos..."
    />
  );
}
