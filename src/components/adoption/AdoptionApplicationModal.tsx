'use client';

import React, { useState } from 'react';
import {
  X,
  Heart,
  Home,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  User,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface AdoptionApplicationModalProps {
  user: UserSession | null;
  animal: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function AdoptionApplicationModal({
  user,
  animal,
  isOpen,
  onClose,
  onSubmitted,
}: AdoptionApplicationModalProps) {
  useBodyScrollLock(isOpen);

  const [step, setStep] = useState(1);
  const [applicationType, setApplicationType] = useState<'ADOPTION' | 'FOSTER'>('ADOPTION');

  // Step 1: Contact
  const [applicantName, setApplicantName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState(user?.city || '');
  const [address, setAddress] = useState('');

  // Step 2: Living Situation
  const [housingType, setHousingType] = useState('Apartment');
  const [landlordPetPolicy, setLandlordPetPolicy] = useState('Owned Home (No Landlord Restrictions)');
  const [householdAgreement, setHouseholdAgreement] = useState(true);
  const [existingPets, setExistingPets] = useState('None');
  const [dailyAloneHours, setDailyAloneHours] = useState('2-4 hours');

  // Step 3: Experience & Readiness
  const [petExperience, setPetExperience] = useState('');
  const [reason, setReason] = useState('');
  const [homeCheckReady, setHomeCheckReady] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !animal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (!applicantName.trim() || !phone.trim()) {
      setError('Please fill out your name and contact phone number.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/adoption/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animalId: animal.id,
          applicationType,
          applicantName,
          phone,
          email,
          city,
          address,
          housingType,
          landlordPetPolicy,
          householdAgreement,
          existingPets,
          dailyAloneHours,
          petExperience,
          reason,
          homeCheckReady,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSubmitted();
        onClose();
      } else {
        setError(data.error || 'Failed to submit application');
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
          maxWidth: '560px',
          width: '94%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '18px',
        }}
      >
        {/* Header */}
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
                background: '#FDF2F8',
                color: '#DB2777',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={20} fill="#DB2777" />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {applicationType === 'ADOPTION' ? 'Adoption Application' : 'Foster Care Application'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                For {animal.name || animal.species} ({animal.breed || 'Indie / Mix'})
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {error && (
            <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          {/* Application Type Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={() => setApplicationType('ADOPTION')}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: applicationType === 'ADOPTION' ? '2px solid #DB2777' : '1px solid var(--border-subtle)',
                background: applicationType === 'ADOPTION' ? '#FDF2F8' : 'var(--bg-card)',
                color: applicationType === 'ADOPTION' ? '#DB2777' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ❤️ Permanent Adoption
            </button>
            <button
              type="button"
              onClick={() => setApplicationType('FOSTER')}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: applicationType === 'FOSTER' ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                background: applicationType === 'FOSTER' ? '#EFF6FF' : 'var(--bg-card)',
                color: applicationType === 'FOSTER' ? '#2563EB' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              🏡 Temporary Foster
            </button>
          </div>

          {/* Applicant Details */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Full Name *
            </label>
            <input
              type="text"
              className="input"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Contact Phone / WhatsApp *
              </label>
              <input
                type="tel"
                className="input"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                City
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Bengaluru"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Housing Type
              </label>
              <select className="input" value={housingType} onChange={(e) => setHousingType(e.target.value)}>
                <option value="Apartment">Apartment / Flat</option>
                <option value="Independent House / Villa">Independent House / Villa</option>
                <option value="Farmhouse / Gated Community">Farmhouse / Gated Community</option>
                <option value="Rented House">Rented House (Pet Friendly)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Existing Pets at Home
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 1 Indie dog (vaccinated), 1 cat"
              value={existingPets}
              onChange={(e) => setExistingPets(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Previous Pet Care Experience & Routine
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="Tell us about your previous pets, daily exercise routine, vet clinic nearby..."
              value={petExperience}
              onChange={(e) => setPetExperience(e.target.value)}
            />
          </div>

          {/* Declarations */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '12px 14px',
              borderRadius: '10px',
              marginBottom: '18px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                id="householdAgreement"
                checked={householdAgreement}
                onChange={(e) => setHouseholdAgreement(e.target.checked)}
                style={{ marginTop: '2px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
              <label htmlFor="householdAgreement" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                All family members / roommates agree to welcome this animal into our home.
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <input
                type="checkbox"
                id="homeCheckReady"
                checked={homeCheckReady}
                onChange={(e) => setHomeCheckReady(e.target.checked)}
                style={{ marginTop: '2px', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
              <label htmlFor="homeCheckReady" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                I agree to a brief virtual or in-person home safety check by the rescue team.
              </label>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ background: applicationType === 'ADOPTION' ? '#DB2777' : 'var(--brand-primary)', borderColor: applicationType === 'ADOPTION' ? '#DB2777' : 'var(--brand-primary)' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
