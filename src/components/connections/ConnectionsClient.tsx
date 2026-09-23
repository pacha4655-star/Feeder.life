'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, UserCheck, UserPlus, MapPin, Award, Shield, Search } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

export interface GuardianItem {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string;
  role: string;
  feederLevel?: string;
  areaName?: string;
  city?: string;
  feedingCount: number;
  sosCount: number;
  isFollowing: boolean;
  followerCount: number;
}

interface ConnectionsClientProps {
  user: UserSession | null;
  initialTab?: 'following' | 'followers' | 'discover';
  following: GuardianItem[];
  followers: GuardianItem[];
  discover: GuardianItem[];
}

export default function ConnectionsClient({
  user,
  initialTab = 'discover',
  following: initialFollowing,
  followers: initialFollowers,
  discover: initialDiscover,
}: ConnectionsClientProps) {
  const [activeTab, setActiveTab] = useState<'following' | 'followers' | 'discover'>(
    initialTab || (initialFollowing.length > 0 ? 'following' : 'discover')
  );
  const [followingList, setFollowingList] = useState<GuardianItem[]>(initialFollowing);
  const [followersList, setFollowersList] = useState<GuardianItem[]>(initialFollowers);
  const [discoverList, setDiscoverList] = useState<GuardianItem[]>(initialDiscover);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const toggleFollow = async (targetUser: GuardianItem) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setProcessingId(targetUser.id);
    try {
      const res = await fetch(`/api/users/${targetUser.id}/follow`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        const isNowFollowing = data.following;

        const updateItem = (item: GuardianItem) =>
          item.id === targetUser.id
            ? {
                ...item,
                isFollowing: isNowFollowing,
                followerCount: data.followerCount,
              }
            : item;

        setFollowingList((prev) => {
          if (isNowFollowing) {
            // Add if not present
            if (!prev.some((p) => p.id === targetUser.id)) {
              return [{ ...targetUser, isFollowing: true, followerCount: data.followerCount }, ...prev];
            }
            return prev.map(updateItem);
          } else {
            return prev.filter((p) => p.id !== targetUser.id);
          }
        });

        setFollowersList((prev) => prev.map(updateItem));
        setDiscoverList((prev) => prev.map(updateItem));
      }
    } catch {
      // silently handle or toast
    } finally {
      setProcessingId(null);
    }
  };

  const getActiveList = () => {
    let list: GuardianItem[] = [];
    if (activeTab === 'following') list = followingList;
    else if (activeTab === 'followers') list = followersList;
    else list = discoverList;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.areaName?.toLowerCase().includes(q) ||
        item.city?.toLowerCase().includes(q)
    );
  };

  const activeList = getActiveList();

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Banner / Header */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Guardians & Connections</h1>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Real animal caregivers, rescue volunteers & community feeders in your welfare network
              </div>
            </div>
          </div>

          {/* Tab buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', gap: '4px', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => setActiveTab('following')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'following' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'following' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'following' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'following' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Following ({followingList.length})
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'followers' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'followers' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'followers' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'followers' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Followers ({followersList.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'discover' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'discover' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'discover' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: activeTab === 'discover' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Discover Guardians ({discoverList.length})
            </button>
          </div>
        </div>

        {/* Filter input */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name, handle, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Guardians List or Empty State */}
      {activeList.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <Users size={44} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>
            {activeTab === 'following'
              ? 'Not Following Any Guardians Yet'
              : activeTab === 'followers'
              ? 'No Followers Yet'
              : 'No Other Guardians Found in Directory'}
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            {activeTab === 'following'
              ? 'Follow real animal caretakers and rescuers across your city to stay notified about feeding drives and emergency cases.'
              : activeTab === 'followers'
              ? 'When other registered welfare workers follow your profile, they will appear here.'
              : 'As new real caretakers register and feed in your region, they will appear in this guardian directory.'}
          </p>
          {activeTab !== 'discover' && discoverList.length > 0 && (
            <button className="btn-primary" onClick={() => setActiveTab('discover')}>
              Discover Caretakers
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))',
            gap: '16px',
          }}
        >
          {activeList.map((guardian) => (
            <div
              key={guardian.id}
              className="card"
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Link href={`/profile/${guardian.username}`}>
                    <img
                      src={guardian.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${guardian.username}`}
                      alt={guardian.fullName}
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--border)',
                      }}
                    />
                  </Link>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link
                      href={`/profile/${guardian.username}`}
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {guardian.fullName}
                    </Link>
                    <Link
                      href={`/profile/${guardian.username}`}
                      style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}
                      className="hover:underline"
                    >
                      @{guardian.username}
                    </Link>
                  </div>
                </div>

                {/* Badges / Metrics */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {guardian.feederLevel && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: 'rgba(5, 150, 105, 0.1)',
                        color: '#059669',
                      }}
                    >
                      <Award size={12} />
                      {guardian.feederLevel}
                    </span>
                  )}
                  {guardian.role === 'PLATFORM_ADMIN' && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                      }}
                    >
                      <Shield size={12} />
                      Admin
                    </span>
                  )}
                  {(guardian.areaName || guardian.city) && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <MapPin size={12} />
                      {[guardian.areaName, guardian.city].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>

                {/* Feeding / SOS stats */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Feedings: </span>
                    <strong style={{ color: 'var(--primary)' }}>{guardian.feedingCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Followers: </span>
                    <strong>{guardian.followerCount}</strong>
                  </div>
                </div>
              </div>

              {/* Action */}
              {user && user.id === guardian.id ? (
                <Link
                  href={`/profile/${guardian.username}`}
                  className="btn-secondary"
                  style={{ width: '100%', textAlign: 'center', padding: '8px', fontSize: '12.5px' }}
                >
                  My Profile
                </Link>
              ) : (
                <button
                  onClick={() => toggleFollow(guardian)}
                  disabled={processingId === guardian.id}
                  className={guardian.isFollowing ? 'btn-secondary' : 'btn-primary'}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px',
                    fontSize: '12.5px',
                  }}
                >
                  {guardian.isFollowing ? (
                    <>
                      <UserCheck size={15} />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} />
                      <span>Follow Guardian</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
