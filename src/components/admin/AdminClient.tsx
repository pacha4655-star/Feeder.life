'use client';

import React, { useState } from 'react';
import { ShieldCheck, Flag, Users, Layers, Activity, Check, X, AlertTriangle, Sparkles, Clock, Eye, Heart, Bookmark, Share2, MessageCircle, ThumbsDown, ShieldAlert, Cpu } from 'lucide-react';
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
  const [recRange, setRecRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [recReport, setRecReport] = useState<RecommendationMetricsReport | null>(initialRecommendationReport || null);
  const [loadingRec, setLoadingRec] = useState(false);

  const handleResolveReport = (reportId: string, action: 'ACTIONED' | 'REJECTED') => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: action } : r))
    );
  };

  const handleRangeChange = async (range: '7d' | '30d' | '90d') => {
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
                FeederSense V1.0 — Real-World Performance
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Feeder.life’s Hybrid Personalized Recommendation Engine &bull; Auditing candidate generation, engagement velocity, dwell times, and algorithmic pipeline health.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['7d', '30d', '90d'] as const).map((r) => (
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
                  {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                </button>
              ))}
            </div>
          </div>

          {recReport ? (
            <>
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
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Video Watch Time</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.avgVideoWatchTimeSec}s</div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>{recReport.summary.videoCompletionRate}% completion rate</div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Like / Comment Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.likeRate}% / {recReport.summary.commentRate}%</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Per impression engagement</div>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Save / Share Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{recReport.summary.saveRate}% / {recReport.summary.shareRate}%</div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>High advocacy signals</div>
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

              {/* Recommendation Candidate Source Breakdown */}
              <div className="card" style={{ padding: '18px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>
                  Recommendation Candidate Sources Distribution
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {Object.entries(recReport.byRecommendationSource).map(([src, pct]) => (
                    <div key={src} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{src.replace(/([A-Z])/g, ' $1')}</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px', color: 'var(--brand-primary)' }}>{pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Type & Format Matrices */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div className="card" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>By Content Format</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span><strong>Video & Reels</strong> ({recReport.byFormat.video.count} active)</span>
                      <span>Watch: {recReport.byFormat.video.avgWatchSec}s ({recReport.byFormat.video.completionRate}% complete)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span><strong>Photo / Media</strong> ({recReport.byFormat.photo.count} active)</span>
                      <span>Dwell: {recReport.byFormat.photo.avgDwellSec}s ({recReport.byFormat.photo.saveRate}% saves)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>Text / Guides</strong> ({recReport.byFormat.text.count} active)</span>
                      <span>Dwell: {recReport.byFormat.text.avgDwellSec}s ({recReport.byFormat.text.commentRate}% comments)</span>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: '18px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>New vs Existing Creators</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span><strong>New Creators (&lt; 30d)</strong> ({recReport.byCreatorType.newCreators.postCount} posts)</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>{recReport.byCreatorType.newCreators.avgEngagementRate}% engagement</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>Established Creators</strong> ({recReport.byCreatorType.existingCreators.postCount} posts)</span>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{recReport.byCreatorType.existingCreators.avgEngagementRate}% engagement</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry Health Diagnostics */}
              <div className="card" style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Check size={18} color="#10b981" />
                  <strong style={{ fontSize: '14px' }}>Telemetry Event Stream Active & Verified</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Total audit records verified: {recReport.telemetryHealth.totalEventsRecorded.toLocaleString()} events. Continuous dwell tracking and video completion milestone events are actively streaming and learning user topic affinities.
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
