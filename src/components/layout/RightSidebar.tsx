'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MapPin,
  PawPrint,
  Users,
  Store,
  ChevronRight,
  Heart,
} from 'lucide-react';

interface RightSidebarProps {
  onOpenSosCase?: (id: string) => void;
}

export default function RightSidebar({}: RightSidebarProps) {
  const [suggestedCommunities, setSuggestedCommunities] = useState<any[]>([]);
  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({});
  const [isLoadingComm, setIsLoadingComm] = useState(true);
  const [nearbyStats, setNearbyStats] = useState<{
    feedingCount: number;
    sosCount: number;
    volunteerCount: number;
  } | null>(null);
  const [isLoadingNearby, setIsLoadingNearby] = useState(true);

  useEffect(() => {
    fetch('/api/communities')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.communities?.length > 0) {
          setSuggestedCommunities(data.communities.slice(0, 4));
          const map: Record<string, boolean> = {};
          data.communities.forEach((c: any) => {
            map[c.id] = !!c.is_joined;
          });
          setJoinedMap(map);
        } else {
          setSuggestedCommunities([]);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingComm(false));

    try {
      const cachedLat = typeof window !== 'undefined' ? sessionStorage.getItem('feeder_last_lat') : null;
      const cachedLon = typeof window !== 'undefined' ? sessionStorage.getItem('feeder_last_lon') : null;

      if (cachedLat && cachedLon) {
        fetch(`/api/nearby?lat=${cachedLat}&lon=${cachedLon}&radius=15`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.items)) {
              const items: any[] = data.items;
              const feedingCount = items.filter((i) => i.type === 'FEEDER').length;
              const sosCount = items.filter((i) => i.type === 'SOS').length;
              setNearbyStats({
                feedingCount,
                sosCount,
                volunteerCount: items.length,
              });
            }
          })
          .catch(() => {})
          .finally(() => setIsLoadingNearby(false));
      } else {
        setIsLoadingNearby(false);
      }
    } catch {
      setIsLoadingNearby(false);
    }
  }, []);

  const handleToggleJoin = async (communityId: string) => {
    try {
      const res = await fetch(`/api/communities/${communityId}/join`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setJoinedMap((prev) => ({ ...prev, [communityId]: data.isJoined }));
      } else {
        setJoinedMap((prev) => ({ ...prev, [communityId]: !prev[communityId] }));
      }
    } catch {
      setJoinedMap((prev) => ({ ...prev, [communityId]: !prev[communityId] }));
    }
  };

  const formatMemberCount = (count: number) => {
    if (!count) return '1 member';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K members`;
    }
    return `${count} member${count === 1 ? '' : 's'}`;
  };

  const hasNearbyActivity =
    nearbyStats &&
    (nearbyStats.feedingCount > 0 ||
      nearbyStats.sosCount > 0 ||
      nearbyStats.volunteerCount > 0);

  return (
    <aside className="app-right-sidebar" style={{ width: 'var(--right-sidebar-width)' }}>
      {/* 1. Suggested Communities Card */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          padding: '14px 16px',
          marginBottom: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Suggested Communities
          </span>
          <Link href="/communities" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--brand-primary)', textDecoration: 'none' }}>
            See all
          </Link>
        </div>

        {isLoadingComm ? (
          <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            Loading communities...
          </div>
        ) : suggestedCommunities.length === 0 ? (
          <div style={{ padding: '14px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              No communities yet.
            </div>
            <Link
              href="/communities"
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-block' }}
            >
              Explore or Create
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {suggestedCommunities.map((c) => {
              const isJoined = joinedMap[c.id];
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Link
                    href={`/communities/${c.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, textDecoration: 'none' }}
                  >
                    <img
                      src={c.avatar_image || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=80&auto=format&fit=crop&q=80'}
                      alt={c.name}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {formatMemberCount(c.member_count || c.actual_member_count || 1)}
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleToggleJoin(c.id)}
                    style={{
                      padding: '5px 16px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: isJoined ? '1px solid transparent' : '1px solid var(--brand-primary)',
                      background: isJoined ? 'var(--brand-primary-light)' : 'transparent',
                      color: 'var(--brand-primary)',
                      flexShrink: 0,
                    }}
                  >
                    {isJoined ? 'Joined' : 'Join'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Nearby Activity Card */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          padding: '14px 16px',
          marginBottom: '14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Nearby Activity
          </span>
          <Link href="/nearby" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--brand-primary)', textDecoration: 'none' }}>
            See all
          </Link>
        </div>

        {isLoadingNearby ? (
          <div style={{ padding: '14px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            Scanning neighborhood...
          </div>
        ) : !hasNearbyActivity ? (
          <div style={{ padding: '14px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              No nearby activity yet.
            </div>
            <Link
              href="/nearby"
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '5px 12px', display: 'inline-block' }}
            >
              Scan Radius
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Feeding activity near you */}
            <Link
              href="/nearby"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                textDecoration: 'none',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--brand-primary-light)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Feeding activity near you
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {nearbyStats?.feedingCount || 0} active records
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>

            {/* Help requests nearby */}
            <Link
              href="/sos"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                textDecoration: 'none',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--brand-primary-light)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PawPrint size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Help requests nearby
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {nearbyStats?.sosCount || 0} active SOS alerts
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>

            {/* Local volunteers */}
            <Link
              href="/connections"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                textDecoration: 'none',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--brand-primary-light)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Local volunteers
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {nearbyStats?.volunteerCount || 0} active in area
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </Link>
          </div>
        )}
      </div>

      {/* 3. Inspirational Mission Quote Card (Matching Reference UI) */}
      <div
        style={{
          background: '#E6F4EA',
          border: '1px solid #CEEAD6',
          borderRadius: '14px',
          padding: '16px 18px',
          marginBottom: '14px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '38px', color: '#1B5E20', lineHeight: 0.8, fontFamily: 'Georgia, serif' }}>
            &ldquo;
          </span>
          <Heart size={20} color="#2E7D32" strokeWidth={1.75} />
        </div>
        <p
          style={{
            fontSize: '13.5px',
            fontWeight: 500,
            color: '#1B5E20',
            lineHeight: 1.45,
            marginTop: '8px',
            marginBottom: '4px',
          }}
        >
          Alone we can do so little; together we can do so much for the voiceless.
        </p>
      </div>

      {/* 4. Upcoming Events Card */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          padding: '14px 16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Upcoming Events
          </span>
          <Link href="/communities" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--brand-primary)', textDecoration: 'none' }}>
            See all
          </Link>
        </div>

        <div style={{ padding: '10px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            No upcoming events scheduled.
          </div>
          <Link
            href="/communities"
            style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Organize a welfare drive &rarr;
          </Link>
        </div>
      </div>
    </aside>
  );
}
