'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatShortDate, formatTime } from '@/lib/utils/date';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  MapPin,
  Globe,
  Users,
  Lock,
  Send,
  Flag,
  ShieldOff,
  Check,
  PawPrint,
  ThumbsUp,
  Edit3,
  Trash2,
  Ban,
} from 'lucide-react';
import type { PostWithAuthor } from '@/lib/services/feed-ranking';
import type { UserSession } from '@/lib/auth/session';
import FeederAvatar from '@/components/common/FeederAvatar';

function PostMediaItem({
  url,
  alt = 'Animal welfare post media',
  style = {},
}: {
  url: string;
  alt?: string;
  style?: React.CSSProperties;
}) {
  const [hasError, setHasError] = useState(false);
  const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(url);

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
    return (
      <video
        src={url}
        controls
        playsInline
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
      onError={() => setHasError(true)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        ...style,
      }}
    />
  );
}

interface PostCardProps {
  post: PostWithAuthor;
  currentUser: UserSession | null;
  onPostUpdated?: () => void;
}

export default function PostCard({ post, currentUser, onPostUpdated }: PostCardProps) {
  const [reactionCount, setReactionCount] = useState(post.reaction_count);
  const [userReaction, setUserReaction] = useState<string | null>(post.user_reaction || null);
  const [isSaved, setIsSaved] = useState(post.is_saved || false);
  const [showReactionsFlyout, setShowReactionsFlyout] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [shareToast, setShareToast] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [postTitle, setPostTitle] = useState(post.title || '');
  const [postBody, setPostBody] = useState(post.body);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const isAuthorOrStaff = !!(currentUser && (currentUser.id === post.author_id || currentUser.role === 'PLATFORM_ADMIN' || currentUser.role === 'PLATFORM_MODERATOR'));
  const isAuthor = currentUser?.id === post.author_id;

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
      }
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
        onPostUpdated?.();
      }
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
    } catch {}
  };

  // Reaction mapping
  const reactionConfig: Record<string, { emoji: string; label: string; color: string; btnClass: string }> = {
    SUPPORT: { emoji: '❤️', label: 'Support', color: 'var(--brand-support)', btnClass: 'active-support' },
    HELPFUL: { emoji: '🐾', label: 'Helpful', color: 'var(--brand-primary)', btnClass: 'active-helpful' },
    THANK_YOU: { emoji: '🙏', label: 'Thank You', color: 'var(--brand-thanks)', btnClass: 'active-thanks' },
    CARE: { emoji: '💚', label: 'Care', color: 'var(--brand-accent)', btnClass: 'active-care' },
  };

  const currentReactionInfo = userReaction ? reactionConfig[userReaction] : null;

  const handleReact = async (type: string) => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setShowReactionsFlyout(false);
    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionType: type }),
      });
      const data = await res.json();
      if (data.success) {
        setReactionCount(data.reactionCount);
        setUserReaction(data.userReaction);
      }
    } catch {}
  };

  const handleToggleSave = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setShowMenu(false);
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsSaved(data.isSaved);
      }
    } catch {}
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
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newCommentText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setComments([...comments, data.comment]);
        setCommentCount(commentCount + 1);
        setNewCommentText('');
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    setShowMenu(false);
    const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/#${post.id}` : `https://feeder.life/#${post.id}`;
    const shareTitle = post.title || `Post by ${post.author_name} on Feeder.life`;
    const shareText = post.body ? (post.body.length > 120 ? post.body.substring(0, 117) + '...' : post.body) : 'Check out this post on Feeder.life';

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

  if (isDeleted) {
    return null;
  }

  return (
    <article className="card feed-post-card" id={post.id}>
      {/* 1. Post Header */}
      <div className="post-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div className="post-author-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href={`/profile/${post.author_username}`}>
            <FeederAvatar
              src={post.author_avatar}
              alt={post.author_name}
              size={42}
              className="avatar-img"
            />
          </Link>

          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div className="post-author-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <Link
                href={`/profile/${post.author_username}`}
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
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap', minWidth: 0 }}
            >
              <span style={{ color: '#2E7D32', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{post.author_feeder_level || 'Animal Guardian'}</span>
              {post.location_name && (
                <>
                  <span>•</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{post.location_name}</span>
                </>
              )}
              <span>•</span>
              <span style={{ whiteSpace: 'nowrap' }}>{formatShortDate(post.created_at)}</span>
              <span>•</span>
              <span title="Public visibility" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                <Globe size={12} color="var(--text-muted)" />
                <span style={{ textTransform: 'capitalize' }}>{post.visibility ? post.visibility.toLowerCase() : 'Public'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Post Actions Dropdown Menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="topbar-action-icon"
            style={{ width: '32px', height: '32px', background: 'transparent' }}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <div
              className="card glass-panel"
              style={{
                position: 'absolute',
                top: '36px',
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

              <button
                className="sidebar-nav-item"
                onClick={() => handleReport('SPAM')}
                style={{ padding: '8px' }}
              >
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
            </div>
          )}
        </div>
      </div>

      {/* 2. Post Content */}
      <div className="post-body" style={{ marginBottom: '10px', fontSize: '14.5px', color: 'var(--text-primary)', lineHeight: 1.5, overflowWrap: 'break-word', wordBreak: 'break-word', minWidth: 0 }}>
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
            {post.title && <h3 className="post-title" style={{ fontSize: '15.5px', fontWeight: 700, marginBottom: '6px' }}>{post.title}</h3>}
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

      {/* 3. Post Media Layout (Real Images/Videos from Storage with Error Fallback) */}
      {post.media_urls && post.media_urls.length === 1 ? (
        <div className="post-media-box" style={{ borderRadius: '10px', overflow: 'hidden', margin: '10px 0' }}>
          <PostMediaItem url={post.media_urls[0]} style={{ maxHeight: '440px' }} />
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
          <PostMediaItem url={post.media_urls[0]} />
          <PostMediaItem url={post.media_urls[1]} />
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
            <PostMediaItem url={post.media_urls[0]} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PostMediaItem url={post.media_urls[1]} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <PostMediaItem url={post.media_urls[2]} />
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
              <PostMediaItem url={url} />
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
              <span style={{ fontSize: '14px', zIndex: 3 }}>❤️</span>
              <span style={{ fontSize: '14px', marginLeft: '-2px', zIndex: 2 }}>🐾</span>
            </div>
          )}
          <span style={{ fontWeight: 600, color: 'var(--text-muted)', marginLeft: '2px' }}>
            {reactionCount} {reactionCount === 1 ? 'Reaction' : 'Reactions'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <span style={{ cursor: 'pointer' }} onClick={handleToggleComments}>
            {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
          </span>
          <span>{post.share_count || 0} Shares</span>
        </div>
      </div>

      {/* 5. Post Action Toolbar */}
      <div className="post-actions-toolbar">
        {/* React Button */}
        <button
          className="post-toolbar-btn"
          onClick={() => handleReact('CARE')}
        >
          <ThumbsUp size={18} color="var(--text-muted)" />
          <span>Like</span>
        </button>

        {/* Comment Button */}
        <button
          className="post-toolbar-btn"
          onClick={handleToggleComments}
        >
          <MessageCircle size={18} color="var(--text-muted)" />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          className="post-toolbar-btn"
          onClick={handleShare}
        >
          <Share2 size={18} color="var(--text-muted)" />
          <span>Share</span>
        </button>

        {/* Save Button */}
        <button
          className="post-toolbar-btn"
          onClick={handleToggleSave}
          style={{
            color: isSaved ? 'var(--brand-primary)' : undefined,
          }}
        >
          <Bookmark size={18} color={isSaved ? 'var(--brand-primary)' : 'var(--text-muted)'} fill={isSaved ? 'currentColor' : 'none'} />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* 6. Threaded Comment Section */}
      {showComments && (
        <div className="post-comments-container">
          {/* Add comment input */}
          {currentUser ? (
            <form onSubmit={handleAddComment} className="comment-input-row">
              <img src={currentUser.avatarUrl} alt="" className="avatar-img" style={{ width: '32px', height: '32px' }} />
              <input
                type="text"
                className="comment-input-field"
                placeholder={`Write a comment as ${currentUser.fullName}...`}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={isSubmittingComment}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '0 14px', borderRadius: 'var(--radius-full)' }}
                disabled={isSubmittingComment || !newCommentText.trim()}
              >
                <Send size={15} />
              </button>
            </form>
          ) : (
            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px', textAlign: 'center' }}>
              <Link href="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Sign in</Link> to leave a comment.
            </div>
          )}

          {/* Comments list */}
          {isLoadingComments ? (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div style={{ padding: '8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              No comments yet. Be the first animal ally to comment!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="comment-item">
                <Link href={`/profile/${c.author_username}`}>
                  <img src={c.author_avatar} alt="" className="avatar-img" style={{ width: '32px', height: '32px' }} />
                </Link>
                <div className="comment-bubble">
                  <div className="comment-author-name">
                    <Link href={`/profile/${c.author_username}`} style={{ color: 'inherit' }}>
                      {c.author_name}
                    </Link>
                  </div>
                  <div>{c.body}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {formatTime(c.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}
