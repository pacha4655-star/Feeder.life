'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  Loader2,
  ShieldCheck,
  Heart,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface RegisterAnimalModalProps {
  user: UserSession | null;
  isOpen: boolean;
  onClose: () => void;
  onAnimalCreated: () => void;
}

export default function RegisterAnimalModal({
  user,
  isOpen,
  onClose,
  onAnimalCreated,
}: RegisterAnimalModalProps) {
  useBodyScrollLock(isOpen);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('Indian Pariah / Indie');
  const [sex, setSex] = useState<'MALE' | 'FEMALE' | 'UNKNOWN'>('UNKNOWN');
  const [approxAge, setApproxAge] = useState('2-3 years');
  const [status, setStatus] = useState<'active' | 'rescued' | 'fostered' | 'adopted'>('active');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [areaName, setAreaName] = useState('');

  // Photos
  const [avatarUrl, setAvatarUrl] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Health & Passport
  const [isSterilized, setIsSterilized] = useState(false);
  const [sterilizationDate, setSterilizationDate] = useState('');
  const [hasEarNotch, setHasEarNotch] = useState(false);
  const [isAdoptable, setIsAdoptable] = useState(false);
  const [temperament, setTemperament] = useState('Friendly, gentle with humans, pack friendly');
  const [feedingSpot, setFeedingSpot] = useState('');
  const [feedingNotes, setFeedingNotes] = useState('');

  // Vaccinations list
  const [vaccinations, setVaccinations] = useState<
    Array<{ name: string; date: string; nextDue: string; clinic: string }>
  >([
    { name: 'Anti-Rabies (ARV)', date: '', nextDue: '', clinic: '' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    setIsUploading(true);

    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload?category=animals', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          uploaded.push(data.url);
        }
      }
      if (uploaded.length > 0) {
        if (!avatarUrl) setAvatarUrl(uploaded[0]);
        setMediaUrls((prev) => [...prev, ...uploaded].slice(0, 6));
      }
    } catch {
      setError('Photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const addVaccinationRow = () => {
    setVaccinations((prev) => [
      ...prev,
      { name: '7-in-1 (DHPPi)', date: '', nextDue: '', clinic: '' },
    ]);
  };

  const removeVaccinationRow = (idx: number) => {
    setVaccinations((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateVaccinationRow = (idx: number, field: string, value: string) => {
    setVaccinations((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (!name.trim()) {
      setError('Please provide an animal name or identifier (e.g. "Bruno" or "Brownie - Gate 2")');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        species: species.toLowerCase(),
        breed: breed.trim(),
        sex,
        description: description.trim(),
        avatarUrl: avatarUrl || mediaUrls[0] || null,
        city: city.trim() || user.city || 'Local Area',
        region: areaName.trim(),
        status,
        media: mediaUrls.map((url) => ({ url, type: 'image' })),
        profileData: {
          approx_age: approxAge,
          area_name: areaName.trim(),
          temperament,
          registered_by_name: user.fullName,
        },
        medicalData: {
          is_sterilized: isSterilized,
          sterilization_date: sterilizationDate,
          has_ear_notch: hasEarNotch,
          vaccinations: vaccinations.filter((v) => v.name.trim()),
          medical_notes: '',
        },
        feedingData: {
          feeding_spot: feedingSpot.trim(),
          feeding_notes: feedingNotes.trim(),
        },
        adoptionData: {
          is_adoptable: isAdoptable,
          status: isAdoptable ? 'AVAILABLE' : 'NOT_AVAILABLE',
          temperament,
        },
      };

      const res = await fetch('/api/animals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onAnimalCreated();
        onClose();
      } else {
        setError(data.error || 'Failed to create animal passport');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          width: '94%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '18px',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Register Digital Animal Passport
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Maintain medical records, vaccination schedules, and feeding profiles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {error && (
            <div
              style={{
                background: '#FEE2E2',
                color: '#B91C1C',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '16px',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* 1. Basic Info */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Animal Name / Identifier *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Bruno (or Brown Indie near Gate 2)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Species *
              </label>
              <select className="input" value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Bird">Bird</option>
                <option value="Cattle">Cattle / Cow</option>
                <option value="Other">Other Community Animal</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Breed / Type
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Indie, Persian Mix, Labrador"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Sex
              </label>
              <select className="input" value={sex} onChange={(e) => setSex(e.target.value as any)}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="UNKNOWN">Unknown / Not checked</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Approx. Age
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 6 months, 2-3 yrs"
                value={approxAge}
                onChange={(e) => setApproxAge(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Status
              </label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="active">Stray / Community Animal</option>
                <option value="rescued">Rescued / In Shelter</option>
                <option value="fostered">Under Foster Care</option>
                <option value="adopted">Adopted</option>
              </select>
            </div>
          </div>

          {/* Photos Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Animal Photos
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {mediaUrls.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    width: '72px',
                    height: '72px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: avatarUrl === url ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  }}
                >
                  <img src={url} alt="Animal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                      width: '18px',
                      height: '18px',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {mediaUrls.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '10px',
                    border: '1.5px dashed var(--brand-primary)',
                    background: 'rgba(16, 185, 129, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--brand-primary)',
                  }}
                >
                  {isUploading ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
                  <span style={{ fontSize: '10px', marginTop: '4px', fontWeight: 600 }}>
                    {isUploading ? 'Uploading' : 'Add Photo'}
                  </span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleMediaUpload}
            />
          </div>

          {/* Location & Neighborhood */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Neighborhood / Territory
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Indiranagar 12th Main, Sector 4"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Exact GPS is hidden for safety.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                City
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Bengaluru, Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Sterilization & ABC Section */}
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              marginBottom: '18px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sterilization / Animal Birth Control (ABC)
                </span>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                  Has this animal been neutered/spayed?
                </p>
              </div>
              <input
                type="checkbox"
                checked={isSterilized}
                onChange={(e) => setIsSterilized(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
            </div>

            {isSterilized && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Sterilization Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={sterilizationDate}
                    onChange={(e) => setSterilizationDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '18px' }}>
                  <input
                    type="checkbox"
                    id="earNotch"
                    checked={hasEarNotch}
                    onChange={(e) => setHasEarNotch(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--brand-primary)' }}
                  />
                  <label htmlFor="earNotch" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    Ear-Notch / V-Cut present
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Vaccination Schedule Table */}
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              marginBottom: '18px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Vaccination History
              </span>
              <button
                type="button"
                onClick={addVaccinationRow}
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
                <Plus size={14} /> Add Vaccine
              </button>
            </div>

            {vaccinations.map((vac, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 1fr auto',
                  gap: '8px',
                  marginBottom: '8px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  className="input"
                  placeholder="Vaccine (e.g. Rabies)"
                  value={vac.name}
                  onChange={(e) => updateVaccinationRow(idx, 'name', e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
                <input
                  type="date"
                  className="input"
                  title="Administered Date"
                  value={vac.date}
                  onChange={(e) => updateVaccinationRow(idx, 'date', e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 8px' }}
                />
                <input
                  type="date"
                  className="input"
                  title="Next Due Date"
                  value={vac.nextDue}
                  onChange={(e) => updateVaccinationRow(idx, 'nextDue', e.target.value)}
                  style={{ fontSize: '12px', padding: '6px 8px' }}
                />
                <button
                  type="button"
                  onClick={() => removeVaccinationRow(idx)}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Adoptable & Foster Check */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(236, 72, 153, 0.08)',
              marginBottom: '18px',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#DB2777', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Heart size={16} /> List for Adoption / Foster
              </span>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                Feature this animal in the Adoption & Foster Portal for community applications.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isAdoptable}
              onChange={(e) => setIsAdoptable(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#DB2777', cursor: 'pointer' }}
            />
          </div>

          {/* Description & Notes */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Behavior & Identifying Marks
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. White patch on left ear, responds to whistle, friendly with children..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Create Passport</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
