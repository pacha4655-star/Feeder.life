'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle2,
  Users,
  MessageSquare,
  ArrowLeft,
  Navigation,
  Send,
  Plus,
  Loader2,
  Camera,
  Share2,
  Check,
  Info,
  Phone,
  HelpCircle,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import type { SosCaseView, SosResponderInfo, SosUpdateItem } from '@/lib/services/sos';
import FeederAvatar from '@/components/common/FeederAvatar';
import { formatFullDate, formatTime } from '@/lib/utils/date';

interface SOSCaseDetailProps {
  initialCase: SosCaseView;
  user: UserSession | null;
}

export default function SOSCaseDetail({ initialCase, user }: SOSCaseDetailProps) {
  const [sosCase, setSosCase] = useState<SosCaseView>(initialCase);
  const [copiedLink, setCopiedLink] = useState(false);

  // Volunteer Response Modal
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [responderStatus, setResponderStatus] = useState<
    'RESPONDING' | 'ON_THE_WAY' | 'ARRIVED' | 'TREATMENT_IN_PROGRESS'
  >('RESPONDING');
  const [etaNotes, setEtaNotes] = useState('En route, ETA 20 mins');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Add Update Modal
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updatePhotoUrl, setUpdatePhotoUrl] = useState('');
  const [statusChange, setStatusChange] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Resolve Case Modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionType, setResolutionType] = useState('Treated & Released');
  const [destination, setDestination] = useState('On-site pack territory');
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const fetchFreshCase = async () => {
    try {
      const res = await fetch(`/api/sos/${sosCase.id}`);
      const data = await res.json();
      if (data.success && data.case) {
        setSosCase(data.case);
      }
    } catch {}
  };

  const isReporterOrStaff =
    user &&
    (user.id === sosCase.reporter_id ||
      user.role === 'PLATFORM_ADMIN' ||
      user.role === 'PLATFORM_MODERATOR');

  const isUserResponding = sosCase.is_user_responding;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleRespondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setIsSubmittingResponse(true);

    try {
      const res = await fetch(`/api/sos/${sosCase.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderStatus,
          etaNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRespondModalOpen(false);
        fetchFreshCase();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleAddUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !updateText.trim()) return;
    setIsSubmittingUpdate(true);

    try {
      const res = await fetch(`/api/sos/${sosCase.id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: updateText.trim(),
          photoUrl: updatePhotoUrl || undefined,
          statusChange: statusChange || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsUpdateModalOpen(false);
        setUpdateText('');
        setUpdatePhotoUrl('');
        fetchFreshCase();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingResolve(true);

    try {
      const res = await fetch(`/api/sos/${sosCase.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionType,
          destination,
          note: resolveNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsResolveModalOpen(false);
        fetchFreshCase();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const steps = [
    { key: 'OPEN', label: '1. Open' },
    { key: 'RESPONDING', label: '2. Responding' },
    { key: 'ON_THE_WAY', label: '3. En Route' },
    { key: 'ARRIVED', label: '4. On Site' },
    { key: 'TREATMENT_IN_PROGRESS', label: '5. Treatment' },
    { key: 'RESOLVED', label: '6. Resolved' },
  ];

  const getStepIndex = (st: string) => {
    const idx = steps.findIndex((s) => s.key === st);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = getStepIndex(sosCase.status);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Top Nav */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/sos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            fontSize: '13.5px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Live SOS Desk</span>
        </Link>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px' }}
          >
            <Share2 size={14} />
            <span>{copiedLink ? 'Link Copied!' : 'Share Alert'}</span>
          </button>

          {isReporterOrStaff && sosCase.status !== 'RESOLVED' && sosCase.status !== 'CLOSED' && (
            <button
              onClick={() => setIsResolveModalOpen(true)}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '12.5px', background: '#059669', borderColor: '#059669' }}
            >
              <CheckCircle2 size={14} />
              <span>Mark Resolved</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Incident Header Card */}
      <div
        className="card"
        style={{
          borderRadius: '18px',
          overflow: 'hidden',
          border: sosCase.urgency === 'CRITICAL' ? '2px solid #EF4444' : '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        {/* Urgent Emergency Banner */}
        <div
          style={{
            background:
              sosCase.urgency === 'CRITICAL'
                ? 'linear-gradient(90deg, #DC2626 0%, #991B1B 100%)'
                : sosCase.urgency === 'HIGH'
                ? 'linear-gradient(90deg, #EA580C 0%, #C2410C 100%)'
                : 'linear-gradient(90deg, #D97706 0%, #B45309 100%)',
            padding: '12px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} className={sosCase.urgency === 'CRITICAL' ? 'pulse-sos' : ''} />
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {sosCase.urgency} SOS EMERGENCY • {sosCase.emergency_type.replace('_', ' ')}
            </span>
          </div>
          <span style={{ fontSize: '11.5px', opacity: 0.9 }}>
            Reported {formatFullDate(sosCase.created_at)}
          </span>
        </div>

        {/* Case Body Layout */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                {sosCase.title}
              </h1>
              <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Animal: <strong style={{ color: 'var(--text-primary)' }}>{sosCase.animal_type}</strong></span>
                <span>•</span>
                <span>Contact: <strong>{sosCase.contact_preference}</strong></span>
              </div>
            </div>

            {/* Current Status Pill */}
            <div
              style={{
                background:
                  sosCase.status === 'RESOLVED'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : sosCase.status === 'OPEN'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(59, 130, 246, 0.12)',
                color:
                  sosCase.status === 'RESOLVED'
                    ? '#059669'
                    : sosCase.status === 'OPEN'
                    ? '#DC2626'
                    : '#2563EB',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '13px',
                textTransform: 'uppercase',
              }}
            >
              Status: {sosCase.status.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
            {sosCase.description}
          </p>

          {/* Photos Grid */}
          {sosCase.media_urls.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {sosCase.media_urls.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#F3F4F6',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  }}
                >
                  <img src={url} alt="SOS Incident" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          {/* Location Details */}
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={20} color="var(--brand-sos)" />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {sosCase.approx_location_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Location verified by emergency reporter.
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: '11.5px',
                color: '#1E40AF',
                background: 'rgba(59, 130, 246, 0.08)',
                padding: '4px 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Info size={14} />
              <span>Exact GPS coordinates shielded for safety</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Status Stepper Tracker */}
      <div
        className="card"
        style={{
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
          Rescue & Emergency Lifecycle
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', overflowX: 'auto', paddingBottom: '6px' }}>
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '100px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCurrent ? 'var(--brand-sos)' : isCompleted ? '#059669' : 'var(--bg-secondary)',
                    color: isCompleted || isCurrent ? '#ffffff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    marginBottom: '6px',
                    boxShadow: isCurrent ? '0 0 0 3px rgba(220, 38, 38, 0.2)' : 'none',
                  }}
                >
                  {isCompleted && !isCurrent ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--brand-sos)' : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Live Responders Section */}
      <div
        className="card"
        style={{
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Committed Responders ({sosCase.responders.length})
            </h3>
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              if (!user) window.location.href = '/login';
              else setIsRespondModalOpen(true);
            }}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: isUserResponding ? '#0ea5e9' : 'var(--brand-sos)',
              borderColor: isUserResponding ? '#0ea5e9' : 'var(--brand-sos)',
            }}
          >
            <Navigation size={16} />
            <span>{isUserResponding ? 'Update My ETA / Status' : 'I Can Respond / Assist'}</span>
          </button>
        </div>

        {sosCase.responders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
            No volunteer responders have committed yet. If you are nearby, click &quot;I Can Respond / Assist&quot; to share your ETA.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {sosCase.responders.map((res, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <FeederAvatar src={res.user_avatar} alt={res.user_name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {res.user_name}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#0284C7', fontWeight: 600 }}>
                    {res.status.replace(/_/g, ' ')}
                  </div>
                  {res.eta_notes && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      &ldquo;{res.eta_notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Chronological Case Timeline & Updates */}
      <div
        className="card"
        style={{
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
              Chronological Case Updates ({sosCase.updates.length})
            </h3>
          </div>

          <button
            className="btn-secondary"
            onClick={() => {
              if (!user) window.location.href = '/login';
              else setIsUpdateModalOpen(true);
            }}
            style={{ padding: '6px 12px', fontSize: '12.5px', gap: '4px' }}
          >
            <Plus size={14} /> Add On-Site Update
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sosCase.updates.map((upd, idx) => (
            <div
              key={upd.id || idx}
              style={{
                display: 'flex',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: idx !== sosCase.updates.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {idx + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {upd.user_name || 'Volunteer'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {formatTime(upd.created_at)}
                  </span>
                </div>

                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                  {upd.update_text}
                </p>

                {upd.photo_url && (
                  <img
                    src={upd.photo_url}
                    alt="Update proof"
                    style={{ width: '120px', height: '120px', borderRadius: '10px', objectFit: 'cover' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Resolution Card (if resolved) */}
      {sosCase.resolution && (
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '16px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid #A7F3D0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle2 size={20} color="#059669" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#065F46', margin: 0 }}>
              Case Resolution Audit Record
            </h3>
          </div>
          <div style={{ fontSize: '13.5px', color: '#047857', lineHeight: 1.5 }}>
            <div><strong>Resolution:</strong> {sosCase.resolution.resolution_type}</div>
            <div><strong>Destination:</strong> {sosCase.resolution.destination}</div>
            <div><strong>Resolved By:</strong> {sosCase.resolution.resolved_by} on {formatFullDate(sosCase.resolution.resolved_at)}</div>
            {sosCase.resolution.notes && <p style={{ marginTop: '6px' }}>&ldquo;{sosCase.resolution.notes}&rdquo;</p>}
          </div>
        </div>
      )}

      {/* Modal: Volunteer Response & ETA */}
      {isRespondModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRespondModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '14px' }}>
              Volunteer Responder Commitment
            </h3>
            <form onSubmit={handleRespondSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Your Current State
                </label>
                <select
                  className="input"
                  value={responderStatus}
                  onChange={(e) => setResponderStatus(e.target.value as any)}
                >
                  <option value="RESPONDING">Responding (Committed to help)</option>
                  <option value="ON_THE_WAY">En Route (On the way)</option>
                  <option value="ARRIVED">Arrived on site</option>
                  <option value="TREATMENT_IN_PROGRESS">Treatment / First Aid in Progress</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  ETA / Role Note
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Bringing rescue crate, ETA 15 mins"
                  value={etaNotes}
                  onChange={(e) => setEtaNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsRespondModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmittingResponse}>
                  {isSubmittingResponse ? 'Updating...' : 'Commit Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Case Update */}
      {isUpdateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUpdateModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '14px' }}>
              Add On-Site Case Update
            </h3>
            <form onSubmit={handleAddUpdateSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Update Note *
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. Animal secured safely, bleeding stopped, transporting to CUPA clinic..."
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Update Status (Optional)
                </label>
                <select
                  className="input"
                  value={statusChange}
                  onChange={(e) => setStatusChange(e.target.value)}
                >
                  <option value="">Keep current status ({sosCase.status})</option>
                  <option value="ON_THE_WAY">En Route</option>
                  <option value="ARRIVED">Arrived On Site</option>
                  <option value="TREATMENT_IN_PROGRESS">Treatment In Progress</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsUpdateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmittingUpdate}>
                  {isSubmittingUpdate ? 'Saving...' : 'Post Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Case */}
      {isResolveModalOpen && (
        <div className="modal-overlay" onClick={() => setIsResolveModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '14px' }}>
              Resolve Emergency Case
            </h3>
            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Resolution Type
                </label>
                <select
                  className="input"
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                >
                  <option value="Treated & Released">Treated & Released to Territory</option>
                  <option value="Admitted to Vet Clinic">Admitted to Vet Clinic / Hospital</option>
                  <option value="Transferred to Shelter">Transferred to Animal Shelter</option>
                  <option value="Placed in Foster Care">Placed in Foster Care</option>
                  <option value="Deceased">Deceased / Safe Burial Provided</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Destination / Clinic Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. CUPA Hebbal Clinic / Sector 4 Territory"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Resolution Notes
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Summary of treatment given, follow-up dates, or guardian notes..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsResolveModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingResolve}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  {isSubmittingResolve ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
