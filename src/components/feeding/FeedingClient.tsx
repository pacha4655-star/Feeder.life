'use client';

import React, { useState, useEffect } from 'react';
import FeedingLogModal from './FeedingLogModal';
import FeedingSpotModal from './FeedingSpotModal';
import CompleteShiftModal from './CompleteShiftModal';
import {
  Utensils,
  Plus,
  Calendar,
  Award,
  Flame,
  MapPin,
  CheckCircle2,
  Clock,
  User,
  Users2,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatFullDate } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';
import FeederAvatar from '@/components/common/FeederAvatar';

interface FeedingClientProps {
  user: UserSession | null;
}

export default function FeedingClient({ user }: FeedingClientProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'rosters'>('logs');

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAnimalsFed: 0, totalFeedingRounds: 0, weeklyStreakDays: 0 });
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Rosters state
  const [spots, setSpots] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [isLoadingRosters, setIsLoadingRosters] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);

  // Complete Shift Modal state
  const [completingShift, setCompletingShift] = useState<{ shift: any; spot: any } | null>(null);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/feeding');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);
      }
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchRosters = async () => {
    setIsLoadingRosters(true);
    try {
      const res = await fetch(`/api/feeding/rosters?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setSpots(data.spots || []);
        setShifts(data.shifts || []);
      }
    } finally {
      setIsLoadingRosters(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'rosters') {
      fetchRosters();
    }
  }, [activeTab, selectedDate]);

  const handleClaimShift = async (spotId: string, timeSlot: string, action: 'CLAIM' | 'RELEASE') => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const key = `${spotId}-${timeSlot}`;
    setIsClaiming(key);

    try {
      const res = await fetch('/api/feeding/rosters/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotId,
          date: selectedDate,
          timeSlot,
          action,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRosters();
      } else {
        alert(data.error || 'Failed to update shift');
      }
    } catch {
      alert('Network error');
    } finally {
      setIsClaiming(null);
    }
  };

  // Generate next 7 dates
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  return (
    <div>
      {/* 1. Header & Stats Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid #a7f3d0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils />
              <span>Feeding Log & Volunteer Rosters</span>
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Maintain daily feeding consistency, assign neighborhood volunteer shifts, and prevent underfeeding.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={() => setIsLogModalOpen(true)}>
              <Plus size={18} />
              <span>Log Feeding Round</span>
            </button>
            {activeTab === 'rosters' && (
              <button
                className="btn-secondary"
                onClick={() => {
                  if (!user) window.location.href = '/login';
                  else setIsSpotModalOpen(true);
                }}
              >
                <MapPin size={16} color="var(--brand-primary)" />
                <span>Add Spot</span>
              </button>
            )}
          </div>
        </div>

        {/* Impact Counters Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-primary)' }}>
              {stats.totalAnimalsFed ?? 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Animals Fed</div>
          </div>

          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Flame size={22} />
              <span>{stats.weeklyStreakDays ?? 0} Days</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Feeding Streak</div>
          </div>

          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0ea5e9' }}>
              {stats.totalFeedingRounds ?? 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Rounds Logged</div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'logs' ? 'var(--brand-primary)' : 'var(--bg-card)',
              color: activeTab === 'logs' ? '#ffffff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'logs' ? '0 2px 6px rgba(16, 185, 129, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <Utensils size={16} />
            <span>Feeding History & Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('rosters')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'rosters' ? '#0ea5e9' : 'var(--bg-card)',
              color: activeTab === 'rosters' ? '#ffffff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'rosters' ? '0 2px 6px rgba(14, 165, 233, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <Calendar size={16} />
            <span>Volunteer Spot Rosters ({spots.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Feeding History & Logs */}
      {activeTab === 'logs' && (
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '20px 0 12px 0' }}>
            Verified Feeding History
          </h2>

          {isLoadingLogs ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 8px auto' }} />
              <div>Loading feeding records...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <Utensils size={40} color="var(--brand-primary)" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 700, fontSize: '16px' }}>No feeding logs recorded yet</div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 14px 0' }}>
                Start your feeding streak today and inspire your neighborhood welfare circle.
              </p>
              <button className="btn-primary" onClick={() => setIsLogModalOpen(true)}>
                Record First Feed
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {logs.map((log) => (
                <div key={log.id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FeederAvatar
                        src={log.user_avatar || user?.avatarUrl}
                        alt={log.user_name}
                        size={38}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{log.user_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {formatFullDate(log.fed_at)}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        background: 'var(--brand-primary-light)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      🐾 {log.animal_count} {log.animal_type}
                    </span>
                  </div>

                  <div style={{ margin: '8px 0', fontSize: '14px' }}>
                    <div><strong>Food:</strong> {log.food_type} {log.quantity_desc && `(${log.quantity_desc})`}</div>
                    {log.notes && <p style={{ marginTop: '4px', color: 'var(--text-main)', lineHeight: 1.5 }}>{log.notes}</p>}
                  </div>

                  {log.photo_url && (
                    <img
                      src={log.photo_url}
                      alt=""
                      style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }}
                    />
                  )}

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
                    <MapPin size={13} color="var(--brand-primary)" />
                    <span>Area: <strong>{log.approx_location_name}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Volunteer Spot Rosters */}
      {activeTab === 'rosters' && (
        <div>
          {/* Date Selector Row */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px' }}>
            {next7Days.map((d) => {
              const isSelected = selectedDate === d.iso;
              return (
                <button
                  key={d.iso}
                  onClick={() => setSelectedDate(d.iso)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid #0ea5e9' : '1px solid var(--border-subtle)',
                    background: isSelected ? '#EFF6FF' : 'var(--bg-card)',
                    color: isSelected ? '#0284C7' : 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '78px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{d.dayName}</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>{d.dateNum}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d.month}</span>
                </button>
              );
            })}
          </div>

          {isLoadingRosters ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <Loader2 size={28} className="spin" color="#0ea5e9" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Loading feeding spots & rosters...</div>
            </div>
          ) : spots.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', borderRadius: '16px' }}>
              <MapPin size={38} color="#0ea5e9" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>No Community Feeding Spots Created</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Add your local street feeding spot so neighborhood volunteers can coordinate daily morning and evening meals.
              </p>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!user) window.location.href = '/login';
                  else setIsSpotModalOpen(true);
                }}
              >
                Create Feeding Spot
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {spots.map((spot) => {
                const timeSlots = [
                  { slot: 'MORNING', label: '🌅 Morning Shift (07:00 - 09:00)' },
                  { slot: 'EVENING', label: '🌙 Evening Shift (18:00 - 20:00)' },
                ];

                return (
                  <div
                    key={spot.id}
                    className="card"
                    style={{
                      padding: '20px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                          {spot.name}
                        </h3>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="var(--brand-primary)" />
                          <span>{spot.area_name} • Est. {spot.animal_count} {spot.animal_type}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                        Regular Diet: {spot.preferred_food}
                      </div>
                    </div>

                    {/* Shifts for this spot on selected date */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {timeSlots.map(({ slot, label }) => {
                        const matchingShift = shifts.find(
                          (s) => s.spot_id === spot.id && s.date === selectedDate && s.time_slot === slot
                        );

                        const isClaimed = matchingShift && matchingShift.status === 'CLAIMED';
                        const isCompleted = matchingShift && matchingShift.status === 'COMPLETED';
                        const isMyClaim = isClaimed && user && matchingShift.volunteer_id === user.id;
                        const isWorkingKey = isClaiming === `${spot.id}-${slot}`;

                        return (
                          <div
                            key={slot}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '12px',
                              border: isCompleted
                                ? '1px solid #A7F3D0'
                                : isClaimed
                                ? '1px solid #BAE6FD'
                                : '1px dashed var(--border-subtle)',
                              background: isCompleted
                                ? 'rgba(16, 185, 129, 0.05)'
                                : isClaimed
                                ? 'rgba(14, 165, 233, 0.05)'
                                : 'var(--bg-secondary)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {label}
                              </span>

                              {isCompleted ? (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#059669',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <CheckCircle2 size={12} /> Completed
                                </span>
                              ) : isClaimed ? (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#0284C7',
                                    background: 'rgba(14, 165, 233, 0.12)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  Claimed
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    background: 'var(--bg-card)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  Open
                                </span>
                              )}
                            </div>

                            {isCompleted ? (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <strong>Fed by:</strong> {matchingShift.volunteer_name || 'Volunteer Feeder'}
                                {matchingShift.notes && <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>&ldquo;{matchingShift.notes}&rdquo;</div>}
                              </div>
                            ) : isClaimed ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <strong>Assigned:</strong> {matchingShift.volunteer_name || 'Volunteer Feeder'}
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {isMyClaim && (
                                    <button
                                      onClick={() => handleClaimShift(spot.id, slot, 'RELEASE')}
                                      disabled={isWorkingKey}
                                      style={{
                                        fontSize: '11px',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #FCA5A5',
                                        background: '#FFF',
                                        color: '#DC2626',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Release
                                    </button>
                                  )}

                                  <button
                                    className="btn-primary"
                                    onClick={() => setCompletingShift({ shift: matchingShift, spot })}
                                    style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px' }}
                                  >
                                    Mark Done
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Shift is available</span>
                                <button
                                  className="btn-primary"
                                  onClick={() => handleClaimShift(spot.id, slot, 'CLAIM')}
                                  disabled={isWorkingKey}
                                  style={{
                                    fontSize: '11px',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    background: '#0ea5e9',
                                    borderColor: '#0ea5e9',
                                  }}
                                >
                                  {isWorkingKey ? 'Claiming...' : 'Claim Shift'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Feeding Modals */}
      <FeedingLogModal
        user={user}
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onFeedLogged={fetchLogs}
      />

      <FeedingSpotModal
        user={user}
        isOpen={isSpotModalOpen}
        onClose={() => setIsSpotModalOpen(false)}
        onSpotCreated={fetchRosters}
      />

      {completingShift && (
        <CompleteShiftModal
          user={user}
          shift={completingShift.shift}
          spot={completingShift.spot}
          isOpen={true}
          onClose={() => setCompletingShift(null)}
          onCompleted={() => {
            fetchRosters();
            fetchLogs();
          }}
        />
      )}
    </div>
  );
}
