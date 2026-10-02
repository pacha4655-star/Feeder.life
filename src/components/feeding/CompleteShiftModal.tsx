'use client';

import React, { useState, useRef } from 'react';
import { X, Camera, CheckCircle2, Loader2, Utensils } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface CompleteShiftModalProps {
  user: UserSession | null;
  shift: any;
  spot: any;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export default function CompleteShiftModal({
  user,
  shift,
  spot,
  isOpen,
  onClose,
  onCompleted,
}: CompleteShiftModalProps) {
  useBodyScrollLock(isOpen);

  const [animalsFed, setAnimalsFed] = useState(spot?.animal_count || 4);
  const [foodType, setFoodType] = useState('Chicken & Rice / Kibble');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload?category=feeding', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setPhotoUrl(data.url);
      } else {
        setError(data.error || 'Failed to upload photo');
      }
    } catch {
      setError('Photo upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feeding/rosters/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: shift?.id,
          spotId: spot?.id,
          date: shift?.date || new Date().toISOString().split('T')[0],
          timeSlot: shift?.time_slot || 'MORNING',
          animalsFedCount: animalsFed,
          foodType,
          photoUrl,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onCompleted();
        onClose();
      } else {
        setError(data.error || 'Failed to mark shift completed');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '460px', padding: '24px', borderRadius: '16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Utensils size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Mark Feeding Shift Completed</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{spot?.name || 'Community Spot'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Animals Fed Count *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="input"
                value={animalsFed}
                onChange={(e) => setAnimalsFed(parseInt(e.target.value, 10) || 1)}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
                Food Provided *
              </label>
              <input
                type="text"
                className="input"
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Photo Proof */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
              Feeding Proof Photo (Optional)
            </label>
            {photoUrl ? (
              <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                <img src={photoUrl} alt="Feeding proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1.5px dashed var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                {isUploading ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
                <span>{isUploading ? 'Uploading proof...' : 'Upload Feeding Photo'}</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' }}>
              Notes / Animal Health Observations
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. All 4 puppies active, clean water bowl filled"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Mark Completed & Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
