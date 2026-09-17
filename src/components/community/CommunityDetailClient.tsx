'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PostCard from '@/components/feed/PostCard';
import PostComposerModal from '@/components/feed/PostComposerModal';
import FeederAvatar from '@/components/common/FeederAvatar';
import {
  Users2,
  ShieldCheck,
  MapPin,
  Plus,
  FileText,
  Info,
  Lock,
  CheckCircle2,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { formatFullDate, formatShortDate } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';

interface CommunityDetailClientProps {
  community: any;
  initialPosts: any[];
  user: UserSession | null;
}

export default function CommunityDetailClient({
  community,
  initialPosts,
  user,
}: CommunityDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'about' | 'rules' | 'requests'>('posts');
  const [isJoined, setIsJoined] = useState(community.is_joined);
  const [isPending, setIsPending] = useState(community.is_pending);
  const [memberCount, setMemberCount] = useState(community.actual_members || community.member_count);
  const [membersList, setMembersList] = useState<any[]>(community.members || []);
  const [pendingRequests, setPendingRequests] = useState<any[]>(community.pending_requests || []);
  const [posts, setPosts] = useState(initialPosts);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleToggleJoin = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/communities/${community.id}/join`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIsJoined(data.isJoined);
        setIsPending(data.isPending);
        if (data.memberCount !== undefined) {
          setMemberCount(data.memberCount);
        } else {
          setMemberCount(data.isJoined ? memberCount + 1 : Math.max(0, memberCount - 1));
        }
      }
    } catch {}
    setIsActionLoading(false);
  };

  const handleModerateRequest = async (targetUserId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`/api/communities/${community.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingRequests((prev) => prev.filter((u) => u.id !== targetUserId));
        if (action === 'APPROVE') {
          setMemberCount((prev: number) => prev + 1);
        }
      }
    } catch {}
  };

  return (
    <div>
      {/* 1. Community Header Banner */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '16px', borderRadius: '16px' }}>
        <div
          style={{
            height: '180px',
            backgroundImage: `url(${community.cover_image || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div style={{ padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <img
              src={community.avatar_image || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80'}
              alt=""
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '16px',
                objectFit: 'cover',
                border: '4px solid var(--bg-card)',
                marginTop: '-50px',
                boxShadow: 'var(--shadow-md)',
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleToggleJoin}
                disabled={isActionLoading}
                className={isJoined ? 'btn-secondary' : isPending ? 'btn-secondary' : 'btn-primary'}
                style={{ padding: '8px 20px', fontSize: '14px' }}
              >
                {isJoined ? '✓ Joined' : isPending ? '⌛ Request Sent' : community.is_private ? '+ Request to Join' : '+ Join Group'}
              </button>

              {isJoined && (
                <button
                  onClick={() => setIsComposerOpen(true)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> Post
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{community.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
              <span>👥 {memberCount} welfare {memberCount === 1 ? 'member' : 'members'}</span>
              {community.location_area && (
                <>
                  <span>&bull;</span>
                  <span>📍 {community.location_area}</span>
                </>
              )}
              {community.is_private === 1 && (
                <>
                  <span>&bull;</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#b91c1c' }}>
                    <Lock size={12} /> Private Group
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0, overflowX: 'auto' }}>
            <button
              className={`feed-filter-chip ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Feed Posts ({posts.length})
            </button>
            <button
              className={`feed-filter-chip ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Members ({memberCount})
            </button>
            <button
              className={`feed-filter-chip ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
            <button
              className={`feed-filter-chip ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              Rules
            </button>
            {community.is_admin && pendingRequests.length > 0 && (
              <button
                className={`feed-filter-chip ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
                style={{ color: '#d97706', fontWeight: 700 }}
              >
                Requests ({pendingRequests.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Tab Contents */}

      {/* A. Posts Tab */}
      {activeTab === 'posts' && (
        <div>
          {community.is_private && !isJoined && !community.is_admin ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '14px' }}>
              <Lock size={40} color="#b91c1c" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>This Group is Private</div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '420px', margin: '8px auto 16px auto', lineHeight: 1.5 }}>
                Join this community to view rescue feeds, participate in local discussions, and connect with fellow guardians.
              </p>
              <button className="btn-primary" onClick={handleToggleJoin} disabled={isActionLoading}>
                {isPending ? 'Request Pending' : 'Request to Join'}
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="card" style={{ padding: '40px 24px', textAlign: 'center', borderRadius: '14px' }}>
              <Users2 size={40} color="var(--brand-primary)" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 700, fontSize: '16px' }}>No posts in this community yet</div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '6px 0 14px 0' }}>
                Share the first animal feeding or rescue update with fellow members!
              </p>
              {isJoined && (
                <button className="btn-primary" onClick={() => setIsComposerOpen(true)}>
                  Create Community Post
                </button>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
              />
            ))
          )}
        </div>
      )}

      {/* B. Members Tab */}
      {activeTab === 'members' && (
        <div className="card" style={{ padding: '20px', borderRadius: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users2 size={18} color="var(--brand-primary)" />
            <span>Community Members ({memberCount})</span>
          </h2>
          {membersList.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              No members listed yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {membersList.map((m: any) => (
                <Link
                  key={m.id}
                  href={`/profile/${m.username}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    textDecoration: 'none',
                    background: 'var(--bg-secondary)',
                    transition: 'background 0.15s ease',
                  }}
                  className="sidebar-user-card"
                >
                  <FeederAvatar src={m.avatar_url} alt={m.full_name} size={40} className="avatar-img" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.full_name}
                      </span>
                      {m.is_verified && <CheckCircle2 size={13} color="var(--brand-primary)" />}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      @{m.username} {m.role === 'founder' ? '• Founder' : m.role === 'admin' ? '• Admin' : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* C. Admin Requests Tab */}
      {activeTab === 'requests' && community.is_admin && (
        <div className="card" style={{ padding: '20px', borderRadius: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#d97706" />
            <span>Pending Join Requests ({pendingRequests.length})</span>
          </h2>
          {pendingRequests.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              No pending join requests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingRequests.map((req: any) => (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <Link
                    href={`/profile/${req.username}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
                  >
                    <FeederAvatar src={req.avatar_url} alt={req.full_name} size={40} className="avatar-img" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{req.full_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{req.username}</div>
                    </div>
                  </Link>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleModerateRequest(req.id, 'APPROVE')}
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleModerateRequest(req.id, 'REJECT')}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c' }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* D. About Tab */}
      {activeTab === 'about' && (
        <div className="card" style={{ padding: '24px', borderRadius: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} color="var(--brand-primary)" />
            <span>About this Community</span>
          </h2>
          <p style={{ fontSize: '14.5px', lineHeight: 1.7, color: 'var(--text-main)', marginBottom: '16px' }}>
            {community.description || 'Welcome to our animal welfare community.'}
          </p>
          <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '13px' }}>
            <div><strong>Location Coverage:</strong> {community.location_area || 'Global / Unspecified'}</div>
            <div style={{ marginTop: '6px' }}><strong>Category:</strong> {community.category}</div>
            <div style={{ marginTop: '6px' }}><strong>Privacy:</strong> {community.is_private ? 'Private (Approval Required)' : 'Public (Open to All)'}</div>
            <div style={{ marginTop: '6px' }}><strong>Created:</strong> {formatFullDate(community.created_at)}</div>
          </div>
        </div>
      )}

      {/* E. Rules Tab */}
      {activeTab === 'rules' && (
        <div className="card" style={{ padding: '24px', borderRadius: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--brand-accent)" />
            <span>Community Rules & Safety Standards</span>
          </h2>
          <div style={{ fontSize: '14px', lineHeight: 1.8, color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
            {community.rules_text || '1. Treat all volunteers, animals, and neighbors with respect.\n2. Do not feed cooked bones, chocolate, onion, or spoiled food.\n3. Keep feeding spots hygienic.\n4. Report emergency injuries directly via the SOS channel.'}
          </div>
        </div>
      )}

      {/* Post Composer modal pre-filled for this community */}
      <PostComposerModal
        user={user}
        isOpen={isComposerOpen}
        communityId={community.id}
        initialType="NORMAL"
        onClose={() => setIsComposerOpen(false)}
        onPostCreated={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
