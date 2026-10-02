'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Heart,
  Calendar,
  MapPin,
  Utensils,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Share2,
  Edit,
  Info,
  Clock,
  User,
  Loader2,
  Activity,
  FileText,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import FeederAvatar from '@/components/common/FeederAvatar';
import { formatFullDate, formatTime } from '@/lib/utils/date';

interface AnimalPassportClientProps {
  initialAnimal: any;
  user: UserSession | null;
}

export default function AnimalPassportClient({
  initialAnimal,
  user,
}: AnimalPassportClientProps) {
  const [animal, setAnimal] = useState(initialAnimal);
  const [activeTab, setActiveTab] = useState<'HEALTH' | 'FEEDING' | 'PHOTOS' | 'ABOUT'>('HEALTH');
  const [copiedLink, setCopiedLink] = useState(false);

  // Add Medical/Vaccine Modal
  const [isAddVaccineOpen, setIsAddVaccineOpen] = useState(false);
  const [vaccineName, setVaccineName] = useState('Anti-Rabies (ARV)');
  const [vaccineDate, setVaccineDate] = useState(new Date().toISOString().split('T')[0]);
  const [vaccineNextDue, setVaccineNextDue] = useState('');
  const [vaccineClinic, setVaccineClinic] = useState('');
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState('');

  // Status Update Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(animal?.status || 'active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!animal) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 12px auto' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Animal Record Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          This passport may have been removed or moved.
        </p>
        <Link href="/animals" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          Back to Animal Registry
        </Link>
      </div>
    );
  }

  const isAuthorOrAdmin =
    user &&
    (user.id === animal.created_by ||
      user.role === 'PLATFORM_ADMIN' ||
      user.role === 'PLATFORM_MODERATOR');

  const medicalData = animal.medical_data || {};
  const vaccinations: any[] = medicalData.vaccinations || [];
  const feedingData = animal.feeding_data || {};
  const profileData = animal.profile_data || {};
  const adoptionData = animal.adoption_data || {};
  const mediaList: any[] = Array.isArray(animal.media) ? animal.media : [];

  const mainPhoto =
    animal.avatar_url ||
    (mediaList[0]?.url ? mediaList[0].url : '') ||
    'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80';

  const handleCopyShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleAddVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingRecord(true);
    setRecordError('');

    try {
      const updatedVaccinations = [
        ...vaccinations,
        {
          name: vaccineName.trim(),
          date: vaccineDate,
          nextDue: vaccineNextDue,
          clinic: vaccineClinic.trim(),
          administered_by: user.fullName,
          added_at: new Date().toISOString(),
        },
      ];

      const updatedMedicalData = {
        ...medicalData,
        vaccinations: updatedVaccinations,
      };

      const res = await fetch(`/api/animals/${animal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalData: updatedMedicalData }),
      });

      const data = await res.json();
      if (data.success && data.animal) {
        setAnimal(data.animal);
        setIsAddVaccineOpen(false);
        setVaccineClinic('');
        setVaccineNextDue('');
      } else {
        setRecordError(data.error || 'Failed to update medical record');
      }
    } catch {
      setRecordError('Failed to save record.');
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingStatus(true);

    try {
      const res = await fetch(`/api/animals/${animal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });

      const data = await res.json();
      if (data.success && data.animal) {
        setAnimal(data.animal);
        setIsStatusModalOpen(false);
      }
    } catch {
      // ignore
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Top Back Nav */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          href="/animals"
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
          <span>Back to Animal Registry</span>
        </Link>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopyShare}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px' }}
          >
            <Share2 size={14} />
            <span>{copiedLink ? 'Link Copied!' : 'Share Passport'}</span>
          </button>

          {isAuthorOrAdmin && (
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12.5px', gap: '6px' }}
            >
              <Edit size={14} />
              <span>Update Status</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Digital Passport Identity Header Card */}
      <div
        className="card"
        style={{
          borderRadius: '18px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        {/* Top Passport Brand Banner */}
        <div
          style={{
            background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
            padding: '12px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} />
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Feeder.life Digital Animal Passport
            </span>
          </div>
          <span style={{ fontSize: '11px', opacity: 0.9, fontFamily: 'monospace' }}>
            ID: {animal.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Profile Details Layout */}
        <div style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* Animal Image */}
          <div
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '16px',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#F3F4F6',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <img src={mainPhoto} alt={animal.name || 'Animal'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* Core Info */}
          <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {animal.name || 'Unnamed Guardian'}
              </h1>
              <span
                style={{
                  background:
                    animal.status === 'active'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : animal.status === 'rescued'
                      ? 'rgba(59, 130, 246, 0.12)'
                      : animal.status === 'fostered'
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'rgba(107, 114, 128, 0.12)',
                  color:
                    animal.status === 'active'
                      ? '#059669'
                      : animal.status === 'rescued'
                      ? '#2563EB'
                      : animal.status === 'fostered'
                      ? '#D97706'
                      : '#4B5563',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                {animal.status === 'active' ? 'Community Stray' : animal.status}
              </span>

              {adoptionData.is_adoptable && (
                <span
                  style={{
                    background: '#FDF2F8',
                    color: '#DB2777',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Heart size={12} fill="#DB2777" /> Adoptable
                </span>
              )}
            </div>

            <div style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{animal.species}</strong> • {animal.breed || 'Indie / Mix'} • {animal.sex || 'Unknown sex'} • {profileData.approx_age || 'Adult'}
            </div>

            {/* Quick Passport Attributes Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Sterilization (ABC)</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: medicalData.is_sterilized ? '#059669' : '#DC2626' }}>
                  {medicalData.is_sterilized ? '✓ Spayed / Neutered' : 'Not Sterilized'}
                </div>
              </div>

              <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Vaccine Count</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB' }}>
                  {vaccinations.length} Recorded
                </div>
              </div>

              <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Registered By</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {animal.users?.display_name || 'Feeder Volunteer'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: 'auto' }}>
              {adoptionData.is_adoptable && (
                <Link
                  href={`/adoption?animalId=${animal.id}`}
                  className="btn-primary"
                  style={{
                    textDecoration: 'none',
                    padding: '8px 16px',
                    fontSize: '13px',
                    background: '#DB2777',
                    borderColor: '#DB2777',
                  }}
                >
                  <Heart size={16} fill="#fff" />
                  <span>Apply to Adopt / Foster</span>
                </Link>
              )}

              {isAuthorOrAdmin && (
                <button
                  className="btn-primary"
                  onClick={() => setIsAddVaccineOpen(true)}
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                >
                  <Plus size={16} />
                  <span>Add Medical / Vaccine Record</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Privacy Safe Location Card */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Territory: {profileData.area_name || animal.city || 'Local Neighborhood'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              City: {animal.city || 'Not specified'} • Location verified by local feeder community.
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: '11.5px',
            color: '#1E40AF',
            background: 'rgba(59, 130, 246, 0.08)',
            padding: '6px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Info size={14} />
          <span>Exact GPS Shielded for Animal Safety</span>
        </div>
      </div>

      {/* 3. Tabbed Details: Medical, Feeding, Photos, About */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
        <button
          onClick={() => setActiveTab('HEALTH')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'HEALTH' ? '2.5px solid var(--brand-primary)' : '2.5px solid transparent',
            color: activeTab === 'HEALTH' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'HEALTH' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} /> Medical & Vaccines
        </button>

        <button
          onClick={() => setActiveTab('FEEDING')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'FEEDING' ? '2.5px solid var(--brand-primary)' : '2.5px solid transparent',
            color: activeTab === 'FEEDING' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'FEEDING' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Utensils size={16} /> Feeding & Spot
        </button>

        <button
          onClick={() => setActiveTab('ABOUT')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'ABOUT' ? '2.5px solid var(--brand-primary)' : '2.5px solid transparent',
            color: activeTab === 'ABOUT' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'ABOUT' ? 800 : 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FileText size={16} /> Notes & Behavior
        </button>
      </div>

      {/* Tab Content 1: Medical & Vaccines */}
      {activeTab === 'HEALTH' && (
        <div>
          {/* Sterilization Details */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Sterilization / Animal Birth Control (ABC) Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: medicalData.is_sterilized ? '#059669' : '#DC2626' }}>
                  {medicalData.is_sterilized ? 'Sterilized (Spayed / Neutered)' : 'Not Sterilized'}
                </div>
              </div>
              {medicalData.sterilization_date && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Date of Surgery:</span>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{medicalData.sterilization_date}</div>
                </div>
              )}
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ear Notch Indicator:</span>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                  {medicalData.has_ear_notch ? '✓ Ear Notch present' : 'No ear notch'}
                </div>
              </div>
            </div>
          </div>

          {/* Vaccination History Table */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Vaccination Passport ({vaccinations.length})
              </h3>
              {isAuthorOrAdmin && (
                <button
                  className="btn-secondary"
                  onClick={() => setIsAddVaccineOpen(true)}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Plus size={14} /> Add Record
                </button>
              )}
            </div>

            {vaccinations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
                No vaccination records added yet. Click &quot;Add Record&quot; to log Anti-Rabies or DHPPi doses.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 8px' }}>Vaccine Name</th>
                      <th style={{ padding: '10px 8px' }}>Administered Date</th>
                      <th style={{ padding: '10px 8px' }}>Next Due</th>
                      <th style={{ padding: '10px 8px' }}>Clinic / Doctor</th>
                      <th style={{ padding: '10px 8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccinations.map((vac, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {vac.name}
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                          {vac.date || 'Not recorded'}
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                          {vac.nextDue || '—'}
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                          {vac.clinic || 'Community Drive'}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
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
                            Verified
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Feeding & Spot */}
      {activeTab === 'FEEDING' && (
        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
            Feeding Protocol & Volunteer Roster
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Assigned Feeding Spot:</span>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {feedingData.feeding_spot || 'Community territory spot'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dietary Preferences:</span>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>
                {feedingData.food_type || 'Rice & Chicken / Dog Kibble'}
              </div>
            </div>
          </div>

          {feedingData.feeding_notes && (
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
              <strong>Volunteer Feeder Notes:</strong> {feedingData.feeding_notes}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <Link href="/feeding" className="btn-primary" style={{ textDecoration: 'none', fontSize: '13px' }}>
              <Utensils size={16} />
              <span>Go to Feeding Rosters & Logs</span>
            </Link>
          </div>
        </div>
      )}

      {/* Tab Content 3: About & Behavior */}
      {activeTab === 'ABOUT' && (
        <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>
            About {animal.name}
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {animal.description || 'No detailed bio provided yet.'}
          </p>

          {profileData.temperament && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
              <strong style={{ fontSize: '13px' }}>Temperament & Behavior:</strong>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {profileData.temperament}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Vaccine Modal */}
      {isAddVaccineOpen && (
        <div className="modal-overlay" onClick={() => setIsAddVaccineOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '14px' }}>
              Add Vaccination Record
            </h3>

            {recordError && (
              <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '8px 12px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '12px' }}>
                {recordError}
              </div>
            )}

            <form onSubmit={handleAddVaccination}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Vaccine Name *
                </label>
                <input
                  type="text"
                  className="input"
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  placeholder="e.g. Anti-Rabies (ARV), DHPPi"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                    Administered Date *
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={vaccineDate}
                    onChange={(e) => setVaccineDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={vaccineNextDue}
                    onChange={(e) => setVaccineNextDue(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                  Clinic / Veterinary Doctor
                </label>
                <input
                  type="text"
                  className="input"
                  value={vaccineClinic}
                  onChange={(e) => setVaccineClinic(e.target.value)}
                  placeholder="e.g. CUPA Animal Care Clinic"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsAddVaccineOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingRecord}>
                  {isSavingRecord ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isStatusModalOpen && (
        <div className="modal-overlay" onClick={() => setIsStatusModalOpen(false)}>
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', padding: '24px', borderRadius: '16px' }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '14px' }}>
              Update Animal Status
            </h3>

            <form onSubmit={handleStatusUpdate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                  Select Current Status
                </label>
                <select
                  className="input"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="active">Street / Community Animal</option>
                  <option value="rescued">Rescued / In Shelter</option>
                  <option value="fostered">Under Foster Care</option>
                  <option value="adopted">Adopted (Permanent Home)</option>
                  <option value="deceased">Deceased / Cross the Bridge</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsStatusModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
