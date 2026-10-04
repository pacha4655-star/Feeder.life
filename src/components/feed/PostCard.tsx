'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { formatShortDate, formatTime } from '@/lib/utils/date';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Globe,
  Send,
  Flag,
  ShieldOff,
  PawPrint,
  Edit3,
  Trash2,
  Ban,
  Loader2,
  AlertCircle,
  Sparkles,
  EyeOff,
  Sliders,
  Info,
} from 'lucide-react';
import type { PostWithAuthor } from '@/lib/services/feed-ranking';
import type { UserSession } from '@/lib/auth/session';
import FeederAvatar from '@/components/common/FeederAvatar';
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeChannel';

function PostMediaItem({
  url,
  alt = 'Animal welfare post media',
  style = {},
  postId,
  authorId,
}: {
  url: string;
  alt?: string;
  style?: React.CSSProperties;
  postId?: string;
  authorId?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStartedRef = useRef(false);
  const milestonesRef = useRef({ p25: false, p50: false, p75: false, p100: false });

  // Auto-pause video when it scrolls out of the viewport
  useEffect(() => {
    if (!isVideo || typeof window === 'undefined' || !videoRef.current) return;

    const el = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !el.paused) {
          el.pause();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo]);

  if (hasError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '160px',
          background: 'var(--bg-secondary, #f3f4f6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted, #6b7280)',
          fontSize: '13px',
          gap: '6px',
          padding: '16px',
          ...style,
        }}
      >
        <span style={{ fontSize: '22px' }}>📷</span>
        <span style={{ fontWeight: 600 }}>Media unavailable</span>
      </div>
    );
  }

  if (isVideo) {
    const handlePlay = () => {
      if (!videoStartedRef.current && postId) {
        videoStartedRef.current = true;
        fetch('/api/feed/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'video_start', postId, authorId }),
        }).catch(() => {});
      }
    };

    const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (!postId) return;
      const v = e.currentTarget;
      if (!v.duration || isNaN(v.duration) || v.duration <= 0) return;
      const ratio = v.currentTime / v.duration;

      if (ratio >= 0.25 && !milestonesRef.current.p25) {
        milestonesRef.current.p25 = true;
        fetch('/api/feed/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'video_25', postId, authorId, completionRatio: 0.25, durationMs: Math.round(v.currentTime * 1000) }),
        }).catch(() => {});
      } else if (ratio >= 0.5 && !milestonesRef.current.p50) {
        milestonesRef.current.p50 = true;
        fetch('/api/feed/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'video_50', postId, authorId, completionRatio: 0.5, durationMs: Math.round(v.currentTime * 1000) }),
        }).catch(() => {});
      } else if (ratio >= 0.75 && !milestonesRef.current.p75) {
        milestonesRef.current.p75 = true;
        fetch('/api/feed/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'video_75', postId, authorId, completionRatio: 0.75, durationMs: Math.round(v.currentTime * 1000) }),
        }).catch(() => {});
      }
    };

    const handleEnded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (postId && !milestonesRef.current.p100) {
        milestonesRef.current.p100 = true;
        const v = e.currentTarget;
        fetch('/api/feed/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'video_complete', postId, authorId, completionRatio: 1.0, durationMs: Math.round((v.duration || 5) * 1000) }),
        }).catch(() => {});
      }
    };

    return (
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          background: '#000',
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        contentVisibility: 'auto',
        ...style,
      }}
    />
  );
}

interface PostCardProps {
  post: PostWithAuthor;
  currentUser: UserSession | null;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
}

