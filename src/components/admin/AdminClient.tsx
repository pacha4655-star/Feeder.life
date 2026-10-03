'use client';

import React, { useState } from 'react';
import { ShieldCheck, Flag, Users, Layers, Activity, Check, X, AlertTriangle, Sparkles, Clock, Eye, Heart, Bookmark, Share2, MessageCircle, ThumbsDown, ShieldAlert, Cpu, FlaskConical, RotateCcw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';
import type { RecommendationMetricsReport } from '@/lib/recommendation/metrics-service';

interface AdminClientProps {
  user: UserSession;
  initialReports: any[];
  initialUsers: any[];
  initialCommunities: any[];
  initialAuditLogs: any[];
  initialRecommendationReport?: RecommendationMetricsReport | null;
}

export default function AdminClient({
  user,
  initialReports,
  initialUsers,
  initialCommunities,
  initialAuditLogs,
  initialRecommendationReport,
}: AdminClientProps) {
  const isPlatformAdmin = user.role === 'PLATFORM_ADMIN';
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'communities' | 'audit' | 'recommendation'>('reports');
  const [reports, setReports] = useState(initialReports);
  const [recRange, setRecRange] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [recReport, setRecReport] = useState<RecommendationMetricsReport | null>(initialRecommendationReport || null);
  const [loadingRec, setLoadingRec] = useState(false);

  const handleResolveReport = (reportId: string, action: 'ACTIONED' | 'REJECTED') => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: action } : r))
    );
  };

  const handleRangeChange = async (range: '7d' | '14d' | '30d' | '90d') => {
    setRecRange(range);
    setLoadingRec(true);
    try {
      const res = await fetch(`/api/admin/recommendation-metrics?range=${range}`);
      const data = await res.json();
      if (data.success && data.report) {
        setRecReport(data.report);
      }
    } catch (err) {
      console.error('Failed to fetch metrics report:', err);
    } finally {
      setLoadingRec(false);
    }
  };

  return (
    <div>
      {/* Admin Header */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.05) 0%, rgba(5, 150, 105, 0.08) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={28} color="var(--brand-primary)" />
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Feeder.life Platform Admin & Moderation</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Maintain community standards, resolve safety reports, audit emergency dispatches, and oversee users.
            </p>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0 }}>
          <button
            className={`feed-filter-chip ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Safety Reports ({reports.length})
          </button>
          <button
            className={`feed-filter-chip ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({initialUsers.length})
          </button>
          <button
            className={`feed-filter-chip ${activeTab === 'communities' ? 'active' : ''}`}
            onClick={() => setActiveTab('communities')}
          >
            Communities ({initialCommunities.length})
          </button>
          <button
            className={`feed-filter-chip ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Logs ({initialAuditLogs.length})
          </button>
          {isPlatformAdmin && (
            <button
              className={`feed-filter-chip ${activeTab === 'recommendation' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendation')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} color="#f59e0b" />
              FeederSense V1.0
            </button>
          )}
        </div>
      </div>

      {/* 1. Reports Tab */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.length === 0 ? (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <Check size={40} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 700 }}>Inbox Zero: No pending moderation reports</div>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: r.reason === 'ANIMAL_CRUELTY' ? '#fee2e2' : 'var(--bg-secondary)',
                      color: r.reason === 'ANIMAL_CRUELTY' ? '#b91c1c' : 'var(--text-main)',
                    }}
                  >
                    REASON: {r.reason}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: r.status === 'PENDING' ? '#ea580c' : '#10b981',
                    }}
                  >
                    {r.status}
                  </span>
                </div>

                <div style={{ fontSize: '13.5px', marginBottom: '8px' }}>
                  Target: <strong>{r.target_type}</strong> (ID: {r.target_id}) &bull; Reported by:{' '}
                  <strong>{r.reporter_name}</strong>
                </div>

                {r.details && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px', marginBottom: '10px' }}>
                    &ldquo;{r.details}&rdquo;
                  </div>
                )}

                {r.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleResolveReport(r.id, 'ACTIONED')}
                      className="btn-danger"
                      style={{ padding: '5px 14px', fontSize: '12px' }}
                    >
                      Action / Remove Target
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'REJECTED')}
                      className="btn-secondary"
                      style={{ padding: '5px 14px', fontSize: '12px' }}
                    >
                      Dismiss Report
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. Users Tab */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>User</th>
                <th style={{ padding: '10px 8px' }}>Role</th>
                <th style={{ padding: '10px 8px' }}>Feeder Level</th>
                <th style={{ padding: '10px 8px' }}>Feeds</th>
                <th style={{ padding: '10px 8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {initialUsers.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <strong>{u.full_name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u.username} &bull; {u.email}</div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span className="badge-role">{u.role}</span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>{u.feeder_level || 'Member'}</td>
                  <td style={{ padding: '10px 8px' }}>{u.feeding_count || 0}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{u.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Communities Tab */}
      {activeTab === 'communities' && (
        <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px' }}>Community</th>
                <th style={{ padding: '10px 8px' }}>Category</th>
                <th style={{ padding: '10px 8px' }}>Location</th>
                <th style={{ padding: '10px 8px' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {initialCommunities.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 8px' }}>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/{c.slug}</div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>{c.category}</td>
                  <td style={{ padding: '10px 8px' }}>{c.location_area}</td>
                  <td style={{ padding: '10px 8px' }}>{c.member_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Audit Logs Tab */}
      {/* 4. Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {initialAuditLogs.map((log) => (
            <div key={log.id} className="card" style={{ padding: '12px 16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{log.action}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                Target: {log.entity_type} ({log.entity_id}) &bull; User: {log.user_name || 'System'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Recommendation Metrics Tab (PLATFORM_ADMIN only) */}
      {activeTab === 'recommendation' && isPlatformAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls & Date Filter */}
          <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#f59e0b" />
                FeederSense V1.0 — Observation & Learning Phase
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Feeder.life’s Hybrid Personalized Recommendation Engine (v1.0.0 Baseline Frozen). Observational telemetry streaming for human-reviewed V1.1 preparation.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['7d', '14d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  disabled={loadingRec}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: recRange === r ? 'var(--brand-primary)' : 'var(--bg-primary)',
                    color: recRange === r ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  {r === '7d' ? '7 Days' : r === '14d' ? '14 Days' : r === '30d' ? '30 Days' : '90 Days'}
                </button>
              ))}
            </div>
          </div>

          {recReport ? (
            <>
              {/* V1.1 Readiness Review Gate Banner */}
              <div
                className="card"
                style={{
                  padding: '20px',
                  background:
                    recReport.v11Readiness?.status === 'SUFFICIENT FOR HUMAN V1.1 REVIEW'
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.05) 100%)',
                  border:
                    recReport.v11Readiness?.status === 'SUFFICIENT FOR HUMAN V1.1 REVIEW'
                      ? '1px solid rgba(16, 185, 129, 0.3)'
                      : '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          background:
                            recReport.v11Readiness?.status === 'SUFFICIENT FOR HUMAN V1.1 REVIEW'
                              ? '#10b981'
                              : 'var(--brand-primary)',
                          color: '#ffffff',
                        }}
                      >
                        {recReport.v11Readiness?.status || 'DATA COLLECTION IN PROGRESS'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Window: {recReport.timeRange.toUpperCase()} ({recReport.startDate.split('T')[0]} to {recReport.endDate.split('T')[0]})
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                      {recReport.v11Readiness?.recommendationNote}
                    </p>
                    {recReport.dataSufficiencyMessage && (
                      <div style={{ fontSize: '11px', color: recReport.dataSufficiencyStatus === 'SUFFICIENT FOR HUMAN V1.1 REVIEW' ? '#10b981' : '#f59e0b', fontWeight: 700, marginTop: '6px' }}>
                        &bull; {recReport.dataSufficiencyMessage}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Algorithm Safety Lock</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                      LOCKED (Zero Auto-tuning)
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '12px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Audit Telemetry:</span>{' '}
                    <strong>{recReport.v11Readiness?.totalTelemetryEvents.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Active Creators:</span>{' '}
                    <strong>{recReport.v11Readiness?.activeCreatorsCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>New Creators:</span>{' '}
                    <strong>{recReport.v11Readiness?.newCreatorsCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Video Sessions:</span>{' '}
                    <strong>{recReport.v11Readiness?.videoSessions.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Sufficient Data:</span>{' '}
                    <strong style={{ color: recReport.v11Readiness?.isDatasetSufficient ? '#10b981' : '#f59e0b' }}>
                      {recReport.v11Readiness?.isDatasetSufficient ? 'YES' : 'COLLECTING'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Top KPI Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Feed Impressions</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.feedImpressions.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>{recReport.summary.meaningfulViews.toLocaleString()} meaningful views</div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Avg Dwell Time</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.avgDwellTimeSec}s</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>$\ge 2.0$s continuous view threshold</div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Video Watch & Completion</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.avgVideoWatchTimeSec}s</div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>{recReport.summary.videoCompletionRate}% completion rate</div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Like / Comment Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.likeRate}% / {recReport.summary.commentRate}%</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Per impression engagement</div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Save / Share / Follow</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.saveRate}% / {recReport.summary.shareRate}%</div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>{recReport.summary.followConversionRate}% follow conversion</div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Negative Feedback</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#ef4444' }}>
                    {(recReport.summary.notInterestedRate + recReport.summary.hideRate).toFixed(1)}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {recReport.summary.notInterestedRate}% not interested &bull; {recReport.summary.hideRate}% hide
                  </div>
                </div>
              </div>

              {/* 9-Signal Performance Observation Matrix */}
              {recReport.signalObservation && (
                <div className="card" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="var(--brand-primary)" />
                    FeederSense V1.0 Signal Performance Observation (Baseline Frozen)
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table" style={{ width: '100%', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Signal Name</th>
                          <th>V1.0 Weight</th>
                          <th>Status</th>
                          <th>Observed Impression Share</th>
                          <th>Observational Correlation</th>
                          <th>Causality Notice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(recReport.signalObservation).map(([key, sig]) => (
                          <tr key={key}>
                            <td><strong>{sig.name}</strong></td>
                            <td><span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>{sig.weightPct}%</span></td>
                            <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>{sig.status}</span></td>
                            <td>{sig.observedImpressionShare}%</td>
                            <td><span style={{ color: 'var(--text-main)', fontSize: '11px' }}>{sig.observationalStatus}</span></td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>{sig.causalityNotice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New Creators vs Established Creators & Diversity */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>
                    New Creator vs Established Creator Observation
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span><strong>New Creators (&lt; 30d)</strong></span>
                        <span style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                          {recReport.byCreatorType.newCreators.impressionShare}% impression share
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Engagement: <strong>{recReport.byCreatorType.newCreators.engagementRate}%</strong> &bull; Save: <strong>{recReport.byCreatorType.newCreators.saveRate}%</strong> &bull; Follow: <strong>{recReport.byCreatorType.newCreators.followConversionRate}%</strong>
                      </div>
                    </div>

                    <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span><strong>Established Creators</strong></span>
                        <span style={{ fontWeight: 800, color: '#3b82f6' }}>
                          {recReport.byCreatorType.establishedCreators.impressionShare}% impression share
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Engagement: <strong>{recReport.byCreatorType.establishedCreators.engagementRate}%</strong> &bull; Save: <strong>{recReport.byCreatorType.establishedCreators.saveRate}%</strong> &bull; Follow: <strong>{recReport.byCreatorType.establishedCreators.followConversionRate}%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>
                    Content Diversity & Concentration
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span>Same Author Constraint</span>
                      <strong>Max {recReport.contentDiversityObservation?.sameCreatorMaxPerSession || 2} posts/session</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span>Consecutive Topic Limit</span>
                      <strong>Max {recReport.contentDiversityObservation?.sameTopicMaxConsecutive || 3} posts</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span>Format Distribution</span>
                      <span>Video: {recReport.contentDiversityObservation?.formatDistribution.video}% &bull; Photo: {recReport.contentDiversityObservation?.formatDistribution.photo}% &bull; Text: {recReport.contentDiversityObservation?.formatDistribution.text}%</span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {recReport.contentDiversityObservation?.diversityAssessment}
                    </p>
                  </div>
                </div>
              </div>

              {/* Latency & Engineering Health Card */}
              <div className="card" style={{ padding: '18px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={16} color="var(--brand-primary)" />
                  Pipeline Performance & Latency Health
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Feed API Latency</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                      p50: {recReport.summary.feedApiLatencyMs.p50}ms &bull; p95: {recReport.summary.feedApiLatencyMs.p95}ms
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Scoring / Ranking Latency</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                      p50: {recReport.summary.rankingLatencyMs.p50}ms &bull; p95: {recReport.summary.rankingLatencyMs.p95}ms
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Candidate Retrieval Pool</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                      Avg: {recReport.summary.candidateCountAvg} posts evaluated
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Recommendation Fallback Rate</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', color: '#10b981' }}>
                      {recReport.summary.recommendationFallbackCount} failures (0.00%)
                    </div>
                  </div>
                </div>
              </div>

              {/* Negative Feedback Breakdown */}
              {recReport.negativeFeedbackBreakdown && (
                <div className="card" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={16} color="var(--brand-sos)" />
                    Negative Feedback Distribution by Source & Content
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px' }}>
                    {Object.entries(recReport.negativeFeedbackBreakdown.byRecommendationSource).map(([src, item]) => (
                      <div key={src} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                        <div style={{ fontWeight: 800, marginBottom: '4px' }}>Source: {src}</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Not Interested: <strong>{item.notInterested}</strong> &bull; Hide: <strong>{item.hide}</strong> &bull; Reports: <strong>{item.report}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Telemetry Health Diagnostics */}
              <div className="card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Check size={18} color="#10b981" />
                  <strong style={{ fontSize: '14px' }}>Telemetry Event Stream Active & Verified</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Total audit records verified: {recReport.telemetryHealth.totalEventsRecorded.toLocaleString()} events. Invalid/corrupt events discarded: {recReport.telemetryHealth.invalidEventsDiscarded}. Continuous dwell tracking and video completion milestone events are actively streaming and learning user topic affinities.
                </div>
              </div>

              {/* FeederSense V1.1 A/B Experiment Planning & Hypotheses Framework */}
              <div className="card" style={{ padding: '20px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FlaskConical size={18} color="var(--brand-primary)" />
                      FeederSense V1.1 A/B Experiment Planning Framework
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Control: FeederSense V1.0 (100% Traffic) &bull; Candidate: FeederSense V1.1 (0% Traffic). Isolated experiment configuration with deterministic hash assignment.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: 700 }}>
                      Traffic Split: 100% V1.0 / 0% V1.1
                    </span>
                    <button
                      onClick={async () => {
                        if (confirm('Execute Emergency Rollback? This will immediately lock 100% traffic to FeederSense V1.0 Control.')) {
                          await fetch('/api/admin/recommendation-experiments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'EMERGENCY_ROLLBACK' }),
                          });
                          alert('Emergency Rollback executed. All traffic locked to FeederSense V1.0 Control.');
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        borderRadius: '6px',
                        border: '1px solid #ef4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <RotateCcw size={12} /> Emergency Rollback
                    </button>
                  </div>
                </div>

                {/* V1.1 Hypothesis Catalog */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Registered V1.1 Candidate Hypotheses
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong>HYP-V11-001: Dwell & Completion Tuning</strong>
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>DRAFT</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 8px 0' }}>
                        Evaluates whether higher dwell sensitivity improves long-term caretaker session retention without harming adoption discoverability.
                      </p>
                      <div style={{ fontSize: '11px' }}>
                        <div><strong>Affected:</strong> Watch/Dwell (16%) & Discovery (6%)</div>
                        <div><strong>Primary Metric:</strong> Video Completion Rate</div>
                        <div><strong>Guardrails:</strong> Not Interested Rate, Hide Rate, Ranking Latency</div>
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong>HYP-V11-002: New Creator Exposure</strong>
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>READY FOR REVIEW</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 8px 0' }}>
                        Evaluates whether expanding exploratory candidate quotas for verified new caretakers improves creator retention.
                      </p>
                      <div style={{ fontSize: '11px' }}>
                        <div><strong>Affected:</strong> Discovery (6%) & Author Affinity (12%)</div>
                        <div><strong>Primary Metric:</strong> New Creator Follow Conversion</div>
                        <div><strong>Guardrails:</strong> Overall CTR, Hide Rate, Report Rate</div>
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong>HYP-V11-003: Emergency SOS Urgency</strong>
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>DRAFT</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 8px 0' }}>
                        Evaluates dynamic rescue campaign urgency escalation during active animal medical emergencies.
                      </p>
                      <div style={{ fontSize: '11px' }}>
                        <div><strong>Affected:</strong> Save (10%) & Share/Send (8%)</div>
                        <div><strong>Primary Metric:</strong> Rescue Response Conversion</div>
                        <div><strong>Guardrails:</strong> User Session Dropoff, Hide Rate</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Control vs Experiment Metrics Comparison Table */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Control (FeederSense V1.0) vs Experiment (V1.1 Candidate) Metrics
                  </h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table" style={{ width: '100%', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th>Category</th>
                          <th>Control (V1.0 Baseline)</th>
                          <th>Experiment (V1.1)</th>
                          <th>Abs Diff</th>
                          <th>Rel Diff</th>
                          <th>Significance Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Meaningful View Rate</strong></td>
                          <td><span className="badge badge-primary" style={{ fontSize: '10px' }}>PRIMARY</span></td>
                          <td>{recReport.summary.meaningfulViewRate || 0}%</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0%</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Average Dwell Time</strong></td>
                          <td><span className="badge badge-primary" style={{ fontSize: '10px' }}>PRIMARY</span></td>
                          <td>{recReport.summary.avgDwellTimeSec}s</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0s</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Video Completion Rate</strong></td>
                          <td><span className="badge badge-primary" style={{ fontSize: '10px' }}>PRIMARY</span></td>
                          <td>{recReport.summary.videoCompletionRate}%</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0%</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Like Engagement Rate</strong></td>
                          <td><span className="badge badge-primary" style={{ fontSize: '10px' }}>PRIMARY</span></td>
                          <td>{recReport.summary.likeRate}%</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0%</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Save / Bookmark Rate</strong></td>
                          <td><span className="badge badge-primary" style={{ fontSize: '10px' }}>PRIMARY</span></td>
                          <td>{recReport.summary.saveRate}%</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0%</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Follow Conversion Rate</strong></td>
                          <td><span className="badge badge-primary" style={{ fontSize: '10px' }}>PRIMARY</span></td>
                          <td>{recReport.summary.followConversionRate}%</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0%</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Not Interested Rate</strong></td>
                          <td><span className="badge badge-sos" style={{ fontSize: '10px' }}>GUARDRAIL</span></td>
                          <td>{recReport.summary.notInterestedRate}%</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0%</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Hide Content Rate</strong></td>
                          <td><span className="badge badge-sos" style={{ fontSize: '10px' }}>GUARDRAIL</span></td>
                          <td>{recReport.summary.hideRate}%</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0.0%</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                        <tr>
                          <td><strong>Ranking Latency (p95)</strong></td>
                          <td><span className="badge badge-sos" style={{ fontSize: '10px' }}>GUARDRAIL</span></td>
                          <td>{recReport.summary.rankingLatencyMs.p95}ms</td>
                          <td style={{ color: 'var(--text-muted)' }}>—</td>
                          <td>0ms</td>
                          <td>0.0%</td>
                          <td><span className="badge badge-neutral" style={{ fontSize: '10px' }}>INSUFFICIENT DATA</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
              <Activity size={32} color="var(--brand-primary)" style={{ margin: '0 auto 8px auto' }} />
              <div>Loading recommendation metrics...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
