'use client';

import React, { useState, useEffect } from 'react';
import SOSModal from './SOSModal';
import {
  AlertTriangle,
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import type { SosCaseView } from '@/lib/services/sos';
import { formatTime } from '@/lib/utils/date';

interface SOSClientProps {
  user: UserSession | null;
}

export default function SOSClient({ user }: SOSClientProps) {
  const [cases, setCases] = useState<SosCaseView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [activeUpdateModalId, setActiveUpdateModalId] = useState<string | null>(null);
  const [updateNote, setUpdateNote] = useState('');
  const [nextStatus, setNextStatus] = useState<string>('RESOLVED');

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sos');
      const data = await res.json();
      if (data.success) {
        setCases(data.cases || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleRespond = async (caseId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch(`/api/sos/${caseId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Volunteered to assist via Feeder.life SOS desk' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCases();
      }
    } catch {}
  };

  const handleUpdateStatus = async (caseId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch(`/api/sos/${caseId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note: updateNote }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveUpdateModalId(null);
        setUpdateNote('');
        fetchCases();
      }
    } catch {}
  };

  const filteredCases = cases.filter((c) => {
    if (statusFilter === 'ACTIVE') return c.status !== 'RESOLVED' && c.status !== 'CLOSED';
    if (statusFilter === 'RESOLVED') return c.status === 'RESOLVED' || c.status === 'CLOSED';
    return true;
  });

  return (
    <div>
      {/* 1. Header Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid #fecdd3',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-sos)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle />
              <span>Emergency Animal SOS Desk</span>
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Peer-to-peer animal distress alerts, volunteer triage, and emergency response coordination.
            </p>
          </div>

          <button className="btn-danger" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Report Animal SOS</span>
          </button>
        </div>

        {/* Status Filter Chips */}
        <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0 }}>
          {[
            { id: 'ACTIVE', label: '🔥 Active Emergencies' },
            { id: 'RESOLVED', label: '✅ Resolved Cases' },
            { id: 'ALL', label: 'All Cases' },
          ].map((f) => (
            <button
              key={f.id}
              className={`feed-filter-chip ${statusFilter === f.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.id as any)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. SOS Cases List */}
      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading active emergencies...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>No active SOS cases.</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
            All community animals in your area are currently safe and monitored.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredCases.map((c) => (
            <div key={c.id} className="card sos-emergency-card" style={{ padding: '20px' }} id={c.id}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`badge-urgency ${c.urgency.toLowerCase()}`}>{c.urgency} URGENCY</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background:
                        c.status === 'RESOLVED' ? '#d1fae5' : c.status === 'RESPONDING' ? '#fef3c7' : '#fee2e2',
                      color:
                        c.status === 'RESOLVED' ? '#065f46' : c.status === 'RESPONDING' ? '#b45309' : '#b91c1c',
                    }}
                  >
                    STATUS: {c.status}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} />
                  <span>{formatTime(c.created_at)}</span>
                </div>
              </div>

              {/* Title & Description */}
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                {c.title}
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                🐾 Target: <strong>{c.animal_type}</strong> &bull; 📍 Approx: <strong>{c.approx_location_name}</strong>
              </div>
              <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--text-main)' }}>{c.description}</p>

              {/* Photo preview */}
              {c.media_urls && c.media_urls.length > 0 && (
                <img
                  src={c.media_urls[0]}
                  alt=""
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '8px', marginTop: '12px' }}
                />
              )}

              {/* Responders Row & Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  marginTop: '14px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <Users size={16} color="var(--brand-primary)" />
                  <span>
                    <strong>{c.responder_count}</strong> volunteers active on this case
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={`/sos/${c.id}`}
                    className="btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <ArrowRight size={14} />
                    <span>Case Hub</span>
                  </a>

                  {user && user.id !== c.reporter_id && (
                    <a
                      href={`/messages?user=${c.reporter_id}`}
                      className="btn-secondary"
                      style={{ padding: '7px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <MessageSquare size={14} />
                      <span>Message Reporter</span>
                    </a>
                  )}

                  {c.status !== 'RESOLVED' && (
                    <>
                      <button
                        onClick={() => handleRespond(c.id)}
                        className={c.is_user_responding ? 'btn-secondary' : 'btn-primary'}
                        style={{ padding: '7px 16px', fontSize: '13px' }}
                        disabled={c.is_user_responding}
                      >
                        {c.is_user_responding ? '✓ Responding' : '🙋 I Can Help'}
                      </button>

                      <button
                        onClick={() => setActiveUpdateModalId(c.id)}
                        className="btn-secondary"
                        style={{ padding: '7px 14px', fontSize: '13px' }}
                      >
                        Update Status
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline of Updates */}
              {c.updates && c.updates.length > 0 && (
                <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Response Audit & Progress
                  </div>
                  {c.updates.map((u) => (
                    <div key={u.id} style={{ fontSize: '12.5px', marginBottom: '4px' }}>
                      <strong>{u.user_name}:</strong> {u.update_text}{' '}
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                        ({formatTime(u.created_at)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SOS Creation Wizard Modal */}
      <SOSModal
        user={user}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSosCreated={fetchCases}
      />

      {/* SOS Status Update Modal */}
      {activeUpdateModalId && (
        <div className="modal-overlay" onClick={() => setActiveUpdateModalId(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Update SOS Emergency Status</div>
              <button className="modal-close-btn" onClick={() => setActiveUpdateModalId(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select
                  className="form-select"
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                >
                  <option value="RESPONDING">🟡 Responding (Volunteer en route / with animal)</option>
                  <option value="RESOLVED">🟢 Resolved (Animal treated, stabilized, or admitted)</option>
                  <option value="CLOSED">⚪ Closed (Handed over to official authority)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Update Note (What was done?)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Wound cleaned and dressed with Betadine. Dog given fresh water and is resting safely..."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setActiveUpdateModalId(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleUpdateStatus(activeUpdateModalId)}
              >
                Save Status Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