export default function PostCard({ post, currentUser, onPostUpdated, onPostDeleted }: PostCardProps) {
  const [reactionCount, setReactionCount] = useState(post.reaction_count || 0);
  const [userReaction, setUserReaction] = useState<string | null>(post.user_reaction || null);
  const [isSaved, setIsSaved] = useState(post.is_saved || false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [shareToast, setShareToast] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [postTitle, setPostTitle] = useState(post.title || '');
  const [postBody, setPostBody] = useState(post.body);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Like animation & debounce locks
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isLikeMutatingRef = useRef(false);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Comment delete confirmation state
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(null);

  // Recommendation & User Control States
  const [isNotInterested, setIsNotInterested] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showDebugScore, setShowDebugScore] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const dwellRecordedRef = useRef(false);

  // Telemetry: Record meaningful dwell time (>2s) via IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined' || !cardRef.current || dwellRecordedRef.current) return;

    let dwellTimer: NodeJS.Timeout | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!dwellTimer && !dwellRecordedRef.current) {
            dwellTimer = setTimeout(() => {
              dwellRecordedRef.current = true;
              fetch('/api/feed/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventType: 'view',
                  postId: post.id,
                  authorId: post.author_id,
                  durationMs: 2500,
                  topics: post.tags,
                }),
              }).catch(() => {});
            }, 2000);
          }
        } else {
          if (dwellTimer) {
            clearTimeout(dwellTimer);
            dwellTimer = null;
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => {
      if (dwellTimer) clearTimeout(dwellTimer);
      observer.disconnect();
    };
  }, [post.id, post.author_id, post.tags]);

  const isLiked = !!userReaction;
  const isAuthorOrStaff = !!(
    currentUser &&
    (currentUser.id === post.author_id ||
      currentUser.role === 'PLATFORM_ADMIN' ||
      currentUser.role === 'PLATFORM_MODERATOR')
  );
  const isAuthor = currentUser?.id === post.author_id;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Supabase Realtime: Sync likes & comment counts when comments are open or actively being interacted with
  useRealtimeSubscription({
    table: 'social_posts',
    filter: `id=eq.${post.id}`,
    onPayload: (payload) => {
      if (payload.new && typeof payload.new === 'object') {
        const row = payload.new;
        if (typeof row.likes_count === 'number' && !isLikeMutatingRef.current) {
          setReactionCount(row.likes_count);
        }
        if (typeof row.comments_count === 'number') {
          setCommentCount(row.comments_count);
        }
      }
    },
    enabled: showComments && typeof window !== 'undefined',
  });

  // Supabase Realtime: Sync new comments live if comments are currently visible
  useRealtimeSubscription({
    table: 'social_posts',
    filter: `parent_id=eq.${post.id}`,
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newRow = payload.new;
        if (newRow.record_type === 'comment' && !newRow.is_deleted) {
          setComments((prev) => {
            if (prev.some((c) => c.id === newRow.id)) return prev;
            const newComment = {
              id: newRow.id,
              post_id: newRow.parent_id,
              author_id: newRow.user_id,
              body: newRow.content,
              created_at: newRow.created_at,
              author_name: 'Animal Guardian',
              author_username: 'guardian',
              author_avatar: '',
              author_role: 'USER',
            };
            return [...prev, newComment];
          });
        }
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedRow = payload.new;
        if (updatedRow.is_deleted) {
          setComments((prev) => prev.filter((c) => c.id !== updatedRow.id));
        }
      }
    },
    enabled: showComments && typeof window !== 'undefined',
  });

  const handleToggleLike = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (isLikeMutatingRef.current) return;
    isLikeMutatingRef.current = true;

    const wasLiked = isLiked;
    const prevReaction = userReaction;
    const prevCount = reactionCount;
    const nextLiked = !wasLiked;
    const nextCount = wasLiked ? Math.max(0, reactionCount - 1) : reactionCount + 1;
    const nextReaction = wasLiked ? null : 'CARE';

    // 1. Optimistic UI update
    setUserReaction(nextReaction);
    setReactionCount(nextCount);

    if (nextLiked) {
      // Trigger short Facebook-style floating reaction particles
      setShowLikeAnimation(true);
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      animationTimerRef.current = setTimeout(() => {
        setShowLikeAnimation(false);
      }, 650);
    } else {
      setShowLikeAnimation(false);
    }

    // 2. Persist to database via API
    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reactionType: 'CARE',
          action: nextLiked ? 'like' : 'unlike',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReactionCount(data.reactionCount);
        setUserReaction(data.userReaction);
      } else {
        // Rollback on backend error
        setUserReaction(prevReaction);
        setReactionCount(prevCount);
        setShowLikeAnimation(false);
        showToast(data.error || "Couldn't update your like. Please try again.");
      }
    } catch (err) {
      // Rollback on network error
      setUserReaction(prevReaction);
      setReactionCount(prevCount);
      setShowLikeAnimation(false);
      showToast("Couldn't update your like. Please try again.");
    } finally {
      isLikeMutatingRef.current = false;
    }
  };

  const handleToggleSave = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setShowMenu(false);
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsSaved(data.isSaved);
      } else {
        setIsSaved(prevSaved);
        showToast("Couldn't update saved post. Please try again.");
      }
    } catch {
      setIsSaved(prevSaved);
      showToast("Couldn't update saved post. Please try again.");
    }
  };

  const handleToggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);
    if (nextState && comments.length === 0) {
      setIsLoadingComments(true);
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`);
        const data = await res.json();
        if (data.success) {
          setComments(data.comments || []);
        }
      } catch {
        showToast("Couldn't load comments. Please try again.");
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = newCommentText.trim();
    if (!cleanText || isSubmittingComment) return;

    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    setIsSubmittingComment(true);
    const textToSubmit = cleanText;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Optimistic comment insert
    const optimisticComment = {
      id: tempId,
      post_id: post.id,
      author_id: currentUser.id,
      parent_id: null,
      body: textToSubmit,
      created_at: new Date().toISOString(),
      author_name: currentUser.fullName || currentUser.username || 'Animal Guardian',
      author_username: currentUser.username || 'guardian',
      author_avatar: currentUser.avatarUrl || '',
      author_role: currentUser.role || 'USER',
    };

    setComments((prev) => [...prev, optimisticComment]);
    setCommentCount((prev) => prev + 1);
    setNewCommentText('');

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: textToSubmit }),
      });
      const data = await res.json();

      if (data.success && data.comment) {
        setComments((prev) => prev.map((c) => (c.id === tempId ? data.comment : c)));
        if (typeof data.commentCount === 'number') {
          setCommentCount(data.commentCount);
        }
      } else {
        // Rollback optimistic comment
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCommentCount((prev) => Math.max(0, prev - 1));
        setNewCommentText(textToSubmit);
        showToast(data.error || "Couldn't post your comment. Please try again.");
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCommentCount((prev) => Math.max(0, prev - 1));
      setNewCommentText(textToSubmit);
      showToast("Couldn't post your comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleKeyDownComment = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleConfirmDeleteComment = async (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;

    setIsDeletingCommentId(commentId);
    setDeletingCommentId(null);

    const prevComments = [...comments];
    const prevCount = commentCount;

    // Optimistic removal
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();

      if (data.success) {
        if (typeof data.commentCount === 'number') {
          setCommentCount(data.commentCount);
        }
      } else {
        // Rollback
        setComments(prevComments);
        setCommentCount(prevCount);
        showToast(data.error || "Couldn't delete the comment. Please try again.");
      }
    } catch {
      setComments(prevComments);
      setCommentCount(prevCount);
      showToast("Couldn't delete the comment. Please try again.");
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!postBody.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: postTitle, body: postBody }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        onPostUpdated?.();
      } else {
        showToast(data.error || "Couldn't save edits. Please try again.");
      }
    } catch {
      showToast("Couldn't save edits. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    setShowMenu(false);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setIsDeleted(true);
        if (onPostDeleted) {
          onPostDeleted();
        } else {
          onPostUpdated?.();
        }
      } else {
        showToast(data.error || "Couldn't delete post. Please try again.");
      }
    } catch {
      showToast("Couldn't delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    if (!window.confirm(`Block @${post.author_username}? You will not see their posts or updates.`)) return;
    setShowMenu(false);
    try {
      await fetch(`/api/users/${post.author_id}/block`, { method: 'POST' });
      setIsDeleted(true);
      alert(`@${post.author_username} has been blocked.`);
    } catch {
      showToast("Couldn't block user. Please try again.");
    }
  };

  const handleShare = async () => {
    setShowMenu(false);
    const postUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/#${post.id}` : `https://feeder.life/#${post.id}`;
    const shareTitle = post.title || `Post by ${post.author_name} on Feeder.life`;
    const shareText = post.body
      ? post.body.length > 120
        ? post.body.substring(0, 117) + '...'
        : post.body
      : 'Check out this post on Feeder.life';

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: postUrl,
        });
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2200);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(postUrl);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2200);
    }
  };

  const handleReport = async (reason: string) => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setShowMenu(false);
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'POST',
          targetId: post.id,
          reason,
          details: 'Reported via post menu',
        }),
      });
      alert('Thank you. This post has been submitted for moderation review.');
    } catch {}
  };

  const handleNotInterested = async () => {
    setShowMenu(false);
    setIsNotInterested(true);
    try {
      await fetch('/api/feed/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'not_interested',
          postId: post.id,
          authorId: post.author_id,
          topics: post.tags,
        }),
      });
    } catch {}
  };

  const handleHidePost = async () => {
    setShowMenu(false);
    setIsHidden(true);
    try {
      await fetch('/api/feed/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'hide',
          postId: post.id,
          authorId: post.author_id,
          topics: post.tags,
        }),
      });
    } catch {}
  };

  if (isDeleted || isHidden) {
    return null;
  }

  if (isNotInterested) {
    return (
      <article
        className="card feed-post-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          margin: '12px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <EyeOff size={18} color="var(--brand-primary)" />
          <span>You selected <strong>Not Interested</strong>. We will show fewer posts like this in your feed.</span>
        </div>
        <button
          type="button"
          onClick={() => setIsNotInterested(false)}
          className="btn btn-secondary"
          style={{ padding: '4px 12px', fontSize: '12px', minHeight: '32px' }}
        >
          Undo
        </button>
      </article>
    );
  }

  return (
    <article ref={cardRef as any} className="card feed-post-card" id={post.id}>
      {/* 1. Post Header */}
      <div
        className="post-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div className="post-author-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href={`/profile/${encodeURIComponent(post.author_username || post.author_id)}`}>
            <FeederAvatar
              src={post.author_avatar}
              alt={post.author_name}
              size={42}
              className="avatar-img"
            />
          </Link>

          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div
              className="post-author-name"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}
            >
              <Link
                href={`/profile/${encodeURIComponent(post.author_username || post.author_id)}`}
                style={{
                  fontWeight: 700,
                  fontSize: '15px',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flexShrink: 1,
                }}
              >
                {post.author_name}
              </Link>
              <PawPrint size={14} color="#2E7D32" fill="#2E7D32" style={{ flexShrink: 0 }} />
            </div>

            <div
              className="post-meta-subline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                flexWrap: 'wrap',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  color: '#2E7D32',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {post.author_feeder_level || 'Animal Guardian'}
              </span>
              {post.location_name && (
                <>
                  <span>•</span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                  >
                    {post.location_name}
                  </span>
                </>
              )}
              <span>•</span>
              <span style={{ whiteSpace: 'nowrap' }}>{formatShortDate(post.created_at)}</span>
              <span>•</span>
              <span
                title="Public visibility"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}
              >
                <Globe size={12} color="var(--text-muted)" />
                <span style={{ textTransform: 'capitalize' }}>
                  {post.visibility ? post.visibility.toLowerCase() : 'Public'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Post Actions Dropdown Menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="topbar-action-icon"
            style={{ width: '36px', height: '36px', background: 'transparent' }}
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options for this post"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <div
              className="card glass-panel"
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                width: '210px',
                zIndex: 50,
                padding: '6px',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <button className="sidebar-nav-item" onClick={handleToggleSave} style={{ padding: '8px' }}>
                <Bookmark size={16} color="var(--brand-accent)" />
                <span style={{ fontSize: '13px' }}>{isSaved ? 'Remove from Saved' : 'Save Post'}</span>
              </button>

              <button className="sidebar-nav-item" onClick={handleShare} style={{ padding: '8px' }}>
                <Share2 size={16} color="var(--brand-primary)" />
                <span style={{ fontSize: '13px' }}>Share Post</span>
              </button>

              {isAuthorOrStaff && (
                <>
                  <button
                    className="sidebar-nav-item"
                    onClick={() => {
                      setShowMenu(false);
                      setIsEditing(true);
                    }}
                    style={{ padding: '8px' }}
                  >
                    <Edit3 size={16} color="var(--brand-primary)" />
                    <span style={{ fontSize: '13px' }}>Edit Post</span>
                  </button>

                  <button
                    className="sidebar-nav-item"
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    style={{ padding: '8px', color: '#b91c1c' }}
                  >
                    <Trash2 size={16} color="#b91c1c" />
                    <span style={{ fontSize: '13px' }}>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                  </button>
                </>
              )}

              {!isAuthor && (
                <>
                  <button className="sidebar-nav-item" onClick={handleNotInterested} style={{ padding: '8px' }}>
                    <EyeOff size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: '13px' }}>Not Interested</span>
                  </button>

                  <button className="sidebar-nav-item" onClick={handleHidePost} style={{ padding: '8px' }}>
                    <Ban size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: '13px' }}>Hide Post</span>
                  </button>
                </>
              )}

              {!isAuthor && currentUser && (
                <button
                  className="sidebar-nav-item"
                  onClick={handleBlockUser}
                  style={{ padding: '8px', color: '#dc2626' }}
                >
                  <Ban size={16} color="#dc2626" />
                  <span style={{ fontSize: '13px' }}>Block @{post.author_username}</span>
                </button>
              )}

              <button className="sidebar-nav-item" onClick={() => handleReport('SPAM')} style={{ padding: '8px' }}>
                <Flag size={16} color="var(--brand-sos)" />
                <span style={{ fontSize: '13px' }}>Report Post</span>
              </button>

              <button
                className="sidebar-nav-item"
                onClick={() => handleReport('ANIMAL_CRUELTY')}
                style={{ padding: '8px', color: '#b91c1c' }}
              >
                <ShieldOff size={16} color="#b91c1c" />
                <span style={{ fontSize: '13px' }}>Report Cruelty Concern</span>
              </button>

              {post.ranking_debug && (
                <button
                  className="sidebar-nav-item"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDebugScore(!showDebugScore);
                  }}
                  style={{ padding: '8px', color: 'var(--brand-primary)', borderTop: '1px solid var(--border-subtle)' }}
                >
                  <Sliders size={16} color="var(--brand-primary)" />
                  <span style={{ fontSize: '13px' }}>Explain Ranking ({post.ranking_score})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Developer / Admin Ranking Explanation Panel */}
      {showDebugScore && post.ranking_debug && (
        <div
          className="card"
          style={{
            padding: '12px 16px',
            marginBottom: '12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-focus, #2E7D32)',
            fontSize: '12px',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Sliders size={14} /> FeederSense V1.0 Score
            </strong>
            <button
              onClick={() => setShowDebugScore(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              &times;
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
            <div>Interest: <strong>{post.ranking_debug.interestScore}</strong> (w: 0.22)</div>
            <div>Watch/Dwell: <strong>{post.ranking_debug.watchScore}</strong> (w: 0.16)</div>
            <div>Engagement: <strong>{post.ranking_debug.engagementScore}</strong> (w: 0.14)</div>
            <div>Author Affinity: <strong>{post.ranking_debug.authorAffinityScore}</strong> (w: 0.12)</div>
            <div>Save: <strong>{post.ranking_debug.saveScore}</strong> (w: 0.10)</div>
            <div>Share: <strong>{post.ranking_debug.shareScore}</strong> (w: 0.08)</div>
            <div>Freshness: <strong>{post.ranking_debug.freshnessScore}</strong> (w: 0.07)</div>
            <div>Quality: <strong>{post.ranking_debug.qualityScore}</strong> (w: 0.05)</div>
            <div>Discovery: <strong>{post.ranking_debug.discoveryScore}</strong> (w: 0.06)</div>
            <div>Penalty: <strong>{post.ranking_debug.negativePenalty}</strong></div>
          </div>
          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Topics: <strong>{post.ranking_debug.topics.join(', ') || 'general'}</strong></span>
            <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>Final Score: {post.ranking_debug.finalScore}</span>
          </div>
        </div>
      )}

      {/* 2. Post Content */}
      <div
        className="post-body"
        style={{
          marginBottom: '10px',
          fontSize: '14.5px',
          color: 'var(--text-primary)',
          lineHeight: 1.5,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          minWidth: 0,
        }}
      >
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              className="form-input"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Post title (optional)"
            />
            <textarea
              className="form-textarea"
              rows={3}
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setPostBody(post.body);
                  setPostTitle(post.title || '');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {post.title && (
              <h3 className="post-title" style={{ fontSize: '15.5px', fontWeight: 700, marginBottom: '6px' }}>
                {post.title}
              </h3>
            )}
            <div>{post.body}</div>
          </>
        )}

        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {post.tags.map((t, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--brand-primary)',
                  cursor: 'pointer',
                }}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Post Media Layout */}
      {post.media_urls && post.media_urls.length === 1 ? (
        <div className="post-media-box" style={{ borderRadius: '10px', overflow: 'hidden', margin: '10px 0' }}>
          <PostMediaItem url={post.media_urls[0]} style={{ maxHeight: '440px' }} postId={post.id} authorId={post.author_id} />
        </div>
      ) : post.media_urls && post.media_urls.length === 2 ? (
        <div
          className="post-card-2grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            borderRadius: '10px',
            overflow: 'hidden',
            margin: '10px 0',
            height: '280px',
          }}
        >
          <PostMediaItem url={post.media_urls[0]} postId={post.id} authorId={post.author_id} />
          <PostMediaItem url={post.media_urls[1]} postId={post.id} authorId={post.author_id} />
        </div>
      ) : post.media_urls && post.media_urls.length === 3 ? (
        <div
          className="post-card-3grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: '4px',
            borderRadius: '10px',
            overflow: 'hidden',
            margin: '10px 0',
            height: '310px',
          }}
        >
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <PostMediaItem url={post.media_urls[0]} postId={post.id} authorId={post.author_id} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PostMediaItem url={post.media_urls[1]} postId={post.id} authorId={post.author_id} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PostMediaItem url={post.media_urls[2]} postId={post.id} authorId={post.author_id} />
            </div>
          </div>
        </div>
      ) : post.media_urls && post.media_urls.length >= 4 ? (
        <div
          className="post-card-4grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            borderRadius: '10px',
            overflow: 'hidden',
            margin: '10px 0',
            height: '320px',
          }}
        >
          {post.media_urls.slice(0, 4).map((url, idx) => (
            <div key={idx} style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
              <PostMediaItem url={url} postId={post.id} authorId={post.author_id} />
              {idx === 3 && post.media_urls.length > 4 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.65)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                  }}
                >
                  +{post.media_urls.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* 4. Reaction & Interaction Counts (Real Database Data Only) */}
      <div
        className="post-stats-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 4px',
          fontSize: '13px',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {reactionCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', zIndex: 3 }}>💚</span>
              <span style={{ fontSize: '14px', marginLeft: '-3px', zIndex: 2 }}>🐾</span>
            </div>
          )}
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginLeft: '2px' }}>
            {reactionCount} {reactionCount === 1 ? 'Like' : 'Likes'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <span
            style={{ cursor: 'pointer', fontWeight: commentCount > 0 ? 600 : 400 }}
            onClick={handleToggleComments}
          >
            {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
          </span>
          <span>{post.share_count || 0} Shares</span>
        </div>
      </div>

      {/* 5. Post Action Toolbar */}
      <div className="post-actions-toolbar">
        {/* Like Button with Subtle Reaction Animation */}
        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
          <button
            className={`post-toolbar-btn ${isLiked ? 'liked active-like' : ''}`}
            onClick={handleToggleLike}
            aria-label={isLiked ? 'Unlike this post' : 'Like this post'}
            style={{ width: '100%' }}
          >
            <Heart
              size={19}
              className={showLikeAnimation ? 'like-icon-animated' : ''}
              color={isLiked ? 'var(--brand-primary, #10b981)' : 'var(--text-muted)'}
              fill={isLiked ? 'currentColor' : 'none'}
            />
            <span>{isLiked ? 'Liked' : 'Like'}</span>
          </button>

          {/* Floating Reaction Particles on Like */}
          {showLikeAnimation && (
            <div className="like-reaction-particles-container" aria-hidden="true">
              <span className="reaction-particle reaction-particle-1">💚</span>
              <span className="reaction-particle reaction-particle-2">🐾</span>
              <span className="reaction-particle reaction-particle-3">❤️</span>
              <span className="reaction-particle reaction-particle-4">✨</span>
              <span className="reaction-particle reaction-particle-5">🌿</span>
            </div>
          )}
        </div>

        {/* Comment Button */}
        <button
          className="post-toolbar-btn"
          onClick={handleToggleComments}
          aria-label="Comment on this post"
        >
          <MessageCircle size={18} color="var(--text-muted)" />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          className="post-toolbar-btn"
          onClick={handleShare}
          aria-label="Share this post"
        >
          <Share2 size={18} color="var(--text-muted)" />
          <span>Share</span>
        </button>

        {/* Save Button */}
        <button
          className="post-toolbar-btn"
          onClick={handleToggleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save post'}
          style={{
            color: isSaved ? 'var(--brand-primary)' : undefined,
          }}
        >
          <Bookmark
            size={18}
            color={isSaved ? 'var(--brand-primary)' : 'var(--text-muted)'}
            fill={isSaved ? 'currentColor' : 'none'}
          />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* 6. Comment Section */}
      {showComments && (
        <div className="post-comments-container">
          {/* Add comment input */}
          {currentUser ? (
            <form onSubmit={handleAddComment} className="comment-input-row">
              <FeederAvatar
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                size={34}
                className="avatar-img"
              />
              <input
                type="text"
                className="comment-input-field"
                placeholder={`Write a comment as ${currentUser.fullName}...`}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={handleKeyDownComment}
                disabled={isSubmittingComment}
                aria-label="Write a comment"
              />
              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '0 16px',
                  minHeight: '44px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                disabled={isSubmittingComment || !newCommentText.trim()}
                aria-label="Submit comment"
              >
                {isSubmittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              </button>
            </form>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                textAlign: 'center',
                marginBottom: '10px',
              }}
            >
              <Link href="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
                Sign in
              </Link>{' '}
              to leave a comment.
            </div>
          )}

          {/* Comments list */}
          {isLoadingComments ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No comments yet. Be the first animal ally to comment!
            </div>
          ) : (
            comments.map((c) => {
              const isCommentAuthorOrAdmin = !!(
                currentUser &&
                (currentUser.id === c.author_id ||
                  currentUser.role === 'PLATFORM_ADMIN' ||
                  currentUser.role === 'PLATFORM_MODERATOR')
              );
              const isDeletingThis = isDeletingCommentId === c.id;
              const isConfirmingThis = deletingCommentId === c.id;

              return (
                <div
                  key={c.id}
                  className="comment-item"
                  style={{ opacity: isDeletingThis ? 0.4 : 1, transition: 'opacity 0.2s' }}
                >
                  <Link href={`/profile/${encodeURIComponent(c.author_username || c.author_id)}`}>
                    <FeederAvatar
                      src={c.author_avatar}
                      alt={c.author_name}
                      size={34}
                      className="avatar-img"
                    />
                  </Link>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="comment-bubble">
                      <div className="comment-author-name">
                        <Link
                          href={`/profile/${encodeURIComponent(c.author_username || c.author_id)}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {c.author_name}
                        </Link>
                      </div>
                      <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{c.body}</div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                        paddingLeft: '6px',
                      }}
                    >
                      <span>{formatTime(c.created_at)}</span>

                      {/* Comment Delete Option */}
                      {isCommentAuthorOrAdmin && !isDeletingThis && (
                        <>
                          <span>•</span>
                          {!isConfirmingThis ? (
                            <button
                              type="button"
                              onClick={() => setDeletingCommentId(c.id)}
                              className="comment-delete-text-btn"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '11.5px',
                                padding: 0,
                                fontWeight: 500,
                              }}
                              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#ef4444')}
                              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-muted)')}
                              aria-label="Delete comment"
                            >
                              Delete
                            </button>
                          ) : (
                            <div className="comment-delete-confirm-box">
                              <span>Delete comment?</span>
                              <button
                                type="button"
                                className="comment-delete-confirm-btn"
                                onClick={() => handleConfirmDeleteComment(c.id)}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                className="comment-delete-cancel-btn"
                                onClick={() => setDeletingCommentId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {isDeletingThis && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                          <Loader2 size={12} className="animate-spin" /> Deleting...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Share Toast */}
      {shareToast && (
        <div className="post-error-toast" style={{ background: '#059669' }}>
          <Sparkles size={16} /> Link copied to clipboard!
        </div>
      )}

      {/* Error Toast */}
      {toastMessage && (
        <div className="post-error-toast">
          <AlertCircle size={16} color="#f87171" /> {toastMessage}
        </div>
      )}
    </article>
  );
}
