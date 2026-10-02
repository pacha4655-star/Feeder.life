'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  MapPin,
  ShieldCheck,
  Loader2,
  Calendar,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface CreateReportModalProps {
  user: UserSession | null;
  isOpen: boolean;
  defaultType?: 'LOST' | 'FOUND';
  onClose: () => void;
  onReportCreated: () => void;
}

export default function CreateReportModal({
  user,
  isOpen,
  defaultType = 'LOST',
  onClose,
  onReportCreated,
}: CreateReportModalProps) {
  useBodyScrollLock(isOpen);

  const [reportType, setReportType] = useState<'LOST' | 'FOUND'>(defaultType);
  const [animalName, setAnimalName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('Indie / Mix');
  const [coatColor, setCoatColor] = useState('Brown / Tan');
  const [distinctiveMarkings, setDistinctiveMarkings] = useState('');
  const [approxAge, setApproxAge] = useState('Young Adult (1-3 yrs)');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'UNKNOWN'>('UNKNOWN');
  const [dateLostFound, setDateLostFound] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [approxLocationName, setApproxLocationName] = useState('');
  const [approxLat, setApproxLat] = useState<number | null>(null);
  const [approxLon, setApproxLon] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [contactPreference, setContactPreference] = useState<'IN_APP' | 'PHONE_ON_REQUEST' | 'COMMUNITY'>('IN_APP');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Sign In to Report</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Please sign in to publish a Lost or Found animal report and receive matching alerts from the community.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sign In</a>
          </div>
        </div>
      </div>
    );
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError('');

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload?category=lost-found', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success && data.url) {
          newUrls.push(data.url);
        }
      }
      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 5));
    } catch {
      setError('Failed to upload image.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Acquiring GPS position...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setApproxLat(pos.coords.latitude);
        setApproxLon(pos.coords.longitude);
        setLocationStatus('GPS captured! Coordinates will be generalized for privacy.');
        if (!approxLocationName) {
          setApproxLocationName(`Area ~ ${pos.coords.latitude.toFixed(3)}°N, ${pos.coords.longitude.toFixed(3)}°E`);
        }
      },
      () => {
        setIsLocating(false);
        setLocationStatus('Could not get GPS. Please type the area / landmark manually.');
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!coatColor.trim() || !approxLocationName.trim() || !description.trim()) {
      setError('Please fill in coat color, location area, and detailed description.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/lost-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          animalName: animalName.trim(),
          species,
          breed: breed.trim(),
          coatColor: coatColor.trim(),
          distinctiveMarkings: distinctiveMarkings.trim(),
          approxAge,
          gender,
          dateLostFound,
          approxLocationName: approxLocationName.trim(),
          approxLat,
          approxLon,
          mediaUrls,
          description: description.trim(),
          contactPreference,
          contactPhone: contactPhone.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        onReportCreated();
        onClose();
      } else {
        setError(data.error || 'Failed to submit report');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{reportType === 'LOST' ? '🔍 Report Lost Animal' : '🐾 Report Found Animal'}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            {/* Type Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setReportType('LOST')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: reportType === 'LOST' ? '2px solid #EF4444' : '1px solid var(--border-subtle)',
                  background: reportType === 'LOST' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
                  color: reportType === 'LOST' ? '#DC2626' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>🔴 I Lost My Animal</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('FOUND')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: reportType === 'FOUND' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                  background: reportType === 'FOUND' ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-secondary)',
                  color: reportType === 'FOUND' ? '#059669' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>🟢 I Found / Sighted Animal</span>
              </button>
            </div>

            {/* Basic Info */}
            <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {reportType === 'LOST' ? 'Pet / Animal Name' : 'Identified Name (Optional)'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={reportType === 'LOST' ? 'e.g. Bruno, Bella' : 'e.g. Friendly Street Pup'}
                  value={animalName}
                  onChange={(e) => setAnimalName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Species *</label>
                <select className="form-select" value={species} onChange={(e) => setSpecies(e.target.value)}>
                  <option value="Dog">🐕 Dog</option>
                  <option value="Cat">🐈 Cat</option>
                  <option value="Cattle">🐄 Cattle / Cow</option>
                  <option value="Bird">🐦 Bird / Avian</option>
                  <option value="Other">🐾 Other</option>
                </select>
              </div>
            </div>

            <div className="form-row-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Breed / Lookalike</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Indian Pariah, Golden Retriever, Persian"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Primary Coat Color *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Golden Cream, Black with White chest, Brindle"
                  value={coatColor}
                  onChange={(e) => setCoatColor(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Gender</label>
                <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value as any)}>
                  <option value="UNKNOWN">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Approx Age</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 6 months, 2 years"
                  value={approxAge}
                  onChange={(e) => setApproxAge(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {reportType === 'LOST' ? 'Date Lost' : 'Date Sighted'} *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dateLostFound}
                  onChange={(e) => setDateLostFound(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Distinctive Features */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Distinctive Markings & Features (Critical for Candidate Matching)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Red nylon collar with bell, floppy left ear, white front paws, docked tail"
                value={distinctiveMarkings}
                onChange={(e) => setDistinctiveMarkings(e.target.value)}
              />
            </div>

            {/* Location */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                  {reportType === 'LOST' ? 'Last Seen Location / Landmark *' : 'Found / Sighted Location Area *'}
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-primary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MapPin size={14} />
                  <span>{isLocating ? 'Detecting...' : 'Detect GPS'}</span>
                </button>
              </div>

              {locationStatus && (
                <div style={{ fontSize: '11.5px', color: '#059669', marginBottom: '6px' }}>
                  {locationStatus}
                </div>
              )}

              <input
                type="text"
                className="form-input"
                placeholder="e.g. 5th Main, Near BDA Complex, Koramangala 4th Block"
                value={approxLocationName}
                onChange={(e) => setApproxLocationName(e.target.value)}
                required
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  background: 'rgba(5, 150, 105, 0.06)',
                  borderRadius: '6px',
                  marginTop: '6px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                <ShieldCheck size={14} color="#059669" />
                <span>Exact coordinates are protected. Only generalized neighborhood radius is shown.</span>
              </div>
            </div>

            {/* Media Upload */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Animal Photos (Clear face & coat)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  {isUploading ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
                  <span>{isUploading ? 'Uploading...' : 'Upload Photos'}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  multiple
                  onChange={handleMediaUpload}
                />

                {mediaUrls.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={url} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Description & Temperament *</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describe circumstances, collar details, behavior (scared, friendly, responds to treats), and any medical conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Contact Preference */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Contact Preference for Finders / Guardians</label>
              <select
                className="form-select"
                value={contactPreference}
                onChange={(e) => setContactPreference(e.target.value as any)}
              >
                <option value="IN_APP">In-App Chat & Comments Only (Recommended)</option>
                <option value="PHONE_ON_REQUEST">Direct Phone Call / WhatsApp</option>
                <option value="COMMUNITY">Route Through Local Community Rescuers</option>
              </select>
            </div>

            {contactPreference === 'PHONE_ON_REQUEST' && (
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Phone / WhatsApp Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isUploading}
              style={{
                background: reportType === 'LOST' ? '#DC2626' : 'var(--brand-primary)',
                borderColor: reportType === 'LOST' ? '#DC2626' : 'var(--brand-primary)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Publish {reportType === 'LOST' ? 'Lost Animal' : 'Found Animal'} Report</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
