'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users2, Plus, Search, ShieldCheck, MapPin, Check, Lock, Clock } from 'lucide-react';
import FeederAvatar from '@/components/common/FeederAvatar';
import type { UserSession } from '@/lib/auth/session';

interface CommunitiesClientProps {
  user: UserSession | null;
}

export default function CommunitiesClient({ user }: CommunitiesClientProps) {
  const [category, setCategory] = useState('ALL');
  const [communities, setCommunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommCategory, setNewCommCategory] = useState('general');
  const [newCommArea, setNewCommArea] = useState(user?.areaName || '');
  const [newCommIsPrivate, setNewCommIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCommunities = async (cat = category) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/communities?category=${cat}`);
      const data = await res.json();
      if (data.success) {
        setCommunities(data.communities || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities(category);
  }, [category]);

  const handleToggleJoin = async (communityId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch(`/api/communities/${communityId}/join`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === communityId
              ? {
                  ...c,
                  is_joined: data.isJoined,
                  is_pending: data.isPending,
                  actual_member_count:
                    data.memberCount !== undefined
                      ? data.memberCount
                      : data.isJoined
                      ? (c.actual_member_count || c.member_count) + 1
                      : Math.max(0, (c.actual_member_count || c.member_count) - 1),
                }
              : c
          )
        );
      }
    } catch {}
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    if (!newCommName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCommName.trim(),
          description: newCommDesc.trim(),
          communityType: newCommCategory,
          locationArea: newCommArea.trim(),
          isPrivate: newCommIsPrivate ? 1 : 0,
          coverImage: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80',
          avatarImage: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setNewCommName('');
        setNewCommDesc('');
        setNewCommIsPrivate(false);
        fetchCommunities();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCommunities = communities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.location_area && c.location_area.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users2 color="var(--brand-primary)" />
              <span>Animal Welfare Communities</span>
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Join neighborhood feeding packs, rescue circles, and specialized species welfare networks.
            </p>
          </div>

          <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} />
            <span>Create Community</span>
          </button>
        </div>

        {/* Category Filters */}
        <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0, overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: 'All Communities' },
            { id: 'city', label: '🏙️ City & Area' },
            { id: 'species', label: '🐾 Species' },
            { id: 'topic', label: '🚨 Rescue' },
            { id: 'organization', label: '🛡️ NGO' },
            { id: 'general', label: '🌐 General' },
          ].map((cat) => (
            <button
              key={cat.id}
              className={`feed-filter-chip ${category === cat.id ? 'active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Filter input */}
      <div className="form-group" style={{ marginBottom: '16px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Filter communities by name or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Communities Grid */}
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading welfare communities...
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '14px' }}>
          <Users2 size={44} color="var(--brand-primary)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
            No communities yet.
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {searchQuery
              ? `No welfare packs found matching "${searchQuery}".`
              : 'Be the first animal guardian to launch a rescue and feeding community in your district.'}
          </p>
          {user ? (
            <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={16} /> Create Community
            </button>
          ) : (
            <Link href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
              Sign In to Create
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {filteredCommunities.map((comm) => (
            <div key={comm.id} className="card" style={{ overflow: 'hidden', borderRadius: '14px' }}>
              <div
                style={{
                  height: '110px',
                  backgroundImage: `url(${comm.cover_image || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&auto=format&fit=crop&q=80'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div style={{ padding: '16px', position: 'relative' }}>
                <img
                  src={comm.avatar_image || 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=150&auto=format&fit=crop&q=80'}
                  alt=""
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: '3px solid var(--bg-card)',
                    position: 'absolute',
                    top: '-30px',
                    left: '16px',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button
                    onClick={() => handleToggleJoin(comm.id)}
                    className={comm.is_joined ? 'btn-secondary' : comm.is_pending ? 'btn-secondary' : 'btn-primary'}
                    style={{ padding: '6px 16px', fontSize: '13px' }}
                  >
                    {comm.is_joined ? '✓ Joined' : comm.is_pending ? '⌛ Request Sent' : comm.is_private ? '+ Request to Join' : '+ Join Community'}
                  </button>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <Link
                    href={`/communities/${comm.id}`}
                    style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}
                  >
                    {comm.name}
                  </Link>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0', flexWrap: 'wrap' }}>
                    <span>👥 {comm.actual_member_count || comm.member_count} {comm.actual_member_count === 1 ? 'member' : 'members'}</span>
                    {comm.location_area && (
                      <>
                        <span>&bull;</span>
                        <span>📍 {comm.location_area}</span>
                      </>
                    )}
                    {comm.is_private === 1 && (
                      <>
                        <span>&bull;</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#b91c1c' }}>
                          <Lock size={12} /> Private
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-main)', lineHeight: 1.5, marginTop: '8px' }}>
                    {comm.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Community Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create Animal Welfare Community</div>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateCommunity}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Community Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Koramangala Street Paws Alliance"
                    value={newCommName}
                    onChange={(e) => setNewCommName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newCommCategory}
                    onChange={(e) => setNewCommCategory(e.target.value)}
                  >
                    <option value="city">🏙️ Neighborhood / City Pack</option>
                    <option value="species">🐾 Species Specific (Dogs, Cats, Birds, Indies)</option>
                    <option value="topic">🚨 Emergency Rescue & Treatment Triage</option>
                    <option value="organization">🛡️ Registered Shelter / Animal Welfare NGO</option>
                    <option value="general">🌐 General Animal Welfare Community</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Geographic Area / City</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Chennai, Bangalore, Mumbai..."
                    value={newCommArea}
                    onChange={(e) => setNewCommArea(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description & Mission</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Describe how members cooperate for animal feeding, first-aid, or sterilization..."
                    value={newCommDesc}
                    onChange={(e) => setNewCommDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px' }}>
                    <input
                      type="checkbox"
                      checked={newCommIsPrivate}
                      onChange={(e) => setNewCommIsPrivate(e.target.checked)}
                    />
                    <span>Private Community (Requires admin approval for new members)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
