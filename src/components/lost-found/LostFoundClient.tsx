'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  MapPin,
  Calendar,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Eye,
  CheckCircle2,
  RefreshCw,
  Heart,
  Loader2,
} from 'lucide-react';
import type { LostFoundRecord } from '@/lib/services/lost-found-matcher';
import type { UserSession } from '@/lib/auth/session';
import CreateReportModal from './CreateReportModal';
import ReportDetailModal from './ReportDetailModal';
import { formatFullDate } from '@/lib/utils/date';

interface LostFoundClientProps {
  initialReports: LostFoundRecord[];
  user: UserSession | null;
}

export default function LostFoundClient({
  initialReports,
  user,
}: LostFoundClientProps) {
  const [reports, setReports] = useState<LostFoundRecord[]>(initialReports);
  const [activeTab, setActiveTab] = useState<'LOST' | 'FOUND' | 'MATCHES' | 'MY_REPORTS'>('LOST');
  const [selectedSpecies, setSelectedSpecies] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'LOST' | 'FOUND'>('LOST');
  const [selectedReport, setSelectedReport] = useState<LostFoundRecord | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let url = `/api/lost-found?`;
      if (activeTab === 'LOST') url += `type=LOST&`;
      else if (activeTab === 'FOUND') url += `type=FOUND&`;
      else if (activeTab === 'MY_REPORTS') url += `myReports=true&`;

      if (selectedSpecies !== 'ALL') url += `species=${encodeURIComponent(selectedSpecies)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, selectedSpecies]);

  // Filter in-memory for search query
  const filteredReports = reports.filter((rep) => {
    const d = rep.data || {};
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      (d.animal_name || '').toLowerCase().includes(query) ||
      (d.breed || '').toLowerCase().includes(query) ||
      (d.coat_color || '').toLowerCase().includes(query) ||
      (d.approx_location_name || '').toLowerCase().includes(query) ||
      (d.distinctive_markings || '').toLowerCase().includes(query)
    );
  });

  // Collect all potential matches across reports
  const allSuggestedMatches = reports.flatMap((rep) => {
    const matches = Array.isArray(rep.data?.matches) ? rep.data.matches : [];
    return matches.map((m) => ({
      sourceReport: rep,
      match: m,
    }));
  });

  const lostCount = reports.filter((r) => r.data?.report_type === 'LOST').length;
  const foundCount = reports.filter((r) => r.data?.report_type === 'FOUND').length;

  return (
    <div className="feed-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Hero Header Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(5, 150, 105, 0.06) 100%)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '24px' }}>🐾</span>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Lost & Found Animals Network
              </h1>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0, maxWidth: '620px', lineHeight: 1.5 }}>
              Reuniting lost pets and street animals with their guardians through community sightings and candidate similarity matching.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setCreateModalType('LOST');
                setIsCreateModalOpen(true);
              }}
              style={{ background: '#DC2626', borderColor: '#DC2626', padding: '9px 16px', fontSize: '13px' }}
            >
              <Plus size={16} />
              <span>Report Lost Animal</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => {
                setCreateModalType('FOUND');
                setIsCreateModalOpen(true);
              }}
              style={{ background: '#059669', borderColor: '#059669', padding: '9px 16px', fontSize: '13px' }}
            >
              <Plus size={16} />
              <span>Report Found / Sighted</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '8px',
          marginBottom: '16px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'LOST', label: `🚨 Lost Animals (${lostCount})` },
          { key: 'FOUND', label: `🟢 Sighted & Found (${foundCount})` },
          { key: 'MATCHES', label: `✨ Potential Matches (${allSuggestedMatches.length})` },
          { key: 'MY_REPORTS', label: '📋 My Reports' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              background: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--bg-secondary)',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by breed, coat color, landmark..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', height: '40px' }}
          />
        </div>

        {/* Species selector */}
        <select
          className="form-select"
          value={selectedSpecies}
          onChange={(e) => setSelectedSpecies(e.target.value)}
          style={{ width: 'auto', minWidth: '130px', height: '40px' }}
        >
          <option value="ALL">All Species</option>
          <option value="Dog">🐕 Dogs</option>
          <option value="Cat">🐈 Cats</option>
          <option value="Cattle">🐄 Cattle</option>
          <option value="Bird">🐦 Birds</option>
          <option value="Other">🐾 Other</option>
        </select>

        <button
          type="button"
          onClick={fetchReports}
          className="btn btn-secondary"
          style={{ height: '40px', padding: '0 12px' }}
          title="Refresh reports"
        >
          <RefreshCw size={15} className={isLoading ? 'spin' : ''} />
        </button>
      </div>

      {/* MATCHES VIEW */}
      {activeTab === 'MATCHES' ? (
        <div>
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: '#92400E',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Candidate Match Protocol:</strong> Algorithmic similarities compare species, physical markings, dates, and geographic proximity. Human guardians must visually confirm identities before concluding a case.
            </span>
          </div>

          {allSuggestedMatches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <Sparkles size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>No Potential Matches Found</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                When a new lost or found report shares similar physical cues and location radius, candidate alerts will be shown here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {allSuggestedMatches.map((item, idx) => {
                const rep = item.sourceReport;
                const m = item.match;
                const d = rep.data || {};

                return (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #FCD34D',
                      background: 'var(--bg-card)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                        {m.similarity_score}% Match Potential
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {rep.data.report_type} Case
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>
                      {d.animal_name || `${d.species} (${d.coat_color})`}
                    </div>

                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      📍 {d.approx_location_name} &bull; {d.date_lost_found}
                    </div>

                    <ul style={{ margin: '0 0 12px 0', paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>
                      {m.match_reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>

                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedReport(rep)}
                      style={{ width: '100%', fontSize: '12.5px', justifyContent: 'center' }}
                    >
                      <Eye size={14} /> Review Candidate
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* REPORTS GRID (LOST / FOUND / MY_REPORTS) */
        <div>
          {filteredReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🐾</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>No Reports in this Category</h3>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {searchQuery ? 'Try adjusting your search terms.' : 'Be the first to submit a report.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
              {filteredReports.map((rep) => {
                const d = rep.data || {};
                const isLost = d.report_type === 'LOST';
                const hasPhoto = d.media_urls && d.media_urls.length > 0;
                const matchCount = Array.isArray(d.matches) ? d.matches.length : 0;

                return (
                  <div
                    key={rep.id}
                    className="card"
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: isLost ? '1px solid #FECACA' : '1px solid #BBF7D0',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {/* Card Media Header */}
                    <div style={{ position: 'relative', width: '100%', height: '170px', background: 'var(--bg-secondary)' }}>
                      {hasPhoto ? (
                        <img
                          src={d.media_urls[0]}
                          alt="Animal"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                          🐾
                        </div>
                      )}

                      {/* Type Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: isLost ? '#DC2626' : '#059669',
                          color: '#fff',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isLost ? '🚨 LOST' : '🟢 SIGHTED'}
                      </span>

                      {/* Status / Matches Badge */}
                      {matchCount > 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: '#FEF3C7',
                            color: '#92400E',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Sparkles size={12} />
                          <span>{matchCount} Matches</span>
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                          {d.animal_name || `${d.species} (${d.coat_color})`}
                        </h3>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {d.species}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <strong>Coat:</strong> {d.coat_color} {d.breed && `&bull; ${d.breed}`}
                      </div>

                      {d.distinctive_markings && (
                        <div style={{ fontSize: '11.5px', color: '#B45309', background: 'rgba(245, 158, 11, 0.08)', padding: '4px 8px', borderRadius: '6px', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Markings: {d.distinctive_markings}
                        </div>
                      )}

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                        <MapPin size={14} color="var(--brand-primary)" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.approx_location_name}
                        </span>
                      </div>

                      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {d.date_lost_found}
                        </span>

                        <button
                          className="btn btn-secondary"
                          onClick={() => setSelectedReport(rep)}
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateReportModal
        user={user}
        isOpen={isCreateModalOpen}
        defaultType={createModalType}
        onClose={() => setIsCreateModalOpen(false)}
        onReportCreated={fetchReports}
      />

      <ReportDetailModal
        report={selectedReport}
        user={user}
        onClose={() => setSelectedReport(null)}
        onStatusUpdated={fetchReports}
      />
    </div>
  );
}
