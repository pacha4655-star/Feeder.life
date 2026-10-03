'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import FeederAvatar from '@/components/common/FeederAvatar';
import { X, Search, Check, Loader2, UserPlus, UserCheck, AlertCircle } from 'lucide-react';

export interface FollowerUserItem {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  feederLevel: string;
  areaName: string;
  city: string;
  bio: string;
  isVerified: boolean;
  isFollowing: boolean;
  isSelf: boolean;
}

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  initialTab?: 'followers' | 'following';
  followerCount: number;
  followingCount: number;
  currentUserId?: string | null;
  onFollowChange?: (targetUserId: string, isFollowing: boolean) => void;
}

export default function FollowListModal({
  isOpen,
  onClose,
  userId,
  username,
  initialTab = 'followers',
  followerCount,
  followingCount,
  currentUserId,
  onFollowChange,
}: FollowListModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [users, setUsers] = useState<FollowerUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Sync activeTab when initialTab changes on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Fetch followers or following
  const fetchUsers = useCallback(
    async (tab: 'followers' | 'following', pageNum: number, isInitial = false) => {
      if (isInitial) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const endpoint = `/api/users/${encodeURIComponent(userId)}/${tab}?page=${pageNum}&limit=20`;
        const res = await fetch(endpoint);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load list');
        }

        const items: FollowerUserItem[] = tab === 'followers' ? data.followers || [] : data.following || [];

        setUsers((prev) => (pageNum === 1 ? items : [...prev, ...items]));
        setHasMore(!!data.hasMore);
        setTotalCount(data.totalCount || 0);
        setPage(pageNum);
      } catch (err: any) {
        setError(err.message || "Couldn't load this list. Please try again.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers(activeTab, 1, true);
    }
  }, [isOpen, activeTab, userId, fetchUsers]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Follow / Unfollow inside list
  const handleToggleFollow = async (targetUser: FollowerUserItem) => {
    if (!currentUserId) {
      window.location.href = '/login';
      return;
    }

    if (actionLoadingId === targetUser.id) return;

    const previousState = targetUser.isFollowing;
    const nextState = !previousState;

    // Optimistically update list
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, isFollowing: nextState } : u))
    );
    setActionLoadingId(targetUser.id);

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(targetUser.id)}/follow`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update follow state');
      }

      // Notify parent if needed
      if (onFollowChange) {
        onFollowChange(targetUser.id, data.following);
      }
    } catch {
      // Rollback on error
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isFollowing: previousState } : u))
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered users for search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.feederLevel.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="follow-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="follow-modal-content card"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '85vh',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Tabs */}
        <div
          style={{
            padding: '16px 20px 0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h2
              id="follow-modal-title"
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: 0,
              }}
            >
              {activeTab === 'followers' ? 'Followers' : 'Following'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('followers')}
              aria-label="View followers tab"
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: activeTab === 'followers' ? 700 : 500,
                color: activeTab === 'followers' ? 'var(--brand-primary)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: activeTab === 'followers' ? '2.5px solid var(--brand-primary)' : '2.5px solid transparent',
                background: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>Followers</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: activeTab === 'followers' ? 'var(--brand-primary-light)' : 'var(--bg-secondary)',
                  color: activeTab === 'followers' ? 'var(--brand-primary)' : 'var(--text-muted)',
                }}
              >
                {activeTab === 'followers' ? totalCount || followerCount : followerCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('following')}
              aria-label="View following tab"
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: activeTab === 'following' ? 700 : 500,
                color: activeTab === 'following' ? 'var(--brand-primary)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: activeTab === 'following' ? '2.5px solid var(--brand-primary)' : '2.5px solid transparent',
                background: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>Following</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: activeTab === 'following' ? 'var(--brand-primary-light)' : 'var(--bg-secondary)',
                  color: activeTab === 'following' ? 'var(--brand-primary)' : 'var(--text-muted)',
                }}
              >
                {activeTab === 'following' ? totalCount || followingCount : followingCount}
              </span>
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              aria-label={`Search ${activeTab}`}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '13px',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* List Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
            minHeight: '260px',
            maxHeight: '55vh',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {isLoading ? (
            /* Skeletons */
            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-secondary)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div
                      style={{
                        width: '120px',
                        height: '14px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-secondary)',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                    <div
                      style={{
                        width: '80px',
                        height: '11px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-secondary)',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: '74px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-secondary)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertCircle size={36} color="#ef4444" />
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchUsers(activeTab, 1, true)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Retry
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty State */
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                }}
              >
                {activeTab === 'followers' ? <UserCheck size={26} /> : <UserPlus size={26} />}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                {searchQuery
                  ? 'No matching users found'
                  : activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  margin: 0,
                  maxWidth: '300px',
                  lineHeight: 1.5,
                }}
              >
                {searchQuery
                  ? `We couldn't find anyone matching "${searchQuery}".`
                  : activeTab === 'followers'
                  ? 'When fellow animal guardians follow this profile, they will show up here.'
                  : 'Connect with community animal welfare guardians and volunteers.'}
              </p>
            </div>
          ) : (
            /* User Items List */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredUsers.map((item) => {
                const profileHref = `/profile/${encodeURIComponent(item.username || item.id)}`;

                return (
                  <div
                    key={item.id}
                    className="follow-user-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 20px',
                      gap: '12px',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* User profile info link */}
                    <Link
                      href={profileHref}
                      onClick={onClose}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        textDecoration: 'none',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <FeederAvatar
                        src={item.avatarUrl || ''}
                        alt={item.fullName}
                        size={44}
                        style={{ flexShrink: 0 }}
                      />

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600,
                            fontSize: '14px',
                            color: 'var(--text-main)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.fullName}
                          </span>
                          {item.isVerified && (
                            <span title="Verified Guardian" style={{ display: 'inline-flex', flexShrink: 0 }}>
                              <Check size={14} color="#059669" />
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span>@{item.username}</span>
                          {item.feederLevel && (
                            <>
                              <span style={{ margin: '0 4px' }}>&bull;</span>
                              <span style={{ color: '#059669', fontWeight: 500 }}>
                                {item.feederLevel}
                              </span>
                            </>
                          )}
                        </div>

                        {item.city && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-subtle)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '1px',
                            }}
                          >
                            {item.city}
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Follow/Unfollow Action Button */}
                    {!item.isSelf && currentUserId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleFollow(item);
                        }}
                        disabled={actionLoadingId === item.id}
                        aria-label={item.isFollowing ? `Unfollow @${item.username}` : `Follow @${item.username}`}
                        className={item.isFollowing ? 'btn btn-secondary' : 'btn btn-primary'}
                        style={{
                          minHeight: '36px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '8px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                        }}
                      >
                        {actionLoadingId === item.id ? (
                          <Loader2 className="animate-spin" size={13} />
                        ) : item.isFollowing ? (
                          <>
                            <Check size={13} />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={13} />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && !searchQuery && (
                <div style={{ padding: '12px 20px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fetchUsers(activeTab, page + 1)}
                    disabled={isLoadingMore}
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>Loading more...</span>
                      </>
                    ) : (
                      <span>Load more</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
