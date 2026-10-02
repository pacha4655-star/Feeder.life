'use client';

import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Phone,
  MessageSquare,
  Loader2,
  Info,
  Check,
  ChevronRight,
} from 'lucide-react';
import type { LostFoundRecord, MatchCandidate } from '@/lib/services/lost-found-matcher';
import type { UserSession } from '@/lib/auth/session';
import { formatFullDate } from '@/lib/utils/date';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface ReportDetailModalProps {
  report: LostFoundRecord | null;
  user: UserSession | null;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export default function ReportDetailModal({
  report,
  user,
  onClose,
  onStatusUpdated,
}: ReportDetailModalProps) {
  useBodyScrollLock(!!report);

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'MATCHES'>('DETAILS');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  if (!report) return null;

  const data = report.data || {};
  const isOwnerOrStaff =
    user &&
    (user.id === report.user_id ||
      user.role === 'PLATFORM_ADMIN' ||
      user.role === 'PLATFORM_MODERATOR');

  const matches: MatchCandidate[] = Array.isArray(data.matches) ? data.matches : [];

  const handleMatchAction = async (
    candidateId: string,
    action: 'CONFIRM' | 'REJECT' | 'REPORT_INCORRECT'
  ) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setIsSubmittingAction(true);
    setActionMessage('');

    try {
      const res = await fetch(`/api/lost-found/${report.id}/match-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          action,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setActionMessage(resData.message || 'Updated candidate status');
        onStatusUpdated();
      }
    } catch {
      setActionMessage('Failed to update match action.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div
          className="modal-header"
          style={{
            background:
              data.report_type === 'LOST'
                ? 'linear-gradient(90deg, #FEE2E2 0%, #FECACA 100%)'
                : 'linear-gradient(90deg, #DCFCE7 0%, #BBF7D0 100%)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '6px',
                background: data.report_type === 'LOST' ? '#DC2626' : '#059669',
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              {data.report_type === 'LOST' ? '🚨 LOST PET' : '🟢 SIGHTED / FOUND'}
            </span>
            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
              {data.animal_name || `${data.species} (${data.coat_color})`}
            </span>
          </div>

          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderBottom: activeTab === 'DETAILS' ? '2px solid var(--brand-primary)' : 'none',
              background: 'none',
              fontWeight: activeTab === 'DETAILS' ? 800 : 600,
              color: activeTab === 'DETAILS' ? 'var(--brand-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Report Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MATCHES')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderBottom: activeTab === 'MATCHES' ? '2px solid var(--brand-primary)' : 'none',
              background: 'none',
              fontWeight: activeTab === 'MATCHES' ? 800 : 600,
              color: activeTab === 'MATCHES' ? 'var(--brand-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} color="#D97706" />
            <span>Potential Matches ({matches.length})</span>
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
          {actionMessage && (
            <div style={{ padding: '10px 14px', background: '#DCFCE7', color: '#166534', borderRadius: '8px', fontSize: '12.5px', marginBottom: '14px' }}>
              {actionMessage}
            </div>
          )}

          {activeTab === 'DETAILS' ? (
            <div>
              {/* Photo Showcase */}
              {data.media_urls && data.media_urls.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
                  {data.media_urls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Animal"
                      style={{
                        height: '180px',
                        width: '220px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    height: '120px',
                    borderRadius: '12px',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    marginBottom: '16px',
                  }}
                >
                  🐾 No photos provided for this sighting.
                </div>
              )}

              {/* Attributes Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  fontSize: '12.5px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Species:</span> <strong>{data.species}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Breed:</span> <strong>{data.breed || 'Unknown / Indie'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Coat:</span> <strong>{data.coat_color}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Gender:</span> <strong>{data.gender || 'Unknown'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Age:</span> <strong>{data.approx_age || 'Unknown'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong>{data.date_lost_found}</strong>
                </div>
              </div>

              {/* Distinctive Features */}
              {data.distinctive_markings && (
                <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                  <strong style={{ fontSize: '12.5px', color: '#92400E', display: 'block', marginBottom: '2px' }}>
                    Distinctive Markings & Collar:
                  </strong>
                  <span style={{ fontSize: '13px', color: '#78350F' }}>{data.distinctive_markings}</span>
                </div>
              )}

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Detailed Description & Context
                </h4>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {data.description}
                </p>
              </div>

              {/* Location & Safety Guarantee */}
              <div
                style={{
                  padding: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <MapPin size={18} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px' }}>
                  <strong>Reported Location:</strong> {data.approx_location_name}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Exact GPS coordinates shielded to protect animal safety.
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(5, 150, 105, 0.06)',
                  borderRadius: '10px',
                  border: '1px solid #A7F3D0',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
                  Guardian Contact Protocol
                </div>
                <div style={{ fontSize: '12px', color: '#047857' }}>
                  Reporter: <strong>{data.reporter_name || 'Community Guardian'}</strong> &bull; Contact Preference: <strong>{data.contact_preference}</strong>
                  {data.contact_phone && data.contact_preference === 'PHONE_ON_REQUEST' && (
                    <div style={{ marginTop: '4px', fontWeight: 700 }}>
                      📞 Phone / WhatsApp: {data.contact_phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* POTENTIAL MATCHES TAB */
            <div>
              {/* Mandatory Safety Notice */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid #FCD34D',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11.5px', color: '#92400E', lineHeight: 1.4 }}>
                  <strong>Potential Match Advisory:</strong> Similarity algorithms suggest potential matches based on species, coat colors, markings, and geographic radius. Never assume automatic identification without physical inspection by the guardian.
                </div>
              </div>

              {matches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  <Sparkles size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                  <div>No candidate matches found yet for this report.</div>
                  <div style={{ fontSize: '11.5px', marginTop: '4px' }}>
                    As more community sightings are reported, new candidate alerts will appear here automatically.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {matches.map((cand, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-card)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#D97706',
                              background: '#FEF3C7',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {cand.similarity_score}% Match Score
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {cand.confidence_label}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background:
                              cand.status === 'CONFIRMED'
                                ? '#DCFCE7'
                                : cand.status === 'REJECTED'
                                ? '#FEE2E2'
                                : 'var(--bg-secondary)',
                            color:
                              cand.status === 'CONFIRMED'
                                ? '#166534'
                                : cand.status === 'REJECTED'
                                ? '#991B1B'
                                : 'var(--text-muted)',
                          }}
                        >
                          Status: {cand.status}
                        </span>
                      </div>

                      {/* Reasons */}
                      <ul style={{ margin: '0 0 12px 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {cand.match_reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>

                      {/* Actions */}
                      {isOwnerOrStaff && cand.status === 'SUGGESTED' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleMatchAction(cand.candidate_id, 'REJECT')}
                            disabled={isSubmittingAction}
                            style={{ padding: '6px 12px', fontSize: '11.5px', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Reject Match
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMatchAction(cand.candidate_id, 'REPORT_INCORRECT')}
                            disabled={isSubmittingAction}
                            style={{ padding: '6px 12px', fontSize: '11.5px', background: 'none', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Report Incorrect
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMatchAction(cand.candidate_id, 'CONFIRM')}
                            disabled={isSubmittingAction}
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '11.5px', background: '#059669', borderColor: '#059669' }}
                          >
                            ✓ Confirm Match & Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
