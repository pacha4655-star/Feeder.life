'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart,
  Home,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
  MapPin,
  Calendar,
  Loader2,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import AdoptionApplicationModal from './AdoptionApplicationModal';
import { formatFullDate } from '@/lib/utils/date';

interface AdoptionClientProps {
  user: UserSession | null;
  initialTab?: string;
  preselectedAnimalId?: string;
}

export default function AdoptionClient({
  user,
  initialTab = 'available',
  preselectedAnimalId,
}: AdoptionClientProps) {
  const [activeTab, setActiveTab] = useState<'available' | 'my_applications' | 'reviewer' | 'guide'>(
    (initialTab as any) || 'available'
  );

  // Adoptable animals list
  const [animals, setAnimals] = useState<any[]>([]);
  const [isLoadingAnimals, setIsLoadingAnimals] = useState(true);

  // Applications list
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [reviewerApplications, setReviewerApplications] = useState<any[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  // Modal State
  const [selectedAnimalForApply, setSelectedAnimalForApply] = useState<any | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Status review state
  const [reviewingAppId, setReviewingAppId] = useState<string | null>(null);
  const [reviewerNextStatus, setReviewerNextStatus] = useState('UNDER_REVIEW');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchAdoptableAnimals = async () => {
    setIsLoadingAnimals(true);
    try {
      const res = await fetch('/api/animals?adoptable=true&limit=40');
      const data = await res.json();
      if (data.success) {
        setAnimals(data.animals || []);

        if (preselectedAnimalId) {
          const found = (data.animals || []).find((a: any) => a.id === preselectedAnimalId);
          if (found) {
            setSelectedAnimalForApply(found);
            setIsApplyModalOpen(true);
          }
        }
      }
    } catch {
      setAnimals([]);
    } finally {
      setIsLoadingAnimals(false);
    }
  };

  const fetchApplications = async () => {
    if (!user) return;
    setIsLoadingApps(true);
    try {
      // My applications
      const res1 = await fetch('/api/adoption/applications?view=my_applications');
      const data1 = await res1.json();
      if (data1.success) setMyApplications(data1.applications || []);

      // Reviewer applications
      const res2 = await fetch('/api/adoption/applications?view=reviewer');
      const data2 = await res2.json();
      if (data2.success) setReviewerApplications(data2.applications || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchAdoptableAnimals();
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const handleReviewStatusSubmit = async (appId: string) => {
    if (!user) return;
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/adoption/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewerNextStatus,
          reviewerNotes: reviewerNotes.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReviewingAppId(null);
        setReviewerNotes('');
        fetchApplications();
      }
    } catch {
      // ignore
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'APPROVED':
      case 'COMPLETED':
        return '#059669';
      case 'UNDER_REVIEW':
      case 'ELIGIBILITY_REVIEW':
        return '#2563EB';
      case 'HOME_CHECK':
        return '#D97706';
      case 'REJECTED':
      case 'CANCELLED':
        return '#DC2626';
      default:
        return '#4B5563';
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* 1. Header Hero Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(236, 72, 153, 0.25)',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span
                style={{
                  background: '#DB2777',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.04em',
                }}
              >
                WELFARE & REHOMING
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Adoption & Foster Care Portal
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '640px', lineHeight: 1.4 }}>
              Give rescued street animals and shelter pets a loving permanent home or temporary foster sanctuary.
            </p>
          </div>

          <Link href="/animals" className="btn-secondary" style={{ textDecoration: 'none', gap: '6px' }}>
            <ShieldCheck size={16} color="var(--brand-primary)" />
            <span>View Animal Registry</span>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' }}>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'available' ? '#DB2777' : 'var(--bg-card)',
              color: activeTab === 'available' ? '#ffffff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'available' ? '0 2px 6px rgba(219, 39, 119, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <Heart size={16} fill={activeTab === 'available' ? '#fff' : 'none'} />
            <span>Available Animals ({animals.length})</span>
          </button>

          {user && (
            <button
              onClick={() => setActiveTab('my_applications')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'my_applications' ? 'var(--brand-primary)' : 'var(--bg-card)',
                color: activeTab === 'my_applications' ? '#ffffff' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'my_applications' ? '0 2px 6px rgba(16, 185, 129, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <FileText size={16} />
              <span>My Applications ({myApplications.length})</span>
            </button>
          )}

          {user && reviewerApplications.length > 0 && (
            <button
              onClick={() => setActiveTab('reviewer')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'reviewer' ? '#2563EB' : 'var(--bg-card)',
                color: activeTab === 'reviewer' ? '#ffffff' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeTab === 'reviewer' ? '0 2px 6px rgba(37, 99, 235, 0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <ShieldCheck size={16} />
              <span>Review Desk ({reviewerApplications.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'guide' ? '#4B5563' : 'var(--bg-card)',
              color: activeTab === 'guide' ? '#ffffff' : 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Info size={16} />
            <span>Adoption & Foster Guide</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Available Animals */}
      {activeTab === 'available' && (
        <div>
          {isLoadingAnimals ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Loader2 size={32} className="spin" color="#DB2777" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Finding adoptable companions...</div>
            </div>
          ) : animals.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '16px' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>🏡</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                No Adoptable Animals Currently Listed
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 18px auto' }}>
                All current community animals are safely in territory or placed. Check back soon or register a new rescue case for adoption!
              </p>
              <Link href="/animals" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                Browse All Animals
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '18px',
              }}
            >
              {animals.map((animal) => {
                const photo =
                  animal.avatar_url ||
                  (animal.media && animal.media[0]?.url) ||
                  'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400&auto=format&fit=crop&q=80';
                const isSterilized = animal.medical_data?.is_sterilized;
                const vaccinations = animal.medical_data?.vaccinations || [];

                return (
                  <div
                    key={animal.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '180px', background: '#F3F4F6' }}>
                      <img src={photo} alt={animal.name || 'Animal'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: 'rgba(219, 39, 119, 0.95)',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <Heart size={12} fill="#fff" />
                        <span>Ready for Home</span>
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                          {animal.name || 'Unnamed Guardian'}
                        </h3>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#DB2777', textTransform: 'capitalize' }}>
                          {animal.species}
                        </span>
                      </div>

                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        {animal.breed || 'Indie / Mix'} • {animal.profile_data?.approx_age || 'Young Adult'}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {isSterilized && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                            }}
                          >
                            ✓ Sterilized
                          </span>
                        )}
                        {vaccinations.length > 0 && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#2563EB',
                            }}
                          >
                            ✓ Vaccinated
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          marginBottom: '14px',
                          marginTop: 'auto',
                        }}
                      >
                        <MapPin size={14} color="var(--brand-primary)" />
                        <span>{animal.profile_data?.area_name || animal.city || 'Local Neighborhood'}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <Link
                          href={`/animals/${animal.id}`}
                          className="btn-secondary"
                          style={{
                            padding: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            textAlign: 'center',
                            textDecoration: 'none',
                          }}
                        >
                          Passport
                        </Link>
                        <button
                          className="btn-primary"
                          onClick={() => {
                            if (!user) {
                              window.location.href = '/login';
                            } else {
                              setSelectedAnimalForApply(animal);
                              setIsApplyModalOpen(true);
                            }
                          }}
                          style={{
                            padding: '8px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            background: '#DB2777',
                            borderColor: '#DB2777',
                          }}
                        >
                          Apply Now
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

      {/* TAB 2: My Applications */}
      {activeTab === 'my_applications' && (
        <div>
          {isLoadingApps ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Loader2 size={28} className="spin" color="var(--brand-primary)" />
            </div>
          ) : myApplications.length === 0 ? (
            <div className="card" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '16px' }}>
              <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '6px' }}>No Active Applications</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                You haven&apos;t submitted any adoption or foster care applications yet.
              </p>
              <button className="btn-primary" onClick={() => setActiveTab('available')}>
                Explore Available Animals
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {myApplications.map((app) => {
                const data = app.data || {};
                const stageColor = getStageColor(app.status);

                return (
                  <div
                    key={app.id}
                    className="card"
                    style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {data.application_type === 'FOSTER' ? 'Foster Application' : 'Adoption Application'}
                          </h3>
                          <span
                            style={{
                              background: `${stageColor}18`,
                              color: stageColor,
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {app.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          For: <strong>{data.animal_name || 'Community Animal'}</strong> ({data.animal_species}) • Submitted on {formatFullDate(app.created_at)}
                        </div>
                      </div>

                      <Link href={`/animals/${app.animal_id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>
                        View Animal Passport
                      </Link>
                    </div>

                    {/* Progress Pipeline */}
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        overflowX: 'auto',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '12px',
                      }}
                    >
                      <span style={{ color: app.status !== 'DRAFT' ? '#059669' : 'var(--text-muted)' }}>
                        ✓ 1. Submitted
                      </span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                      <span style={{ color: ['UNDER_REVIEW', 'ELIGIBILITY_REVIEW', 'HOME_CHECK', 'APPROVED', 'COMPLETED'].includes(app.status) ? '#059669' : 'var(--text-muted)' }}>
                        2. Under Review
                      </span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                      <span style={{ color: ['HOME_CHECK', 'APPROVED', 'COMPLETED'].includes(app.status) ? '#059669' : 'var(--text-muted)' }}>
                        3. Home Check
                      </span>
                      <ChevronRight size={14} color="var(--text-muted)" />
                      <span style={{ color: ['APPROVED', 'COMPLETED'].includes(app.status) ? '#059669' : 'var(--text-muted)' }}>
                        4. Final Approval
                      </span>
                    </div>

                    {data.reviewer_notes && (
                      <div style={{ background: '#EFF6FF', color: '#1E40AF', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
                        <strong>Reviewer Feedback:</strong> {data.reviewer_notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Reviewer Desk */}
      {activeTab === 'reviewer' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '14px' }}>
            Incoming Adoption & Foster Inquiries ({reviewerApplications.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviewerApplications.map((app) => {
              const data = app.data || {};
              const stageColor = getStageColor(app.status);
              const isEditing = reviewingAppId === app.id;

              return (
                <div
                  key={app.id}
                  className="card"
                  style={{ padding: '20px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                          {data.applicant_name}
                        </h3>
                        <span
                          style={{
                            background: `${stageColor}18`,
                            color: stageColor,
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Inquiring for: <strong>{data.animal_name}</strong> • Phone: {data.applicant_phone} • Email: {data.applicant_email}
                      </div>
                    </div>

                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setReviewingAppId(app.id);
                        setReviewerNextStatus(app.status);
                        setReviewerNotes(data.reviewer_notes || '');
                      }}
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                    >
                      Update Stage
                    </button>
                  </div>

                  {/* Applicant Questionnaire Summary */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '10px',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      fontSize: '12.5px',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Housing:</strong> {data.housing_type} ({data.landlord_pet_policy})
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>City / Area:</strong> {data.city}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Existing Pets:</strong> {data.existing_pets}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Home Check Consent:</strong> {data.home_check_ready ? '✓ Yes' : 'No'}
                    </div>
                  </div>

                  {data.pet_experience && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <strong>Experience & Notes:</strong> {data.pet_experience}
                    </div>
                  )}

                  {/* Stage Update Form */}
                  {isEditing && (
                    <div style={{ marginTop: '14px', padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Update Application Stage</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
                        <select
                          className="input"
                          value={reviewerNextStatus}
                          onChange={(e) => setReviewerNextStatus(e.target.value)}
                        >
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="ELIGIBILITY_REVIEW">Eligibility Screening</option>
                          <option value="HOME_CHECK">Home Check Scheduled</option>
                          <option value="APPROVED">Approved for Adoption / Foster</option>
                          <option value="REJECTED">Application Rejected</option>
                          <option value="COMPLETED">Placement Completed</option>
                        </select>
                        <input
                          type="text"
                          className="input"
                          placeholder="Reviewer notes or feedback for the applicant..."
                          value={reviewerNotes}
                          onChange={(e) => setReviewerNotes(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn-secondary" onClick={() => setReviewingAppId(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleReviewStatusSubmit(app.id)}
                          disabled={isUpdatingStatus}
                        >
                          {isUpdatingStatus ? 'Saving...' : 'Save Stage Update'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Adoption Guide */}
      {activeTab === 'guide' && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
            Responsible Adoption & Foster Protocol
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
            <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>
                1. Full Vaccination & Sterilization Guarantee
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                Every animal adopted through Feeder.life should have verified digital passport records indicating Anti-Rabies (ARV), DHPPi, and ABC Sterilization status.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#2563EB', marginBottom: '4px' }}>
                2. Home Safety & Trial Foster Period
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                We recommend a 1-to-2 week trial foster phase to ensure temperament compatibility with existing pets and family members before formalizing legal adoption.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'rgba(236, 72, 153, 0.08)', borderRadius: '12px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#DB2777', marginBottom: '4px' }}>
                3. Post-Adoption Check-ins & Lifelong Support
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                Feeder.life volunteer guardians remain available for dietary advice, vet referrals, and behavioral guidance throughout the pet&apos;s lifetime.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Adoption Application Modal */}
      {selectedAnimalForApply && (
        <AdoptionApplicationModal
          user={user}
          animal={selectedAnimalForApply}
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setSelectedAnimalForApply(null);
          }}
          onSubmitted={() => {
            setActiveTab('my_applications');
            fetchApplications();
          }}
        />
      )}
    </div>
  );
}
