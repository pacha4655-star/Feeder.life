'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  ShieldCheck,
  Compass,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import type { NearbyWelfareItem } from '@/lib/services/nearby';

interface NearbyClientProps {
  user: UserSession | null;
}

type LocationStatus = 'IDLE' | 'LOCATING' | 'ALLOWED' | 'DENIED' | 'UNAVAILABLE' | 'ERROR';

export default function NearbyClient({ user }: NearbyClientProps) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('LOCATING');
  const [errorMessage, setErrorMessage] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [filterType, setFilterType] = useState<'ALL' | 'FEEDERS' | 'SOS'>('ALL');
  const [items, setItems] = useState<NearbyWelfareItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [approxAreaName, setApproxAreaName] = useState<string>('Current Zone');

  // Request browser location
  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationStatus('UNAVAILABLE');
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setLocationStatus('LOCATING');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        setLocationStatus('ALLOWED');

        // Cache coordinates in session storage for fast sidebar/nearby navigation
        try {
          sessionStorage.setItem('feeder_last_lat', latitude.toString());
          sessionStorage.setItem('feeder_last_lon', longitude.toString());
        } catch {}

        // Best-effort reverse geocode for user display (non-blocking)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`, {
          headers: { 'Accept-Language': 'en' },
        })
          .then((res) => res.json())
          .then((data) => {
            const area =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.city ||
              data.address?.town ||
              data.address?.county ||
              data.address?.state ||
              'Your Zone';
            setApproxAreaName(area);
          })
          .catch(() => {
            setApproxAreaName(user?.areaName || 'Your Zone');
          });
      },
      (error) => {
        console.warn('[NearbyClient] Geolocation error code:', error.code, error.message);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('DENIED');
          setErrorMessage('Location access is required to discover nearby welfare activity.');
        } else if (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT) {
          setLocationStatus('UNAVAILABLE');
          setErrorMessage("We couldn't determine your current location. Please try again.");
        } else {
          setLocationStatus('ERROR');
          setErrorMessage('An error occurred while finding your location. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }, [user?.areaName]);

  // Request location on component mount
  useEffect(() => {
    // Check if we have recent cached coordinates
    try {
      const cachedLat = sessionStorage.getItem('feeder_last_lat');
      const cachedLon = sessionStorage.getItem('feeder_last_lon');
      if (cachedLat && cachedLon) {
        setCoords({ lat: parseFloat(cachedLat), lon: parseFloat(cachedLon) });
        setLocationStatus('ALLOWED');
      }
    } catch {}

    requestLocation();
  }, [requestLocation]);

  // Fetch real nearby activity when coordinates, radius, or tab changes
  const fetchNearbyData = useCallback(async () => {
    if (!coords) return;

    setIsLoadingItems(true);
    setErrorMessage('');

    try {
      const res = await fetch(
        `/api/nearby?lat=${coords.lat}&lon=${coords.lon}&radius=${radiusKm}&type=${filterType}`
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setItems(data.items || []);
      } else {
        setItems([]);
        if (!res.ok && res.status !== 400) {
          setErrorMessage(data.error || 'Nearby activity is temporarily unavailable. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('[NearbyClient] Fetch error:', err);
      setErrorMessage('Nearby activity is temporarily unavailable. Please try again.');
    } finally {
      setIsLoadingItems(false);
    }
  }, [coords, radiusKm, filterType]);

  useEffect(() => {
    if (locationStatus === 'ALLOWED' && coords) {
      fetchNearbyData();
    }
  }, [locationStatus, coords, radiusKm, filterType, fetchNearbyData]);

  // Listen for real-time updates / published activities
  useEffect(() => {
    const handleRefresh = () => {
      if (locationStatus === 'ALLOWED' && coords) {
        fetchNearbyData();
      }
    };

    window.addEventListener('feeder:feed-refresh', handleRefresh);
    window.addEventListener('feeder:sos-refresh', handleRefresh);
    window.addEventListener('feeder:feeding-refresh', handleRefresh);

    return () => {
      window.removeEventListener('feeder:feed-refresh', handleRefresh);
      window.removeEventListener('feeder:sos-refresh', handleRefresh);
      window.removeEventListener('feeder:feeding-refresh', handleRefresh);
    };
  }, [locationStatus, coords, fetchNearbyData]);

  const formatTimeAgo = (dateStr: string) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / (1000 * 60));
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div>
      {/* 1. Header & Location Privacy Guarantee */}
      <div
        className="card"
        style={{
          padding: '20px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass color="#0ea5e9" size={24} />
              <span>Nearby Welfare Discovery</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <ShieldCheck size={16} color="var(--brand-primary)" />
              <span>
                <strong>Privacy Guaranteed:</strong> Approximate zone coordinates only. Exact house locations are never exposed.
              </span>
            </div>
          </div>

          {/* Controls: Radius Dropdown + Refresh Location */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              className="form-select"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              disabled={locationStatus !== 'ALLOWED'}
              style={{ width: 'auto', fontSize: '13px', fontWeight: 600 }}
              aria-label="Discovery radius"
            >
              <option value={1}>Within 1 km</option>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
              <option value={100}>Within 100 km</option>
            </select>

            <button
              type="button"
              onClick={requestLocation}
              disabled={locationStatus === 'LOCATING'}
              className="btn btn-secondary"
              title="Refresh your location"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
            >
              <RefreshCw size={14} className={locationStatus === 'LOCATING' ? 'animate-spin' : ''} />
              <span>{locationStatus === 'LOCATING' ? 'Locating...' : 'Refresh location'}</span>
            </button>
          </div>
        </div>

        {/* Activity Filter Tabs */}
        <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0 }}>
          {[
            { id: 'ALL', label: 'All Activity' },
            { id: 'FEEDERS', label: '🐾 Feeding Logs' },
            { id: 'SOS', label: '🚨 Emergency Alerts' },
          ].map((f) => (
            <button
              key={f.id}
              className={`feed-filter-chip ${filterType === f.id ? 'active' : ''}`}
              onClick={() => setFilterType(f.id as any)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* STATE HANDLING: When Location is Denied, Unavailable, or Locating */}
      {locationStatus === 'LOCATING' && (
        <div className="card" style={{ padding: '36px 20px', textAlign: 'center', marginBottom: '16px' }}>
          <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 10px auto', color: '#0ea5e9' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
            Finding nearby welfare activity...
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Acquiring your browser coordinates to calculate accurate distances.
          </p>
        </div>
      )}

      {locationStatus === 'DENIED' && (
        <div
          className="card"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            marginBottom: '16px',
            border: '1px solid #fecaca',
            background: '#fff5f5',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📍</div>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#b91c1c', marginBottom: '6px' }}>
            Location Access Required
          </h3>
          <p style={{ fontSize: '13.5px', color: '#7f1d1d', maxWidth: '460px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Location access is required to discover nearby welfare activity. Exact coordinates are never published publicly.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
          >
            <MapPin size={16} />
            <span>Enable Location</span>
          </button>
        </div>
      )}

      {locationStatus === 'UNAVAILABLE' && (
        <div
          className="card"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            marginBottom: '16px',
            border: '1px solid #fed7aa',
            background: '#fffaf0',
          }}
        >
          <AlertCircle size={32} color="#ea580c" style={{ margin: '0 auto 10px auto' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#9a3412', marginBottom: '6px' }}>
            Location Unavailable
          </h3>
          <p style={{ fontSize: '13.5px', color: '#7c2d12', maxWidth: '460px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            We couldn&apos;t determine your current location. Please check your device GPS / permissions and try again.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {locationStatus === 'ERROR' && (
        <div className="card" style={{ padding: '32px 20px', textAlign: 'center', marginBottom: '16px' }}>
          <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 10px auto' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#b91c1c', marginBottom: '6px' }}>
            Location Error
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px auto' }}>
            {errorMessage || 'Nearby activity is temporarily unavailable. Please try again.'}
          </p>
          <button type="button" onClick={requestLocation} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* STATE A & E: Location Allowed — Render Radar + Real Records */}
      {locationStatus === 'ALLOWED' && coords && (
        <>
          {/* 2. Interactive Radar Canvas */}
          <div
            className="card"
            style={{
              padding: '20px',
              marginBottom: '16px',
              background: 'radial-gradient(circle, var(--bg-card) 20%, var(--bg-secondary) 100%)',
              textAlign: 'center',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} color="var(--brand-primary)" />
                <span>{approxAreaName} &bull; {radiusKm} km Zone Radar</span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Showing {items.length} active animal-care {items.length === 1 ? 'activity' : 'activities'}
              </div>
            </div>

            {/* Radar Graphic Container */}
            <div
              style={{
                position: 'relative',
                height: '240px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(5, 150, 105, 0.04)',
                border: '1px dashed var(--border-subtle)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Concentric distance rings */}
              <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.15)' }} />
              <div style={{ position: 'absolute', width: '130px', height: '130px', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.25)' }} />
              <div style={{ position: 'absolute', width: '50px', height: '50px', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.35)' }} />

              {/* Center Point (User) */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  background: 'var(--brand-primary)',
                  color: 'white',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: '0 0 12px var(--brand-primary-glow)',
                }}
              >
                Your Zone
              </div>

              {/* Dynamically plot real items */}
              {items.slice(0, 8).map((item, idx) => {
                const angle = (idx * (360 / Math.max(items.length, 1))) * (Math.PI / 180);
                const distRatio = Math.min(Math.max((item.distanceKm || 0.1) / radiusKm, 0.22), 0.85);
                const x = Math.cos(angle) * (100 * distRatio);
                const y = Math.sin(angle) * (80 * distRatio);

                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      transform: `translate(${x}px, ${y}px)`,
                      background: item.color,
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      whiteSpace: 'nowrap',
                      zIndex: 3,
                    }}
                  >
                    {item.icon} {item.title.split(' ')[0]} ({item.distanceKm.toFixed(1)} km)
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Nearby Activity List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isLoadingItems ? (
              <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 8px auto', color: 'var(--brand-primary)' }} />
                <div>Scanning neighborhood welfare activity...</div>
              </div>
            ) : items.length === 0 ? (
              <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📍</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  No active animal-welfare activity found nearby.
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                  There are no recorded feeding rounds or active emergency alerts within {radiusKm} km of your location right now. Be the first local volunteer to log care in this neighborhood.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/feeding" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    Log a Feeding
                  </Link>
                  <Link href="/sos" className="btn btn-sos" style={{ textDecoration: 'none' }}>
                    Report SOS
                  </Link>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '26px' }}>{item.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{item.title}</div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{item.subtitle}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        background: item.color,
                        color: 'white',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.distanceKm.toFixed(1)} km away
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="var(--brand-primary)" />
                      <span>Approximate Zone: <strong>{item.approxLocation}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {item.createdAt && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} />
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      )}

                      {item.type === 'SOS' && (
                        <Link
                          href={`/sos`}
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#dc2626',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span>Respond</span>
                          <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
